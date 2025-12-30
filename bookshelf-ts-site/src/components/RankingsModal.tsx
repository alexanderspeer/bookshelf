import React, { useState, useEffect, useMemo } from 'react';
import { Book } from '../types/types';
import apiService from '../services/api';
import '../styles/rankings-modal.css';

interface RankingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookClick?: (book: Book) => void;
}

interface AuthorRanking {
  author: string;
  bookCount: number;
  averageRank: number;
  averageStars: number;
  score: number;
  books: Book[];
}

interface YearRanking {
  year: string;
  bookCount: number;
  averageRank: number;
  averageStars: number;
  score: number;
  books: Book[];
}

export const RankingsModal: React.FC<RankingsModalProps> = ({ isOpen, onClose, onBookClick }) => {
  const [activeTab, setActiveTab] = useState<'books' | 'authors' | 'years'>('books');
  const [rankedBooks, setRankedBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ranked, all] = await Promise.all([
        apiService.getRankings(),
        apiService.listBooks({ limit: 10000 }) // Get all books
      ]);
      setRankedBooks(ranked);
      setAllBooks(all.books || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate author rankings
  const authorRankings = useMemo(() => {
    const authorMap = new Map<string, Book[]>();
    
    // Group books by author
    rankedBooks.forEach(book => {
      if (book.author) {
        const author = book.author.trim();
        if (!authorMap.has(author)) {
          authorMap.set(author, []);
        }
        authorMap.get(author)!.push(book);
      }
    });

    const rankings: AuthorRanking[] = [];
    
    authorMap.forEach((books, author) => {
      // Only count books that have been rated (stars > 0) for the main metrics
      const ratedBooks = books.filter(b => b.initial_stars && b.initial_stars > 0);
      const bookCount = ratedBooks.length; // Only count rated books
      const totalBooks = books.length; // Keep total for display if needed
      
      const ranks = books.map(b => b.rank_position || 999).filter(r => r !== 999);
      const stars = books.map(b => b.initial_stars || 0).filter(s => s > 0);
      
      // Skip authors with no rated books
      if (bookCount === 0) {
        return;
      }
      
      const averageRank = ranks.length > 0 
        ? ranks.reduce((sum, r) => sum + r, 0) / ranks.length 
        : 999;
      const averageStars = stars.length > 0
        ? stars.reduce((sum, s) => sum + s, 0) / stars.length
        : 0;

      // Scoring algorithm: 
      // - Higher rated book count = better (weighted by 0.3)
      // - Lower average rank = better (inverted, weighted by 0.5)
      // - Higher average stars = better (weighted by 0.2)
      // Normalize: book count / max count, (max rank - avg rank) / max rank, stars / 5
      const maxBookCount = Math.max(
        ...Array.from(authorMap.values()).map(bs => bs.filter(b => b.initial_stars && b.initial_stars > 0).length),
        1
      );
      const maxRank = Math.max(...ranks, 1);
      
      const bookCountScore = (bookCount / maxBookCount) * 0.3;
      const rankScore = ranks.length > 0 ? ((maxRank - averageRank + 1) / maxRank) * 0.5 : 0;
      const starsScore = (averageStars / 5) * 0.2;
      
      const score = bookCountScore + rankScore + starsScore;

      rankings.push({
        author,
        bookCount,
        averageRank,
        averageStars,
        score,
        books
      });
    });

    // Sort by score (descending), then by book count, then by average rank
    return rankings.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.001) {
        return b.score - a.score;
      }
      if (a.bookCount !== b.bookCount) {
        return b.bookCount - a.bookCount;
      }
      return a.averageRank - b.averageRank;
    });
  }, [rankedBooks]);

  // Calculate year rankings
  const yearRankings = useMemo(() => {
    const yearMap = new Map<string, Book[]>();
    
    // Group books by publication year
    rankedBooks.forEach(book => {
      if (book.pub_date) {
        // Extract year from pub_date (could be "YYYY" or "YYYY-MM-DD")
        const year = book.pub_date.split('-')[0].trim();
        if (year && year.length === 4 && !isNaN(Number(year))) {
          if (!yearMap.has(year)) {
            yearMap.set(year, []);
          }
          yearMap.get(year)!.push(book);
        }
      }
    });

    const rankings: YearRanking[] = [];
    
    yearMap.forEach((books, year) => {
      // Only count books that have been rated (stars > 0) for the main metrics
      const ratedBooks = books.filter(b => b.initial_stars && b.initial_stars > 0);
      const bookCount = ratedBooks.length; // Only count rated books
      
      const ranks = books.map(b => b.rank_position || 999).filter(r => r !== 999);
      const stars = books.map(b => b.initial_stars || 0).filter(s => s > 0);
      
      // Skip years with no rated books
      if (bookCount === 0) {
        return;
      }
      
      const averageRank = ranks.length > 0 
        ? ranks.reduce((sum, r) => sum + r, 0) / ranks.length 
        : 999;
      const averageStars = stars.length > 0
        ? stars.reduce((sum, s) => sum + s, 0) / stars.length
        : 0;

      // Same scoring algorithm as authors
      const maxBookCount = Math.max(
        ...Array.from(yearMap.values()).map(bs => bs.filter(b => b.initial_stars && b.initial_stars > 0).length),
        1
      );
      const maxRank = Math.max(...ranks, 1);
      
      const bookCountScore = (bookCount / maxBookCount) * 0.3;
      const rankScore = ranks.length > 0 ? ((maxRank - averageRank + 1) / maxRank) * 0.5 : 0;
      const starsScore = (averageStars / 5) * 0.2;
      
      const score = bookCountScore + rankScore + starsScore;

      rankings.push({
        year,
        bookCount,
        averageRank,
        averageStars,
        score,
        books
      });
    });

    // Sort by score (descending), then by book count, then by average rank
    return rankings.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.001) {
        return b.score - a.score;
      }
      if (a.bookCount !== b.bookCount) {
        return b.bookCount - a.bookCount;
      }
      return a.averageRank - b.averageRank;
    });
  }, [rankedBooks]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content rpgui-container framed-golden" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '90%', minWidth: '600px', maxHeight: '85vh' }}
      >
        <div className="modal-header">
          <h2>Rankings</h2>
          <button 
            className="modal-close" 
            onClick={onClose}
            style={{ 
              cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer",
              position: 'absolute',
              zIndex: 1000,
              right: '1rem',
              top: '1rem'
            }}
          >
            ×
          </button>
        </div>

        <div className="rankings-tabs">
          <button
            className={activeTab === 'books' ? 'active' : ''}
            onClick={() => setActiveTab('books')}
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            Books
          </button>
          <button
            className={activeTab === 'authors' ? 'active' : ''}
            onClick={() => setActiveTab('authors')}
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            Authors
          </button>
          <button
            className={activeTab === 'years' ? 'active' : ''}
            onClick={() => setActiveTab('years')}
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            Years
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', overflowX: 'hidden', padding: '1rem' }}>
          {loading ? (
            <div className="loading-state">Loading rankings...</div>
          ) : (
            <>
              {activeTab === 'books' && (
                <div className="rankings-list">
                  {rankedBooks.length === 0 ? (
                    <p>No ranked books yet.</p>
                  ) : (
                    rankedBooks.map((book, index) => (
                      <div 
                        key={book.id} 
                        className="ranking-item"
                        style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                      >
                        <span className="rank-number">Rank: {book.rank_position || index + 1}</span>
                        <h4 
                          onClick={() => {
                            if (onBookClick) {
                              onBookClick(book);
                              onClose();
                            }
                          }}
                          style={{ 
                            cursor: onBookClick ? "url('/rpgui/img/cursor/point.png') 10 0, pointer" : "url('/rpgui/img/cursor/point.png') 10 0, pointer",
                            textDecoration: onBookClick ? 'underline' : 'none'
                          }}
                        >
                          {book.title}
                        </h4>
                        <p>{book.author}</p>
                        {book.initial_stars && (
                          <div className="ranking-metrics">
                            <span>Stars: {book.initial_stars.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'authors' && (
                <div className="rankings-list">
                  {authorRankings.length === 0 ? (
                    <p>No author rankings available yet.</p>
                  ) : (
                    authorRankings.map((authorRank, index) => (
                      <div 
                        key={authorRank.author} 
                        className="ranking-item"
                        style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                      >
                        <span className="rank-number">Rank: {index + 1}</span>
                        <h4>{authorRank.author}</h4>
                        <div className="ranking-metrics">
                          <span>{authorRank.bookCount} book{authorRank.bookCount !== 1 ? 's' : ''}</span>
                          {authorRank.averageRank < 999 && (
                            <span>Avg Rank: {authorRank.averageRank.toFixed(1)}</span>
                          )}
                          {authorRank.averageStars > 0 && (
                            <span>Avg Stars: {authorRank.averageStars.toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'years' && (
                <div className="rankings-list">
                  {yearRankings.length === 0 ? (
                    <p>No year rankings available yet.</p>
                  ) : (
                    yearRankings.map((yearRank, index) => (
                      <div 
                        key={yearRank.year} 
                        className="ranking-item"
                        style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                      >
                        <span className="rank-number">Rank: {index + 1}</span>
                        <h4>{yearRank.year}</h4>
                        <div className="ranking-metrics">
                          <span>{yearRank.bookCount} book{yearRank.bookCount !== 1 ? 's' : ''}</span>
                          {yearRank.averageRank < 999 && (
                            <span>Avg Rank: {yearRank.averageRank.toFixed(1)}</span>
                          )}
                          {yearRank.averageStars > 0 && (
                            <span>Avg Stars: {yearRank.averageStars.toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

