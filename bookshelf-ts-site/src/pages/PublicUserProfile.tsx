import React, { useState, useEffect } from 'react';
import { Book } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import '../styles/home.css';

interface PublicUserProfileProps {
  username: string;
  subPath?: string; // 'shelf' or 'stats'
}

export const PublicUserProfile: React.FC<PublicUserProfileProps> = ({ username, subPath }) => {
  const [profile, setProfile] = useState<any>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shelf' | 'stats'>(subPath === 'stats' ? 'stats' : 'shelf');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchShelf();
      fetchStats();
    }
  }, [username]);

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

  const fetchProfile = async () => {
    try {
      const data = await apiService.getPublicProfile(username);
      setProfile(data);
    } catch (error: any) {
      toast.error('User not found or profile is private');
      console.error(error);
    }
  };

  const fetchShelf = async () => {
    try {
      const response = await apiService.getPublicShelf(username);
      setBooks(response.books || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiService.getPublicStats(username);
      setStats(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h1>User not found</h1>
        <p>The user you're looking for doesn't exist or their profile is private.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '40px', marginBottom: '8px' }}>@{profile.username}</h1>
        <p style={{ color: '#666', fontSize: '18px' }}>
          Public Bookshelf
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', justifyContent: 'center' }}>
        <button
          onClick={() => setActiveTab('shelf')}
          className="rpgui-button"
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            opacity: activeTab === 'shelf' ? 1 : 0.6
          }}
        >
          Shelf
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className="rpgui-button"
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            opacity: activeTab === 'stats' ? 1 : 0.6
          }}
        >
          Stats
        </button>
      </div>

      {activeTab === 'shelf' && (
        <>
          {books.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ fontSize: '19px', color: '#888' }}>
                No public books available yet.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '32px',
              marginTop: '32px'
            }}>
              {books.map(book => (
                <div
                  key={book.id}
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
        </>
      )}

      {activeTab === 'stats' && stats && (
        <div style={{ padding: '32px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '24px' }}>Reading Statistics</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4a90e2' }}>
                {stats.total_public_books}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>Total Books</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#50c878' }}>
                {stats.counts_by_state.read}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>Read</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffa500' }}>
                {stats.counts_by_state.currently_reading}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>Currently Reading</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9b59b6' }}>
                {stats.counts_by_state.want_to_read}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>Want to Read</div>
            </div>
          </div>

          {stats.average_rating && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '8px' }}>Average Rating</h3>
              <div style={{ fontSize: '24px' }}>
                {stats.average_rating.toFixed(1)} ⭐ ({stats.rated_count} rated books)
              </div>
            </div>
          )}

          {stats.top_tags && stats.top_tags.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '16px' }}>Top Tags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {stats.top_tags.map((tag: any) => (
                  <span
                    key={tag.id}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: tag.color || '#4a90e2',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    {tag.name} ({tag.book_count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {stats.yearly_totals && stats.yearly_totals.length > 0 && (
            <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '16px' }}>Books Finished by Year</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.yearly_totals.map((year: any) => (
                  <div key={year.year} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{year.year}</span>
                    <span style={{ fontWeight: 'bold' }}>{year.count} books</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

