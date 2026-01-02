import React, { useState, useEffect } from 'react';
import { Book } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import '../styles/home.css';

export const PublicBookshelf: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    fetchPublicBooks();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedBook) {
        setSelectedBook(null);
      }
    };

    if (selectedBook) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [selectedBook]);

  const fetchPublicBooks = async () => {
    setLoading(true);
    try {
      const response = await apiService.getPublicBooks();
      setBooks(response.books || []);
    } catch (error) {
      toast.error('Failed to load public bookshelf');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
  };

  if (loading) {
    return (
      <div className="public-bookshelf-container">
        <h1>Public Bookshelf</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="public-bookshelf-container" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '40px', marginBottom: '8px' }}>Public Bookshelf</h1>
        <p style={{ color: '#666', fontSize: '18px' }}>
          Explore the owner's curated collection
        </p>
      </div>

      {books.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ fontSize: '19px', color: '#888' }}>
            No public books available yet.
          </p>
        </div>
      ) : (
        <div className="public-books-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '32px',
          marginTop: '32px'
        }}>
          {books.map(book => (
            <div
              key={book.id}
              className="public-book-card"
              onClick={() => handleBookClick(book)}
              style={{
                cursor: 'pointer',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '16px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                backgroundColor: '#fff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {book.cover_image_url && (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  style={{
                    width: '100%',
                    height: '250px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    marginBottom: '16px'
                  }}
                />
              )}
              <h3 style={{
                fontSize: '18px',
                marginBottom: '8px',
                fontWeight: 'bold',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {book.title}
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#666',
                marginBottom: '8px'
              }}>
                {book.author}
              </p>
              {book.rank_position && (
                <div style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  Rank #{book.rank_position}
                </div>
              )}
              {book.initial_stars !== null && book.initial_stars !== undefined && (
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  {book.initial_stars > 0 
                    ? '⭐'.repeat(book.initial_stars)
                    : 'Unrated'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedBook(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
            <button 
              className="modal-close" 
              onClick={() => setSelectedBook(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                fontSize: '32px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
            
            <h2 style={{ marginBottom: '8px' }}>{selectedBook.title}</h2>
            <h3 style={{ color: '#666', marginBottom: '24px', textAlign: 'center' }}>by {selectedBook.author}</h3>
            
            {selectedBook.cover_image_url && (
              <img 
                src={selectedBook.cover_image_url} 
                alt={selectedBook.title} 
                style={{
                  maxWidth: '300px',
                  width: '100%',
                  borderRadius: '8px',
                  marginBottom: '24px'
                }}
              />
            )}
            
            <div className="modal-book-details">
              {selectedBook.pub_date && (
                <p><strong>Published:</strong> {selectedBook.pub_date}</p>
              )}
              {selectedBook.num_pages && (
                <p><strong>Pages:</strong> {selectedBook.num_pages}</p>
              )}
              {selectedBook.genre && (
                <p><strong>Genre:</strong> {selectedBook.genre}</p>
              )}
              {selectedBook.initial_stars !== null && selectedBook.initial_stars !== undefined && (
                <p>
                  <strong>Rating:</strong>{' '}
                  {selectedBook.initial_stars > 0 
                    ? '⭐'.repeat(selectedBook.initial_stars)
                    : 'Unrated'}
                </p>
              )}
              {selectedBook.rank_position && (
                <p><strong>Rank:</strong> #{selectedBook.rank_position}</p>
              )}
              {selectedBook.notes && (
                <p><strong>Notes:</strong> {selectedBook.notes}</p>
              )}
              {selectedBook.series && (
                <p>
                  <strong>Series:</strong> {selectedBook.series}
                  {selectedBook.series_position && ` (Book ${selectedBook.series_position})`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

