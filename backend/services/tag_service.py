from database.db import get_db

class TagService:
    """Service for managing tags"""
    
    def __init__(self):
        self.db = get_db()
    
    def create_tag(self, name, color=None):
        """Create a new tag"""
        query = "INSERT INTO tags (name, color) VALUES (?, ?)"
        try:
            tag_id = self.db.execute_update(query, (name, color))
            return self.get_tag(tag_id)
        except:
            # Tag might already exist
            return self.get_tag_by_name(name)
    
    def get_tag(self, tag_id):
        """Get tag by ID"""
        query = "SELECT * FROM tags WHERE id = ?"
        results = self.db.execute_query(query, (tag_id,))
        return results[0] if results else None
    
    def get_tag_by_name(self, name):
        """Get tag by name"""
        query = "SELECT * FROM tags WHERE name = ?"
        results = self.db.execute_query(query, (name,))
        return results[0] if results else None
    
    def get_all_tags(self):
        """Get all tags"""
        query = "SELECT * FROM tags ORDER BY name"
        return self.db.execute_query(query)
    
    def update_tag(self, tag_id, name=None, color=None):
        """Update tag"""
        fields = []
        params = []
        
        if name:
            fields.append("name = ?")
            params.append(name)
        if color:
            fields.append("color = ?")
            params.append(color)
        
        if not fields:
            return self.get_tag(tag_id)
        
        params.append(tag_id)
        query = f"UPDATE tags SET {', '.join(fields)} WHERE id = ?"
        self.db.execute_update(query, params)
        
        return self.get_tag(tag_id)
    
    def delete_tag(self, tag_id):
        """Delete tag"""
        query = "DELETE FROM tags WHERE id = ?"
        self.db.execute_update(query, (tag_id,))
        return True
    
    def merge_tags(self, source_tag_id, target_tag_id):
        """Merge one tag into another"""
        # Update all book_tags to use target tag
        query = """
            UPDATE book_tags 
            SET tag_id = ? 
            WHERE tag_id = ?
        """
        self.db.execute_update(query, (target_tag_id, source_tag_id))
        
        # Delete source tag
        self.delete_tag(source_tag_id)
        return True
    
    def add_tag_to_book(self, book_id, tag_id):
        """Add tag to book"""
        query = "INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)"
        self.db.execute_update(query, (book_id, tag_id))
        return True
    
    def remove_tag_from_book(self, book_id, tag_id):
        """Remove tag from book"""
        query = "DELETE FROM book_tags WHERE book_id = ? AND tag_id = ?"
        self.db.execute_update(query, (book_id, tag_id))
        return True
    
    def get_book_tags(self, book_id):
        """Get all tags for a book"""
        query = """
            SELECT t.* 
            FROM tags t
            JOIN book_tags bt ON t.id = bt.tag_id
            WHERE bt.book_id = ?
            ORDER BY t.name
        """
        return self.db.execute_query(query, (book_id,))
    
    def get_tag_stats(self):
        """Get tag usage statistics"""
        query = """
            SELECT t.*, COUNT(bt.book_id) as book_count
            FROM tags t
            LEFT JOIN book_tags bt ON t.id = bt.tag_id
            GROUP BY t.id
            ORDER BY book_count DESC, t.name
        """
        return self.db.execute_query(query)

# Singleton
_tag_service = None

def get_tag_service():
    global _tag_service
    if _tag_service is None:
        _tag_service = TagService()
    return _tag_service

