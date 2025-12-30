from database.db import get_db
from datetime import datetime

class RankingService:
    """Service for managing book rankings with pairwise comparisons"""
    
    def __init__(self):
        self.db = get_db()
    
    def start_ranking_wizard(self, book_id, initial_stars, user_id=None):
        """Start the ranking wizard for a newly finished book"""
        # Get all ranked books for this user
        ranked_books = self.get_ranked_books(user_id)
        
        if not ranked_books:
            # First book - just insert at rank 1
            return self._insert_ranking(book_id, 1, initial_stars)
        
        # CRITICAL: Only compare against books with THE SAME star rating
        # A 5-star book should NEVER be ranked below a 4-star book
        same_star_books = [b for b in ranked_books if b.get('initial_stars') == initial_stars]
        
        if not same_star_books:
            # No books with same star rating - will be placed automatically by rerank_all_books_by_stars
            # Just insert with temporary position 0
            self._insert_ranking(book_id, 0, initial_stars)
            # Re-rank to place it correctly within star groups
            self.rerank_all_books_by_stars(user_id)
            return {
                'book_id': book_id,
                'initial_stars': initial_stars,
                'comparisons': [],
                'total_ranked': len(ranked_books),
                'message': f'Placed in {initial_stars}-star group (only book with this rating)'
            }
        
        # Find books with similar star ratings for comparison (same stars only)
        candidates = self._get_comparison_candidates(initial_stars, same_star_books)
        
        # Generate comparison questions
        comparisons = self._generate_comparisons(book_id, candidates)
        
        return {
            'book_id': book_id,
            'initial_stars': initial_stars,
            'comparisons': comparisons,
            'total_ranked': len(ranked_books),
            'same_star_count': len(same_star_books)
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
    
    def finalize_ranking(self, book_id, final_position, initial_stars, comparisons, user_id=None):
        """
        Finalize ranking after wizard completes.
        IMPORTANT: The book must stay within its star rating group.
        
        Strategy:
        1. Record all comparisons for history
        2. Get all books with same star rating
        3. Determine valid position range within star group
        4. Insert at position and shift others in that group down
        5. DO NOT re-alphabetize - preserve manual rankings
        """
        if user_id is None:
            raise ValueError('user_id is required')
        
        # Record all comparisons made during wizard
        for comp in comparisons:
            self.record_comparison(
                comp['book_a_id'],
                comp['book_b_id'],
                comp['winner_id']
            )
        
        # Get the boundaries of this star group
        # Find the highest-ranked and lowest-ranked book with the same stars
        query = """
            SELECT MIN(r.rank_position) as min_pos, MAX(r.rank_position) as max_pos
            FROM rankings r
            JOIN books b ON r.book_id = b.id
            WHERE b.user_id = ? AND r.initial_stars = ? AND r.rank_position > 0
        """
        result = self.db.execute_query(query, (user_id, initial_stars))
        
        if result and result[0]['min_pos'] is not None:
            min_pos = result[0]['min_pos']
            max_pos = result[0]['max_pos']
            
            # Constrain position to be within the star group
            # Can be placed anywhere from min_pos to max_pos + 1
            constrained_position = max(min_pos, min(final_position, max_pos + 1))
        else:
            # First book with this star rating
            # Find where this star group should start
            constrained_position = self._find_star_group_start(initial_stars, user_id)
        
        # CRITICAL: Shift books at or after this position down by 1 BEFORE inserting
        # This prevents duplicates
        self._reorder_rankings(constrained_position, user_id)
        
        # Now insert the new ranking at the desired position
        self._insert_ranking(book_id, constrained_position, initial_stars)
        
        return self.get_ranked_books(user_id)
    
    def rerank_all_books_by_stars(self, user_id=None):
        """
        Re-rank all books based on star ratings and alphabetical order.
        5-star books come first (alphabetically), then 4-star, then 3-star, etc.
        Within each star group, books are sorted alphabetically by title.
        """
        if user_id is None:
            raise ValueError('user_id is required')
        
        # Get all ranked books for this user, sorted by stars (desc) then title (asc)
        query = """
            SELECT b.id, b.title, r.initial_stars
            FROM books b
            JOIN rankings r ON b.id = r.book_id
            WHERE b.user_id = ?
            ORDER BY r.initial_stars DESC, b.title ASC
        """
        books = self.db.execute_query(query, (user_id,))
        
        if not books:
            return
        
        # Assign new rank positions based on the sorted order
        for index, book in enumerate(books, start=1):
            update_query = """
                UPDATE rankings 
                SET rank_position = ?, updated_at = CURRENT_TIMESTAMP
                WHERE book_id = ?
            """
            self.db.execute_update(update_query, (index, book['id']))
        
        return len(books)
    
    def get_ranked_books(self, user_id=None):
        """Get all ranked books in order with tags"""
        query = """
            SELECT b.*, r.rank_position, r.initial_stars, rs.state as reading_state
            FROM books b
            JOIN rankings r ON b.id = r.book_id
            LEFT JOIN reading_states rs ON b.id = rs.book_id
        """
        
        params = []
        if user_id is not None:
            query += " WHERE b.user_id = ?"
            params.append(user_id)
        
        # Sort by: rank_position first, then by initial_stars (descending), then alphabetically by title
        # This ensures books with same rating are in alphabetical order
        query += " ORDER BY r.rank_position ASC, r.initial_stars DESC NULLS LAST, b.title ASC"
        
        books = self.db.execute_query(query, params) if params else self.db.execute_query(query)
        
        # Fetch tags for all books in one query (avoid N+1 problem)
        if books:
            book_ids = [book['id'] for book in books]
            placeholders = ','.join(['?'] * len(book_ids))
            tags_query = f"""
                SELECT bt.book_id, t.id, t.name, t.color
                FROM book_tags bt
                JOIN tags t ON bt.tag_id = t.id
                WHERE bt.book_id IN ({placeholders})
            """
            tags_results = self.db.execute_query(tags_query, book_ids)
            
            # Group tags by book_id
            tags_by_book = {}
            for tag_row in tags_results:
                book_id = tag_row['book_id']
                if book_id not in tags_by_book:
                    tags_by_book[book_id] = []
                tags_by_book[book_id].append({
                    'id': tag_row['id'],
                    'name': tag_row['name'],
                    'color': tag_row['color']
                })
            
            # Add tags to each book
            for book in books:
                book['tags'] = tags_by_book.get(book['id'], [])
        
        return books
    
    def get_book_rank(self, book_id, user_id=None):
        """Get rank information for a specific book"""
        # Build subquery with user_id filter if provided
        count_subquery = "SELECT COUNT(*) FROM rankings r2"
        if user_id is not None:
            count_subquery += " JOIN books b2 ON r2.book_id = b2.id WHERE b2.user_id = ?"
        
        query = f"""
            SELECT r.*, 
                   ({count_subquery}) as total_ranked
            FROM rankings r
            JOIN books b ON r.book_id = b.id
            WHERE r.book_id = ?
        """
        
        params = []
        if user_id is not None:
            params.append(user_id)
        params.append(book_id)
        
        result = self.db.execute_query(query, tuple(params))
        return result[0] if result else None
    
    def update_rank_position(self, book_id, new_position, user_id=None):
        """Manually update a book's rank position"""
        old_rank = self.get_book_rank(book_id, user_id)
        if not old_rank:
            return False
        
        old_position = old_rank['rank_position']
        
        # Update the book's position
        query = "UPDATE rankings SET rank_position = ?, updated_at = ? WHERE book_id = ?"
        self.db.execute_update(query, (new_position, datetime.now().isoformat(), book_id))
        
        # Build WHERE clause for user filtering
        user_filter = ""
        if user_id is not None:
            user_filter = " AND book_id IN (SELECT id FROM books WHERE user_id = ?)"
        
        # Shift other books
        if new_position < old_position:
            # Moving up - shift books down
            shift_query = f"""
                UPDATE rankings 
                SET rank_position = rank_position + 1,
                    updated_at = ?
                WHERE rank_position >= ? AND rank_position < ? AND book_id != ?{user_filter}
            """
            params = [datetime.now().isoformat(), new_position, old_position, book_id]
            if user_id is not None:
                params.append(user_id)
            self.db.execute_update(shift_query, tuple(params))
        elif new_position > old_position:
            # Moving down - shift books up
            shift_query = f"""
                UPDATE rankings 
                SET rank_position = rank_position - 1,
                    updated_at = ?
                WHERE rank_position > ? AND rank_position <= ? AND book_id != ?{user_filter}
            """
            params = [datetime.now().isoformat(), old_position, new_position, book_id]
            if user_id is not None:
                params.append(user_id)
            self.db.execute_update(shift_query, tuple(params))
        
        return True
    
    def get_derived_rating(self, book_id, user_id=None):
        """Calculate derived 0-10 rating based on rank position"""
        rank_info = self.get_book_rank(book_id, user_id)
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
    
    def _find_star_group_start(self, stars, user_id):
        """
        Find where a new star group should start.
        Should be placed after all higher-star books and before all lower-star books.
        """
        # Find the last position of books with HIGHER stars
        query_higher = """
            SELECT MAX(r.rank_position) as max_pos
            FROM rankings r
            JOIN books b ON r.book_id = b.id
            WHERE b.user_id = ? AND r.initial_stars > ? AND r.rank_position > 0
        """
        result_higher = self.db.execute_query(query_higher, (user_id, stars))
        
        if result_higher and result_higher[0]['max_pos'] is not None:
            # Place right after the highest-star group
            return result_higher[0]['max_pos'] + 1
        
        # No higher-star books, so this becomes rank #1
        return 1
    
    def _insert_ranking(self, book_id, position, initial_stars):
        """Insert a new ranking"""
        query = """
            INSERT INTO rankings (book_id, rank_position, initial_stars)
            VALUES (?, ?, ?)
        """
        return self.db.execute_update(query, (book_id, position, initial_stars))
    
    def _reorder_rankings(self, from_position, user_id=None):
        """Shift rankings after inserting a new book"""
        user_filter = ""
        params = [datetime.now().isoformat(), from_position]
        
        if user_id is not None:
            user_filter = " AND book_id IN (SELECT id FROM books WHERE user_id = ?)"
            params.append(user_id)
        
        query = f"""
            UPDATE rankings 
            SET rank_position = rank_position + 1,
                updated_at = ?
            WHERE rank_position >= ?{user_filter}
        """
        self.db.execute_update(query, tuple(params))
    
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
        import math
        
        if not candidates:
            return []
        
        # For true binary search, we need ceil(log2(n+1)) comparisons
        # This allows us to find the exact position among n+1 possible spots
        num_comparisons = min(math.ceil(math.log2(len(candidates) + 1)), 10)
        
        # Generate binary search path through the candidate list
        # We'll create comparisons that simulate binary search insertion
        comparisons = []
        
        # Start with full range
        left = 0
        right = len(candidates) - 1
        
        # Binary search simulation: at each step, compare with middle element
        for i in range(num_comparisons):
            if left > right:
                # We've narrowed down the position
                break
            
            # Find middle point
            mid = (left + right) // 2
            
            # Add this comparison
            comparisons.append({
                'candidate_book_id': candidates[mid]['id'],
                'candidate_title': candidates[mid]['title'],
                'candidate_author': candidates[mid]['author'],
                'candidate_position': candidates[mid]['rank_position'],
                'search_left': left,
                'search_right': right,
                'search_mid': mid
            })
            
            # For the next iteration, we'll split the range
            # The frontend will determine which half based on the comparison result
            # Here we just alternate to show different parts of the range
            if i % 2 == 0:
                # Next time, explore the left half (in case new book is better)
                right = mid - 1
            else:
                # Explore right half (in case new book is worse)
                left = mid + 1
        
        return comparisons

# Singleton
_ranking_service = None

def get_ranking_service():
    global _ranking_service
    if _ranking_service is None:
        _ranking_service = RankingService()
    return _ranking_service

