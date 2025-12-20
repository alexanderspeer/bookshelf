import sqlite3
import os
from contextlib import contextmanager

class Database:
    def __init__(self, db_path='data/bookshelf.db'):
        self.db_path = db_path
        self._ensure_db_exists()
    
    def _ensure_db_exists(self):
        """Create database and tables if they don't exist"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        # Create tables from schema
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        if os.path.exists(schema_path):
            with open(schema_path, 'r') as f:
                schema = f.read()
            
            conn = sqlite3.connect(self.db_path)
            conn.executescript(schema)
            conn.commit()
            conn.close()
        else:
            print(f"Warning: Schema file not found at {schema_path}")
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Return rows as dicts
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def execute_query(self, query, params=None):
        """Execute a SELECT query and return results"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def execute_update(self, query, params=None):
        """Execute an INSERT/UPDATE/DELETE query"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.lastrowid

# Singleton instance
_db_instance = None

def get_db():
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance
