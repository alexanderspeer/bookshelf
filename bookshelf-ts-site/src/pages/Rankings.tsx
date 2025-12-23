import React, { useState, useEffect, useRef } from 'react';
import { Book, RankingWizard } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';

export const Rankings: React.FC = () => {
  const [rankedBooks, setRankedBooks] = useState<Book[]>([]);
  const [visibleRankedBooks, setVisibleRankedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const cascadeTimers = useRef<NodeJS.Timeout[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState<RankingWizard | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [comparisons, setComparisons] = useState<any[]>([]);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    setLoading(true);
    setVisibleRankedBooks([]);
    
    // Clear existing timers
    cascadeTimers.current.forEach(timer => clearTimeout(timer));
    cascadeTimers.current = [];
    
    try {
      const books = await apiService.getRankings();
      setRankedBooks(books);
      setLoading(false);
      
      // Cascade in books one at a time
      books.forEach((book: Book, index: number) => {
        const timer = setTimeout(() => {
          setVisibleRankedBooks(prev => [...prev, book]);
        }, index * 100); // 100ms delay for more noticeable effect
        cascadeTimers.current.push(timer);
      });
    } catch (error) {
      toast.error('Failed to load rankings');
      console.error(error);
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cascadeTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const startWizard = async (bookId: number, stars: number) => {
    try {
      const wizard = await apiService.startRankingWizard(bookId, stars);
      setWizardData(wizard);
      setWizardStep(0);
      setComparisons([]);
      setShowWizard(true);
    } catch (error) {
      toast.error('Failed to start ranking wizard');
      console.error(error);
    }
  };

  const handleComparison = (winnerId: number) => {
    if (!wizardData) return;
    
    const currentComparison = wizardData.comparisons[wizardStep];
    const newBook = winnerId === wizardData.book_id;
    
    setComparisons(prev => [...prev, {
      book_a_id: wizardData.book_id,
      book_b_id: currentComparison.candidate_book_id,
      winner_id: winnerId
    }]);

    if (wizardStep < wizardData.comparisons.length - 1) {
      setWizardStep(prev => prev + 1);
    } else {
      // Calculate final position based on comparisons
      const position = calculateFinalPosition();
      finalizeRanking(position);
    }
  };

  const calculateFinalPosition = () => {
    // Simple calculation: count wins
    const wins = comparisons.filter(c => c.winner_id === wizardData?.book_id).length;
    const totalComparisons = comparisons.length;
    
    // Place proportionally based on win rate
    const winRate = wins / totalComparisons;
    const estimatedPosition = Math.round((1 - winRate) * (wizardData?.total_ranked || 1)) + 1;
    
    return Math.max(1, estimatedPosition);
  };

  const finalizeRanking = async (position: number) => {
    if (!wizardData) return;
    
    try {
      await apiService.finalizeRanking(
        wizardData.book_id,
        position,
        wizardData.initial_stars,
        comparisons
      );
      toast.success('Book ranked successfully!');
      setShowWizard(false);
      fetchRankings();
    } catch (error) {
      toast.error('Failed to finalize ranking');
      console.error(error);
    }
  };

  if (loading) return <div className="loading-state">Loading rankings...</div>;

  return (
    <div className="rankings-container">
      <h1>My Book Rankings</h1>
      <p className="subtitle">Your personal ranked list of all read books</p>

      {rankedBooks.length === 0 && !loading ? (
        <div className="empty-state">
          <p>No ranked books yet. Finish a book to start ranking!</p>
        </div>
      ) : (
        <div className="ranked-list">
          {visibleRankedBooks.map((book, index) => (
            <div key={book.id} className="ranked-item">
              <div className="rank-number">#{book.rank_position || index + 1}</div>
              <div className="book-info">
                <h3>{book.title}</h3>
                <p>{book.author}</p>
                {book.initial_stars && (
                  <div className="stars">
                    {'★'.repeat(Math.round(book.initial_stars))}
                    {'☆'.repeat(5 - Math.round(book.initial_stars))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showWizard && wizardData && (
        <div className="wizard-overlay">
          <div className="wizard-content">
            <h2>Ranking Wizard</h2>
            <p>Question {wizardStep + 1} of {wizardData.comparisons.length}</p>
            
            <div className="comparison-question">
              <h3>Which book was better?</h3>
              
              <div className="comparison-options">
                <button
                  className="comparison-book"
                  onClick={() => handleComparison(wizardData.book_id)}
                >
                  <h4>New Book</h4>
                  <p>(The one you just finished)</p>
                </button>

                <div className="vs-divider">VS</div>

                <button
                  className="comparison-book"
                  onClick={() => handleComparison(wizardData.comparisons[wizardStep].candidate_book_id)}
                >
                  <h4>{wizardData.comparisons[wizardStep].candidate_title}</h4>
                  <p>{wizardData.comparisons[wizardStep].candidate_author}</p>
                  <span className="current-rank">
                    Currently rank #{wizardData.comparisons[wizardStep].candidate_position}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

