import React, { useState, useEffect } from 'react';
import { Book } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { RankingWizard } from '../components/RankingWizard';

export const Shelves: React.FC = () => {
  const [wantToRead, setWantToRead] = useState<Book[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<Book[]>([]);
  const [read, setRead] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<'want' | 'reading' | 'read'>('reading');
  const [loading, setLoading] = useState(true);
  const [bookToRank, setBookToRank] = useState<Book | null>(null);

  useEffect(() => {
    fetchShelves();
  }, []);

  const fetchShelves = async () => {
    setLoading(true);
    try {
      const [want, reading, readBooks] = await Promise.all([
        apiService.getShelf('want_to_read'),
        apiService.getShelf('currently_reading'),
        apiService.getShelf('read')
      ]);
      
      setWantToRead(want.books);
      setCurrentlyReading(reading.books);
      setRead(readBooks.books);
    } catch (error) {
      toast.error('Failed to load shelves');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
              <img src={book.cover_image_url} alt={book.title} />
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

      {activeTab === 'want' && renderShelf(wantToRead, 'want_to_read')}
      {activeTab === 'reading' && renderShelf(currentlyReading, 'currently_reading')}
      {activeTab === 'read' && renderShelf(read, 'read')}

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

