from database.db import get_db
from datetime import datetime
import os
import shutil
from services.cover_service import fetch_and_save_cover

class BookService:
    def __init__(self):
        self.db = get_db()
        self.spine_images_path = os.getenv('SPINE_IMAGES_PATH', 'data/spine_images')
        os.makedirs(self.spine_images_path, exist_ok=True)
    
    def create_book(self, book_data, initial_state='want_to_read'):
        """Create a new book entry"""
        query = """
            INSERT INTO books (
                title, author, isbn, isbn13, pub_date, num_pages, genre,
                cover_image_url, spine_image_path, dimensions, series, series_position,
                notes, why_reading
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            book_data.get('title'),
            book_data.get('author'),
            book_data.get('isbn'),
            book_data.get('isbn13'),
            book_data.get('pub_date'),
            book_data.get('num_pages'),
            book_data.get('genre'),
            book_data.get('cover_image_url'),
            book_data.get('spine_image_path'),
            book_data.get('dimensions'),
            book_data.get('series'),
            book_data.get('series_position'),
            book_data.get('notes'),
            book_data.get('why_reading')
        )
        
        book_id = self.db.execute_update(query, params)
        
        # Note: spine_image_path is for actual spine photos (edge of book), not covers
        # Real spine images must be uploaded by users or generated as fakes
        # Covers are full front images and look bad when used as spines
        
        # Set initial reading state
        self.set_reading_state(book_id, initial_state)
        
        return self.get_book(book_id)
    
    def get_book(self, book_id):
        """Get a single book by ID with tags"""
        query = """
            SELECT b.*, rs.state as reading_state, r.rank_position, r.initial_stars
            FROM books b
            LEFT JOIN reading_states rs ON b.id = rs.book_id
            LEFT JOIN rankings r ON b.id = r.book_id
            WHERE b.id = ?
        """
        results = self.db.execute_query(query, (book_id,))
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
    
    def update_book(self, book_id, book_data):
        """Update book information"""
        # Build dynamic update query
        fields = []
        params = []
        
        updateable_fields = [
            'title', 'author', 'isbn', 'isbn13', 'pub_date', 'num_pages', 
            'genre', 'cover_image_url', 'spine_image_path', 'dimensions',
            'series', 'series_position', 'notes', 'why_reading'
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
        self.db.execute_update(query, params)
        
        return self.get_book(book_id)
    
    def delete_book(self, book_id):
        """Delete a book"""
        # Get book to check for spine image
        book = self.get_book(book_id)
        if book and book.get('spine_image_path'):
            spine_path = os.path.join(self.spine_images_path, book['spine_image_path'])
            if os.path.exists(spine_path):
                os.remove(spine_path)
        
        query = "DELETE FROM books WHERE id = ?"
        self.db.execute_update(query, (book_id,))
        return True
    
    def search_books(self, query=None, author=None, tag=None, state=None, limit=50, offset=0):
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
    
    def get_books_by_state(self, state, limit=50, offset=0):
        """Get books by reading state - optimized with tag fetching"""
        query = """
            SELECT b.*, rs.state as reading_state, r.rank_position, r.initial_stars
            FROM books b
            JOIN reading_states rs ON b.id = rs.book_id
            LEFT JOIN rankings r ON b.id = r.book_id
            WHERE rs.state = ?
            ORDER BY rs.updated_at DESC
            LIMIT ? OFFSET ?
        """
        books = self.db.execute_query(query, (state, limit, offset))
        
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
    
    def save_spine_image(self, book_id, image_file):
        """Save a spine image file"""
        # Generate filename
        book = self.get_book(book_id)
        if not book:
            return None
        
        ext = os.path.splitext(image_file.filename)[1]
        filename = f"{book_id}_{book['title'][:30].replace(' ', '_')}{ext}"
        filepath = os.path.join(self.spine_images_path, filename)
        
        # Save file
        image_file.save(filepath)
        
        # Update book record
        self.update_book(book_id, {'spine_image_path': filename})
        
        return filename
    
    def get_total_count(self, state=None):
        """Get total count of books"""
        if state:
            query = """
                SELECT COUNT(*) as count
                FROM books b
                JOIN reading_states rs ON b.id = rs.book_id
                WHERE rs.state = ?
            """
            result = self.db.execute_query(query, (state,))
        else:
            query = "SELECT COUNT(*) as count FROM books"
            result = self.db.execute_query(query)
        
        return result[0]['count'] if result else 0

# Singleton
_book_service = None

def get_book_service():
    global _book_service
    if _book_service is None:
        _book_service = BookService()
    return _book_service

