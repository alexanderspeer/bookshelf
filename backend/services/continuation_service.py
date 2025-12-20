from database.db import get_db

class ContinuationService:
    """Service for managing thought continuations between books"""
    
    def __init__(self):
        self.db = get_db()
    
    def add_continuation(self, from_book_id, to_book_id):
        """Add a thought continuation link"""
        query = """
            INSERT OR IGNORE INTO thought_continuations (from_book_id, to_book_id)
            VALUES (?, ?)
        """
        self.db.execute_update(query, (from_book_id, to_book_id))
        return True
    
    def remove_continuation(self, from_book_id, to_book_id):
        """Remove a continuation link"""
        query = """
            DELETE FROM thought_continuations 
            WHERE from_book_id = ? AND to_book_id = ?
        """
        self.db.execute_update(query, (from_book_id, to_book_id))
        return True
    
    def get_continuations_from(self, book_id):
        """Get books that continue from this book"""
        query = """
            SELECT b.*, tc.created_at as link_created_at
            FROM books b
            JOIN thought_continuations tc ON b.id = tc.to_book_id
            WHERE tc.from_book_id = ?
            ORDER BY tc.created_at
        """
        return self.db.execute_query(query, (book_id,))
    
    def get_continuations_to(self, book_id):
        """Get books that this book continues from"""
        query = """
            SELECT b.*, tc.created_at as link_created_at
            FROM books b
            JOIN thought_continuations tc ON b.id = tc.from_book_id
            WHERE tc.to_book_id = ?
            ORDER BY tc.created_at
        """
        return self.db.execute_query(query, (book_id,))
    
    def get_all_continuations(self):
        """Get all continuation relationships"""
        query = """
            SELECT tc.*, 
                   bf.title as from_title, bf.author as from_author,
                   bt.title as to_title, bt.author as to_author
            FROM thought_continuations tc
            JOIN books bf ON tc.from_book_id = bf.id
            JOIN books bt ON tc.to_book_id = bt.id
            ORDER BY tc.created_at DESC
        """
        return self.db.execute_query(query)
    
    def get_continuation_graph(self):
        """Get graph data for visualization"""
        continuations = self.get_all_continuations()
        
        # Build nodes and edges
        nodes = {}
        edges = []
        
        for cont in continuations:
            # Add nodes
            if cont['from_book_id'] not in nodes:
                nodes[cont['from_book_id']] = {
                    'id': cont['from_book_id'],
                    'title': cont['from_title'],
                    'author': cont['from_author']
                }
            if cont['to_book_id'] not in nodes:
                nodes[cont['to_book_id']] = {
                    'id': cont['to_book_id'],
                    'title': cont['to_title'],
                    'author': cont['to_author']
                }
            
            # Add edge
            edges.append({
                'from': cont['from_book_id'],
                'to': cont['to_book_id'],
                'created_at': cont['created_at']
            })
        
        return {
            'nodes': list(nodes.values()),
            'edges': edges
        }
    
    def get_chain(self, book_id, direction='both'):
        """Get the complete chain of books connected to this book"""
        visited = set()
        chain = []
        
        def traverse(current_id, is_forward):
            if current_id in visited:
                return
            
            visited.add(current_id)
            
            # Get book info
            book_query = "SELECT * FROM books WHERE id = ?"
            book_result = self.db.execute_query(book_query, (current_id,))
            if book_result:
                chain.append({
                    **book_result[0],
                    'direction': 'forward' if is_forward else 'backward'
                })
            
            # Traverse connections
            if is_forward or direction == 'both':
                next_books = self.get_continuations_from(current_id)
                for book in next_books:
                    traverse(book['id'], True)
            
            if not is_forward or direction == 'both':
                prev_books = self.get_continuations_to(current_id)
                for book in prev_books:
                    traverse(book['id'], False)
        
        # Start traversal
        if direction in ['forward', 'both']:
            traverse(book_id, True)
        if direction in ['backward', 'both']:
            traverse(book_id, False)
        
        return chain

# Singleton
_continuation_service = None

def get_continuation_service():
    global _continuation_service
    if _continuation_service is None:
        _continuation_service = ContinuationService()
    return _continuation_service

