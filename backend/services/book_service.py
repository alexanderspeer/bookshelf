from database.db import get_db
from datetime import datetime
import os
import shutil

class BookService:
    def __init__(self):
        self.db = get_db()
    
    def create_book(self, book_data, initial_state='want_to_read', user_id=None):
        """Create a new book entry"""
        if user_id is None:
            raise ValueError('user_id is required')
        
        query = """
            INSERT INTO books (
                user_id, title, author, isbn, isbn13, pub_date, num_pages, genre,
                cover_image_url, dimensions, series, series_position,
                notes, why_reading, is_public, date_finished
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            user_id,
            book_data.get('title'),
            book_data.get('author'),
            book_data.get('isbn'),
            book_data.get('isbn13'),
            book_data.get('pub_date'),
            book_data.get('num_pages'),
            book_data.get('genre'),
            book_data.get('cover_image_url'),
            book_data.get('dimensions'),
            book_data.get('series'),
            book_data.get('series_position'),
            book_data.get('notes'),
            book_data.get('why_reading'),
            book_data.get('is_public', False),
            book_data.get('date_finished')
        )
        
        book_id = self.db.execute_update(query, params)
        
        # Set initial reading state
        self.set_reading_state(book_id, initial_state)
        
        # Set initial ranking/stars if book is in 'read' state
        # Books in 'read' state should always have a ranking entry, even with 0 or null stars
        initial_stars = book_data.get('initial_stars')
        if initial_state == 'read':
            # Add to rankings table
            ranking_query = """
                INSERT INTO rankings (book_id, rank_position, initial_stars)
                VALUES (?, ?, ?)
            """
            # Default position is 0 (unranked), will be updated later via rerank_all_books_by_stars
            # If initial_stars is None, default to 0 (unrated)
            stars_value = initial_stars if initial_stars is not None else 0
            self.db.execute_update(ranking_query, (book_id, 0, stars_value))
        
        return self.get_book(book_id, user_id)
    
    def get_book(self, book_id, user_id=None):
        """Get a single book by ID with tags"""
        query = """
            SELECT b.*, rs.state as reading_state, r.rank_position, r.initial_stars
            FROM books b
            LEFT JOIN reading_states rs ON b.id = rs.book_id
            LEFT JOIN rankings r ON b.id = r.book_id
            WHERE b.id = ?
        """
        params = [book_id]
        
        # If user_id is provided, filter by user
        if user_id is not None:
            query += " AND b.user_id = ?"
            params.append(user_id)
        
        results = self.db.execute_query(query, params)
        if not results:
            return None
        
        book = results[0]
        
        # Fetch tags for this book
        tags_query = """
            SELECT t.id, t.name, t.color
            FROM book_tags bt
            JOIN tags t ON bt.tag_id = t.id
            WHERE bt.book_id = ?
        """
        tags_results = self.db.execute_query(tags_query, (book_id,))
        book['tags'] = tags_results if tags_results else []
        
        return book
    
    def update_book(self, book_id, book_data, user_id=None):
        """Update book information"""
        # Build dynamic update query
        fields = []
        params = []
        
        updateable_fields = [
            'title', 'author', 'isbn', 'isbn13', 'pub_date', 'num_pages', 
            'genre', 'cover_image_url', 'dimensions',
            'series', 'series_position', 'notes', 'why_reading', 'is_public'
        ]
        
        for field in updateable_fields:
            if field in book_data:
                fields.append(f"{field} = ?")
                params.append(book_data[field])
        
        if not fields:
            return self.get_book(book_id)
        
        fields.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        params.append(book_id)
        
        query = f"UPDATE books SET {', '.join(fields)} WHERE id = ?"
        
        # If user_id is provided, add user ownership check
        if user_id is not None:
            query += " AND user_id = ?"
            params.append(user_id)
        
        self.db.execute_update(query, params)
        
        return self.get_book(book_id, user_id)
    
    def delete_book(self, book_id, user_id=None):
        """Delete a book"""
        query = "DELETE FROM books WHERE id = ?"
        params = [book_id]
        
        # If user_id is provided, add ownership check
        if user_id is not None:
            query += " AND user_id = ?"
            params.append(user_id)
        
        self.db.execute_update(query, params)
        return True
    
    def search_books(self, query=None, author=None, tag=None, state=None, limit=50, offset=0, user_id=None):
        """Search books with filters - optimized to fetch tags in single query"""
        # Build base query without DISTINCT for better performance
        base_query = """
            SELECT b.*, rs.state as reading_state, r.rank_position, r.initial_stars
            FROM books b
            LEFT JOIN reading_states rs ON b.id = rs.book_id
            LEFT JOIN rankings r ON b.id = r.book_id
        """
        
        params = []
        where_clauses = []
        
        # Filter by user_id if provided
        if user_id is not None:
            where_clauses.append("b.user_id = ?")
            params.append(user_id)
        
        # Add tag filter via subquery if needed (more efficient than JOIN with DISTINCT)
        if tag:
            where_clauses.append("b.id IN (SELECT bt.book_id FROM book_tags bt JOIN tags t ON bt.tag_id = t.id WHERE t.name = ?)")
            params.append(tag)
        
        if query:
            where_clauses.append("(b.title LIKE ? OR b.author LIKE ? OR b.notes LIKE ?)")
            search_term = f"%{query}%"
            params.extend([search_term, search_term, search_term])
        
        if author:
            where_clauses.append("b.author LIKE ?")
            params.append(f"%{author}%")
        
        if state:
            where_clauses.append("rs.state = ?")
            params.append(state)
        
        # Add WHERE clause if filters exist
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
        
        base_query += " ORDER BY b.date_added DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        books = self.db.execute_query(base_query, params)
        
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
    
    def get_books_by_state(self, state, limit=50, offset=0, user_id=None):
        """Get books by reading state - optimized with tag fetching"""
        query = """
            SELECT b.*, rs.state as reading_state, r.rank_position, r.initial_stars
            FROM books b
            JOIN reading_states rs ON b.id = rs.book_id
            LEFT JOIN rankings r ON b.id = r.book_id
            WHERE rs.state = ?
        """
        params = [state]
        
        # Filter by user_id if provided
        if user_id is not None:
            query += " AND b.user_id = ?"
            params.append(user_id)
        
        query += " ORDER BY rs.updated_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        books = self.db.execute_query(query, params)
        
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
    
    def set_reading_state(self, book_id, state, date_started=None, date_finished=None):
        """Set or update reading state"""
        # Update or insert reading state
        query = """
            INSERT INTO reading_states (book_id, state)
            VALUES (?, ?)
            ON CONFLICT(book_id) DO UPDATE SET
                state = excluded.state,
                updated_at = CURRENT_TIMESTAMP
        """
        self.db.execute_update(query, (book_id, state))
        
        # Update book dates
        update_fields = []
        params = []
        
        if state == 'currently_reading' and date_started:
            update_fields.append("date_started = ?")
            params.append(date_started)
        
        if state == 'read' and date_finished:
            update_fields.append("date_finished = ?")
            params.append(date_finished)
        
        if update_fields:
            params.append(book_id)
            book_query = f"UPDATE books SET {', '.join(update_fields)} WHERE id = ?"
            self.db.execute_update(book_query, params)
        
        return True
    
    def get_total_count(self, state=None, user_id=None):
        """Get total count of books"""
        if state:
            query = """
                SELECT COUNT(*) as count
                FROM books b
                JOIN reading_states rs ON b.id = rs.book_id
                WHERE rs.state = ?
            """
            params = [state]
            
            if user_id is not None:
                query += " AND b.user_id = ?"
                params.append(user_id)
            
            result = self.db.execute_query(query, params)
        else:
            query = "SELECT COUNT(*) as count FROM books"
            params = []
            
            if user_id is not None:
                query += " WHERE user_id = ?"
                params.append(user_id)
            
            result = self.db.execute_query(query, params)
        
        return result[0]['count'] if result else 0
    
    def get_public_books(self, owner_user_id):
        """Get public books for the owner user"""
        query = """
            SELECT b.*, rs.state as reading_state, r.rank_position, r.initial_stars
            FROM books b
            LEFT JOIN reading_states rs ON b.id = rs.book_id
            LEFT JOIN rankings r ON b.id = r.book_id
            WHERE b.user_id = ? AND b.is_public = ?
            ORDER BY r.rank_position ASC, b.date_added DESC
        """
        books = self.db.execute_query(query, (owner_user_id, True))
        
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
    
    def get_public_shelf(self, user_id, state=None):
        """Get public books for a user, optionally filtered by reading state"""
        query = """
            SELECT b.id, b.title, b.author, b.isbn, b.isbn13, b.pub_date, b.num_pages,
                   b.genre, b.cover_image_url, b.series, b.series_position,
                   rs.state as reading_state, r.rank_position, r.initial_stars,
                   b.date_finished
            FROM books b
            LEFT JOIN reading_states rs ON b.id = rs.book_id
            LEFT JOIN rankings r ON b.id = r.book_id
            WHERE b.user_id = ? AND b.is_public = ?
        """
        params = [user_id, True]
        
        if state:
            query += " AND rs.state = ?"
            params.append(state)
        
        query += " ORDER BY r.rank_position ASC NULLS LAST, b.date_added DESC"
        
        books = self.db.execute_query(query, params)
        
        # Fetch tags for all books
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
            
            for book in books:
                book['tags'] = tags_by_book.get(book['id'], [])
        
        return books
    
    def get_public_stats(self, user_id):
        """Get public statistics for a user"""
        # Counts by reading state
        state_query = """
            SELECT rs.state, COUNT(*) as count
            FROM books b
            JOIN reading_states rs ON b.id = rs.book_id
            WHERE b.user_id = ? AND b.is_public = ?
            GROUP BY rs.state
        """
        state_counts = self.db.execute_query(state_query, (user_id, True))
        
        # Average rating (from rankings)
        rating_query = """
            SELECT AVG(r.initial_stars) as avg_rating, COUNT(*) as rated_count
            FROM books b
            JOIN rankings r ON b.id = r.book_id
            WHERE b.user_id = ? AND b.is_public = ? AND r.initial_stars IS NOT NULL
        """
        rating_result = self.db.execute_query(rating_query, (user_id, True))
        avg_rating = rating_result[0]['avg_rating'] if rating_result and rating_result[0]['avg_rating'] else None
        rated_count = rating_result[0]['rated_count'] if rating_result else 0
        
        # Top tags
        tags_query = """
            SELECT t.id, t.name, t.color, COUNT(bt.book_id) as book_count
            FROM tags t
            JOIN book_tags bt ON t.id = bt.tag_id
            JOIN books b ON bt.book_id = b.id
            WHERE b.user_id = ? AND b.is_public = ?
            GROUP BY t.id, t.name, t.color
            ORDER BY book_count DESC
            LIMIT 10
        """
        top_tags = self.db.execute_query(tags_query, (user_id, True))
        
        # Yearly totals (books finished per year)
        yearly_query = """
            SELECT EXTRACT(YEAR FROM b.date_finished)::TEXT as year, COUNT(*) as count
            FROM books b
            WHERE b.user_id = ? AND b.is_public = ? AND b.date_finished IS NOT NULL
            GROUP BY EXTRACT(YEAR FROM b.date_finished)
            ORDER BY year DESC
        """
        # Handle SQLite vs PostgreSQL date extraction
        if self.db.db_type == 'sqlite':
            yearly_query = """
                SELECT strftime('%Y', b.date_finished) as year, COUNT(*) as count
                FROM books b
                WHERE b.user_id = ? AND b.is_public = ? AND b.date_finished IS NOT NULL
                GROUP BY strftime('%Y', b.date_finished)
                ORDER BY year DESC
            """
        yearly_totals = self.db.execute_query(yearly_query, (user_id, True))
        
        # Convert to dict format
        state_dict = {}
        for row in state_counts:
            state_dict[row['state']] = row['count']
        
        return {
            'counts_by_state': {
                'want_to_read': state_dict.get('want_to_read', 0),
                'currently_reading': state_dict.get('currently_reading', 0),
                'read': state_dict.get('read', 0)
            },
            'total_public_books': sum(state_dict.values()),
            'average_rating': float(avg_rating) if avg_rating else None,
            'rated_count': rated_count,
            'top_tags': [
                {
                    'id': tag['id'],
                    'name': tag['name'],
                    'color': tag['color'],
                    'book_count': tag['book_count']
                }
                for tag in top_tags
            ],
            'yearly_totals': [
                {
                    'year': row['year'],
                    'count': row['count']
                }
                for row in yearly_totals
            ]
        }

# Singleton
_book_service = None

def get_book_service():
    global _book_service
    if _book_service is None:
        _book_service = BookService()
    return _book_service

