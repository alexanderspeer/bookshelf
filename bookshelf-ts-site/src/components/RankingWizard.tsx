import React, { useState } from 'react';
import { Book } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import '../styles/ranking-wizard.css';

interface RankingWizardProps {
  book: Book;
  onComplete: () => void;
  onCancel: () => void;
}

interface ComparisonQuestion {
  candidate_book_id: number;
  candidate_title: string;
  candidate_author: string;
  candidate_position: number;
}

interface ComparisonResult {
  book_a_id: number;
  book_b_id: number;
  winner_id: number;
}

type WizardStep = 'stars' | 'comparisons' | 'complete';

export const RankingWizard: React.FC<RankingWizardProps> = ({ book, onComplete, onCancel }) => {
  const [step, setStep] = useState<WizardStep>('stars');
  const [stars, setStars] = useState<number>(3);
  const [hoveredStars, setHoveredStars] = useState<number>(0);
  const [comparisons, setComparisons] = useState<ComparisonQuestion[]>([]);
  const [currentComparisonIndex, setCurrentComparisonIndex] = useState(0);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [finalPosition, setFinalPosition] = useState<number>(1);
  const [totalRanked, setTotalRanked] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const startComparisons = async () => {
    try {
      const wizardData = await apiService.startRankingWizard(book.id!, stars);
      
      // If no comparisons needed (first book or empty list)
      if (!wizardData.comparisons || wizardData.comparisons.length === 0) {
        setFinalPosition(1);
        setTotalRanked(wizardData.total_ranked || 0);
        await finalizeRanking(1, []);
        return;
      }

      setComparisons(wizardData.comparisons);
      setTotalRanked(wizardData.total_ranked || 0);
      setStep('comparisons');
    } catch (error) {
      toast.error('Failed to start ranking wizard');
      console.error(error);
    }
  };

  const handleComparison = (winnerIsNewBook: boolean) => {
    const currentQuestion = comparisons[currentComparisonIndex];
    
    const result: ComparisonResult = {
      book_a_id: book.id!,
      book_b_id: currentQuestion.candidate_book_id,
      winner_id: winnerIsNewBook ? book.id! : currentQuestion.candidate_book_id
    };

    const newResults = [...comparisonResults, result];
    setComparisonResults(newResults);

    // If this was the last comparison, finalize
    if (currentComparisonIndex >= comparisons.length - 1) {
      // Calculate final position based on comparisons
      const position = calculateFinalPosition(newResults);
      setFinalPosition(position);
      finalizeRanking(position, newResults);
    } else {
      setCurrentComparisonIndex(currentComparisonIndex + 1);
    }
  };

  const calculateFinalPosition = (results: ComparisonResult[]): number => {
    // Binary search insertion logic
    // Track which position we've narrowed down to based on comparisons
    let left = 1; // Rank positions start at 1
    let right = totalRanked + 1; // Can be inserted after all existing books
    
    results.forEach((result, index) => {
      if (index >= comparisons.length) return;
      
      const candidatePosition = comparisons[index].candidate_position;
      const newBookWon = result.winner_id === book.id;
      
      if (newBookWon) {
        // New book is better, so it should be ranked higher (lower number)
        // It goes at or before the candidate's position
        right = Math.min(right, candidatePosition);
      } else {
        // New book is worse, so it should be ranked lower (higher number)
        // It goes after the candidate's position
        left = Math.max(left, candidatePosition + 1);
      }
    });
    
    // Final position is the midpoint of the narrowed range
    // Favor the left (better rank) in case of ties
    const position = Math.max(1, Math.min(left, totalRanked + 1));
    
    return position;
  };

  const finalizeRanking = async (position: number, results: ComparisonResult[]) => {
    setSubmitting(true);
    try {
      // First, set the book to "read" state with the current date
      await apiService.setReadingState(book.id!, 'read', {
        date_finished: new Date().toISOString()
      });

      // Then finalize the ranking
      await apiService.finalizeRanking(book.id!, position, stars, results);
      
      setStep('complete');
      toast.success(`${book.title} ranked at position #${position}!`);
      
      // Close wizard after a brief delay
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      toast.error('Failed to save ranking');
      console.error(error);
      setSubmitting(false);
    }
  };

  const renderStarsStep = () => (
    <div className="wizard-step stars-step">
      <h2>How would you rate {book.title}?</h2>
      <p className="subtitle">by {book.author}</p>
      
      <div className="stars-container">
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              className={`star ${value <= (hoveredStars || stars) ? 'filled' : ''}`}
              onClick={() => setStars(value)}
              onMouseEnter={() => setHoveredStars(value)}
              onMouseLeave={() => setHoveredStars(0)}
            >
              ★
            </button>
          ))}
        </div>
        <div className="star-label">
          {stars} {stars === 1 ? 'star' : 'stars'}
        </div>
      </div>

      <p className="helper-text">
        This initial rating helps us find similar books for comparison.
        Your final rank will be determined through head-to-head comparisons.
      </p>

      <div className="wizard-actions">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={startComparisons}>
          Continue
        </button>
      </div>
    </div>
  );

  const renderComparisonsStep = () => {
    if (comparisons.length === 0) return null;
    
    const currentQuestion = comparisons[currentComparisonIndex];
    const progress = ((currentComparisonIndex + 1) / comparisons.length) * 100;

    return (
      <div className="wizard-step comparisons-step">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        
        <p className="progress-text">
          Question {currentComparisonIndex + 1} of {comparisons.length}
        </p>

        <h2>Which book did you enjoy more?</h2>

        <div className="comparison-choices">
          <button 
            className="comparison-choice"
            onClick={() => handleComparison(true)}
            disabled={submitting}
          >
            <div className="book-info">
              <h3>{book.title}</h3>
              <p className="author">by {book.author}</p>
              <span className="badge new-book">The book you just finished</span>
            </div>
          </button>

          <div className="vs-divider">VS</div>

          <button 
            className="comparison-choice"
            onClick={() => handleComparison(false)}
            disabled={submitting}
          >
            <div className="book-info">
              <h3>{currentQuestion.candidate_title}</h3>
              <p className="author">by {currentQuestion.candidate_author}</p>
              <span className="badge ranked">Currently ranked #{currentQuestion.candidate_position}</span>
            </div>
          </button>
        </div>

        <p className="helper-text">
          Choose the book you enjoyed more overall. These comparisons will determine the final ranking.
        </p>
      </div>
    );
  };

  const renderCompleteStep = () => (
    <div className="wizard-step complete-step">
      <div className="success-icon">✓</div>
      <h2>Ranking Complete!</h2>
      <p className="result-text">
        <strong>{book.title}</strong> has been ranked at position <strong>#{finalPosition}</strong> out of {totalRanked + 1} books.
      </p>
      <p className="stars-given">
        Initial rating: {'★'.repeat(stars)}
      </p>
    </div>
  );

  return (
    <div className="ranking-wizard-overlay" onClick={onCancel}>
      <div className="ranking-wizard-modal" onClick={(e) => e.stopPropagation()}>
        {step === 'stars' && renderStarsStep()}
        {step === 'comparisons' && renderComparisonsStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
};

