import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Book } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { AddBookModal } from '../components/AddBookModal';

export const Library: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [visibleBooks, setVisibleBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 });
  
  // Debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const cascadeTimers = useRef<NodeJS.Timeout[]>([]);

  // Fetch books with debouncing for search
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setVisibleBooks([]); // Clear visible books when fetching new ones
    
    // Clear any existing cascade timers
    cascadeTimers.current.forEach(timer => clearTimeout(timer));
    cascadeTimers.current = [];
    
    try {
      const response = await apiService.listBooks({
        q: searchQuery,
        state: filterState || undefined,
        tag: filterTag || undefined,
        limit: pagination.limit,
        offset: pagination.offset
      });
      setBooks(response.books);
      setPagination(prev => ({ ...prev, total: response.total }));
      setLoading(false);
      
      // Cascade books in one at a time
      response.books.forEach((book: Book, index: number) => {
        const timer = setTimeout(() => {
          setVisibleBooks(prev => [...prev, book]);
        }, index * 100); // 100ms delay between each book for more noticeable effect
        cascadeTimers.current.push(timer);
      });
    } catch (error) {
      toast.error('Failed to load books');
      console.error(error);
      setLoading(false);
    }
  }, [searchQuery, filterState, filterTag, pagination.limit, pagination.offset]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      cascadeTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Effect for filter changes (no debounce needed)
  useEffect(() => {
    fetchBooks();
  }, [filterState, filterTag, pagination.offset]);

  // Debounced search effect - triggers 500ms after user stops typing
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, offset: 0 }));
      fetchBooks();
    }, 500);
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  const handleSearch = () => {
    // Clear debounce and search immediately
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchBooks();
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    setPagination(prev => ({
      ...prev,
      offset: direction === 'next'
        ? prev.offset + prev.limit
        : Math.max(0, prev.offset - prev.limit)
    }));
  };

  const handleBookAdded = (book: Book) => {
    setShowAddModal(false);
    fetchBooks();
  };

  return (
    <div className="library-container">
      <div className="library-header">
        <h1>My Library</h1>
        <button className="add-book-btn" onClick={() => setShowAddModal(true)}>
          + Add Book
        </button>
      </div>

      <div className="library-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>Search</button>
        </div>

        <div className="filter-controls">
          <select value={filterState} onChange={(e) => setFilterState(e.target.value)}>
            <option value="">All Shelves</option>
            <option value="want_to_read">Want to Read</option>
            <option value="currently_reading">Currently Reading</option>
            <option value="read">Read</option>
          </select>

          <input
            type="text"
            placeholder="Filter by tag..."
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <>
          <div className="books-grid">
            {visibleBooks.map(book => (
              <div key={book.id} className="book-card">
                {book.cover_image_url && (
                  <img 
                    src={book.cover_image_url} 
                    alt={book.title} 
                    className="book-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="book-card-content">
                  <h3>{book.title}</h3>
                  <p className="book-author">{book.author}</p>
                  {book.reading_state && (
                    <span className={`state-badge ${book.reading_state}`}>
                      {book.reading_state.replace('_', ' ')}
                    </span>
                  )}
                  {book.rank_position && (
                    <span className="rank-badge">Rank #{book.rank_position}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {books.length === 0 && !loading && (
            <div className="empty-state">
              <p>No books found. Add your first book to get started!</p>
            </div>
          )}

          {pagination.total > pagination.limit && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={pagination.offset === 0}
              >
                Previous
              </button>
              <span>
                {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <button
                onClick={() => handlePageChange('next')}
                disabled={pagination.offset + pagination.limit >= pagination.total}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <AddBookModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleBookAdded}
      />
    </div>
  );
};

