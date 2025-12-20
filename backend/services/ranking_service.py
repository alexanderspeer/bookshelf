from database.db import get_db
from datetime import datetime

class RankingService:
    """Service for managing book rankings with pairwise comparisons"""
    
    def __init__(self):
        self.db = get_db()
    
    def start_ranking_wizard(self, book_id, initial_stars):
        """Start the ranking wizard for a newly finished book"""
        # Get all ranked books
        ranked_books = self.get_ranked_books()
        
        if not ranked_books:
            # First book - just insert at rank 1
            return self._insert_ranking(book_id, 1, initial_stars)
        
        # Find books with similar star ratings for comparison
        candidates = self._get_comparison_candidates(initial_stars, ranked_books)
        
        # Generate comparison questions
        comparisons = self._generate_comparisons(book_id, candidates)
        
        return {
            'book_id': book_id,
            'initial_stars': initial_stars,
            'comparisons': comparisons,
            'total_ranked': len(ranked_books)
        }
    
    def record_comparison(self, book_a_id, book_b_id, winner_id):
        """Record a pairwise comparison"""
        query = """
            INSERT INTO comparisons (book_a_id, book_b_id, winner_id)
            VALUES (?, ?, ?)
        """
        return self.db.execute_update(query, (book_a_id, book_b_id, winner_id))
    
    def get_comparison_history(self, book_id):
        """Get all comparisons involving a book"""
        query = """
            SELECT c.*, 
                   ba.title as book_a_title,
                   bb.title as book_b_title,
                   w.title as winner_title
            FROM comparisons c
            JOIN books ba ON c.book_a_id = ba.id
            JOIN books bb ON c.book_b_id = bb.id
            JOIN books w ON c.winner_id = w.id
            WHERE c.book_a_id = ? OR c.book_b_id = ?
            ORDER BY c.created_at DESC
        """
        return self.db.execute_query(query, (book_id, book_id))
    
    def finalize_ranking(self, book_id, final_position, initial_stars, comparisons):
        """Finalize ranking after wizard completes"""
        # Insert the new ranking
        self._insert_ranking(book_id, final_position, initial_stars)
        
        # Record all comparisons made during wizard
        for comp in comparisons:
            self.record_comparison(
                comp['book_a_id'],
                comp['book_b_id'],
                comp['winner_id']
            )
        
        # Adjust positions of books that were shifted
        self._reorder_rankings(final_position)
        
        return self.get_ranked_books()
    
    def get_ranked_books(self):
        """Get all ranked books in order"""
        query = """
            SELECT b.*, r.rank_position, r.initial_stars
            FROM books b
            JOIN rankings r ON b.id = r.book_id
            ORDER BY r.rank_position ASC
        """
        return self.db.execute_query(query)
    
    def get_book_rank(self, book_id):
        """Get rank information for a specific book"""
        query = """
            SELECT r.*, 
                   (SELECT COUNT(*) FROM rankings) as total_ranked
            FROM rankings r
            WHERE r.book_id = ?
        """
        result = self.db.execute_query(query, (book_id,))
        return result[0] if result else None
    
    def update_rank_position(self, book_id, new_position):
        """Manually update a book's rank position"""
        old_rank = self.get_book_rank(book_id)
        if not old_rank:
            return False
        
        old_position = old_rank['rank_position']
        
        # Update the book's position
        query = "UPDATE rankings SET rank_position = ?, updated_at = ? WHERE book_id = ?"
        self.db.execute_update(query, (new_position, datetime.now().isoformat(), book_id))
        
        # Shift other books
        if new_position < old_position:
            # Moving up - shift books down
            shift_query = """
                UPDATE rankings 
                SET rank_position = rank_position + 1,
                    updated_at = ?
                WHERE rank_position >= ? AND rank_position < ? AND book_id != ?
            """
            self.db.execute_update(shift_query, (
                datetime.now().isoformat(),
                new_position,
                old_position,
                book_id
            ))
        elif new_position > old_position:
            # Moving down - shift books up
            shift_query = """
                UPDATE rankings 
                SET rank_position = rank_position - 1,
                    updated_at = ?
                WHERE rank_position > ? AND rank_position <= ? AND book_id != ?
            """
            self.db.execute_update(shift_query, (
                datetime.now().isoformat(),
                old_position,
                new_position,
                book_id
            ))
        
        return True
    
    def get_derived_rating(self, book_id):
        """Calculate derived 0-10 rating based on rank position"""
        rank_info = self.get_book_rank(book_id)
        if not rank_info:
            return None
        
        total = rank_info['total_ranked']
        position = rank_info['rank_position']
        
        # Linear scale: rank 1 = 10, last rank = 0
        score = 10 * (1 - (position - 1) / max(total - 1, 1))
        
        # Convert to 5-star scale
        stars = score / 2
        
        return {
            'score': round(score, 2),
            'stars': round(stars, 1),
            'position': position,
            'total': total
        }
    
    def _insert_ranking(self, book_id, position, initial_stars):
        """Insert a new ranking"""
        query = """
            INSERT INTO rankings (book_id, rank_position, initial_stars)
            VALUES (?, ?, ?)
        """
        return self.db.execute_update(query, (book_id, position, initial_stars))
    
    def _reorder_rankings(self, from_position):
        """Shift rankings after inserting a new book"""
        query = """
            UPDATE rankings 
            SET rank_position = rank_position + 1,
                updated_at = ?
            WHERE rank_position >= ?
        """
        self.db.execute_update(query, (datetime.now().isoformat(), from_position))
    
    def _get_comparison_candidates(self, initial_stars, ranked_books):
        """Get books with similar ratings for comparison"""
        # Filter books within +/- 1 star
        candidates = [
            b for b in ranked_books
            if b.get('initial_stars') and 
               abs(b['initial_stars'] - initial_stars) <= 1.0
        ]
        
        if not candidates:
            # If no similar books, use all
            candidates = ranked_books
        
        return candidates
    
    def _generate_comparisons(self, new_book_id, candidates):
        """Generate comparison questions using binary search strategy"""
        # For binary insertion, we need log2(n) comparisons
        import math
        num_comparisons = min(math.ceil(math.log2(len(candidates) + 1)), 7)
        
        # Use binary search positions
        comparisons = []
        left = 0
        right = len(candidates) - 1
        
        for _ in range(num_comparisons):
            if left > right:
                break
            
            mid = (left + right) // 2
            comparisons.append({
                'candidate_book_id': candidates[mid]['id'],
                'candidate_title': candidates[mid]['title'],
                'candidate_author': candidates[mid]['author'],
                'candidate_position': candidates[mid]['rank_position']
            })
            
            # Alternate sides for next comparison
            if len(comparisons) % 2 == 0:
                right = mid - 1
            else:
                left = mid + 1
        
        return comparisons

# Singleton
_ranking_service = None

def get_ranking_service():
    global _ranking_service
    if _ranking_service is None:
        _ranking_service = RankingService()
    return _ranking_service

