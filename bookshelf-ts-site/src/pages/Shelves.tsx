import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { RankingWizard } from '../components/RankingWizard';

export const Shelves: React.FC = () => {
  const [wantToRead, setWantToRead] = useState<Book[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<Book[]>([]);
  const [read, setRead] = useState<Book[]>([]);
  const [visibleWantToRead, setVisibleWantToRead] = useState<Book[]>([]);
  const [visibleCurrentlyReading, setVisibleCurrentlyReading] = useState<Book[]>([]);
  const [visibleRead, setVisibleRead] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<'want' | 'reading' | 'read'>('reading');
  const [loading, setLoading] = useState(true);
  const [bookToRank, setBookToRank] = useState<Book | null>(null);
  const cascadeTimers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    fetchShelves();
  }, []);

  const fetchShelves = async () => {
    setLoading(true);
    
    // Clear visible books and timers
    setVisibleWantToRead([]);
    setVisibleCurrentlyReading([]);
    setVisibleRead([]);
    cascadeTimers.current.forEach(timer => clearTimeout(timer));
    cascadeTimers.current = [];
    
    try {
      const [want, reading, readBooks] = await Promise.all([
        apiService.getShelf('want_to_read'),
        apiService.getShelf('currently_reading'),
        apiService.getShelf('read')
      ]);
      
      setWantToRead(want.books);
      setCurrentlyReading(reading.books);
      setRead(readBooks.books);
      
      // Cascade in books based on active tab
      const activeBooks = activeTab === 'want' ? want.books : 
                         activeTab === 'reading' ? reading.books : readBooks.books;
      const setterFn = activeTab === 'want' ? setVisibleWantToRead : 
                      activeTab === 'reading' ? setVisibleCurrentlyReading : setVisibleRead;
      
      activeBooks.forEach((book: Book, index: number) => {
        const timer = setTimeout(() => {
          setterFn(prev => [...prev, book]);
        }, index * 100); // 100ms delay for more noticeable effect
        cascadeTimers.current.push(timer);
      });
    } catch (error) {
      toast.error('Failed to load shelves');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab changes - cascade in books for the new tab
  useEffect(() => {
    if (!loading && (wantToRead.length > 0 || currentlyReading.length > 0 || read.length > 0)) {
      // Clear existing timers
      cascadeTimers.current.forEach(timer => clearTimeout(timer));
      cascadeTimers.current = [];
      
      // Get books for active tab
      const activeBooks = activeTab === 'want' ? wantToRead : 
                         activeTab === 'reading' ? currentlyReading : read;
      const setterFn = activeTab === 'want' ? setVisibleWantToRead : 
                      activeTab === 'reading' ? setVisibleCurrentlyReading : setVisibleRead;
      
      // Clear visible books for active tab
      setterFn([]);
      
      // Cascade in books
      activeBooks.forEach((book: Book, index: number) => {
        const timer = setTimeout(() => {
          setterFn(prev => [...prev, book]);
        }, index * 100); // 100ms delay for more noticeable effect
        cascadeTimers.current.push(timer);
      });
    }
  }, [activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cascadeTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const moveToShelf = async (bookId: number, newState: string) => {
    try {
      await apiService.setReadingState(bookId, newState, {
        date_started: newState === 'currently_reading' ? new Date().toISOString() : undefined,
        date_finished: newState === 'read' ? new Date().toISOString() : undefined
      });
      toast.success('Book moved!');
      fetchShelves();
    } catch (error) {
      toast.error('Failed to move book');
      console.error(error);
    }
  };

  const handleFinishBook = (book: Book) => {
    // Open the ranking wizard instead of directly moving to read
    setBookToRank(book);
  };

  const handleRankingComplete = () => {
    setBookToRank(null);
    fetchShelves();
  };

  const handleRankingCancel = () => {
    setBookToRank(null);
  };

  const renderShelf = (books: Book[], state: string) => (
    <div className="shelf-content">
      <div className="shelf-stats">
        <span className="book-count">{books.length} books</span>
      </div>
      
      <div className="shelf-books">
        {books.map(book => (
          <div key={book.id} className="shelf-book-item">
            {book.cover_image_url && (
              <img 
                src={book.cover_image_url} 
                alt={book.title}
                loading="lazy"
                decoding="async"
              />
            )}
            <div className="book-details">
              <h4>{book.title}</h4>
              <p>{book.author}</p>
              
              {state === 'currently_reading' && (
                <div className="reading-actions">
                  {book.why_reading && (
                    <p className="why-reading"><em>{book.why_reading}</em></p>
                  )}
                  <button onClick={() => handleFinishBook(book)}>
                    Finish Book
                  </button>
                </div>
              )}
              
              {state === 'want_to_read' && (
                <button onClick={() => moveToShelf(book.id!, 'currently_reading')}>
                  Start Reading
                </button>
              )}
              
              {state === 'read' && book.rank_position && (
                <span className="rank-badge">Rank #{book.rank_position}</span>
              )}
            </div>
          </div>
        ))}
        
        {books.length === 0 && (
          <div className="empty-shelf">
            <p>No books on this shelf yet</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="loading-state">Loading shelves...</div>;

  return (
    <div className="shelves-container">
      <h1>My Shelves</h1>
      
      <div className="shelf-tabs">
        <button
          className={activeTab === 'want' ? 'active' : ''}
          onClick={() => setActiveTab('want')}
        >
          Want to Read ({wantToRead.length})
        </button>
        <button
          className={activeTab === 'reading' ? 'active' : ''}
          onClick={() => setActiveTab('reading')}
        >
          Currently Reading ({currentlyReading.length})
        </button>
        <button
          className={activeTab === 'read' ? 'active' : ''}
          onClick={() => setActiveTab('read')}
        >
          Read ({read.length})
        </button>
      </div>

      {activeTab === 'want' && renderShelf(visibleWantToRead, 'want_to_read')}
      {activeTab === 'reading' && renderShelf(visibleCurrentlyReading, 'currently_reading')}
      {activeTab === 'read' && renderShelf(visibleRead, 'read')}

      {bookToRank && (
        <RankingWizard
          book={bookToRank}
          onComplete={handleRankingComplete}
          onCancel={handleRankingCancel}
        />
      )}
    </div>
  );
};

