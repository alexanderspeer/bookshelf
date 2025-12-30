import os
import re
from contextlib import contextmanager
from urllib.parse import urlparse

# Try to import both database drivers
try:
    import psycopg2
    import psycopg2.extras
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False

try:
    import sqlite3
    SQLITE_AVAILABLE = True
except ImportError:
    SQLITE_AVAILABLE = False


class Database:
    def __init__(self, db_path='data/bookshelf.db'):
        self.db_path = db_path
        self.database_url = os.getenv('DATABASE_URL')
        
        # Determine which database to use
        if self.database_url:
            if not POSTGRES_AVAILABLE:
                raise RuntimeError("DATABASE_URL is set but psycopg2 is not installed")
            self.db_type = 'postgres'
            print(f"Using PostgreSQL database")
        else:
            if not SQLITE_AVAILABLE:
                raise RuntimeError("SQLite is not available")
            self.db_type = 'sqlite'
            print(f"Using SQLite database at {self.db_path}")
            self._ensure_db_exists()
    
    def _ensure_db_exists(self):
        """Create database and tables if they don't exist (SQLite only)"""
        if self.db_type != 'sqlite':
            return
            
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
    
    def _convert_query(self, query, params):
        """
        Convert SQLite-style ? placeholders to PostgreSQL-style %s placeholders
        Also handles SQLite-specific functions like strftime
        """
        if self.db_type == 'sqlite':
            return query, params
        
        # Convert ? to %s for PostgreSQL
        # We need to be careful not to replace ? inside strings
        converted_query = query
        
        # Replace ? with %s (simple approach for now)
        # This works because we don't have ? in string literals in our queries
        converted_query = converted_query.replace('?', '%s')
        
        # Replace SQLite-specific date functions with PostgreSQL equivalents
        # strftime('%Y', column) -> EXTRACT(YEAR FROM column)::TEXT
        converted_query = re.sub(
            r"strftime\('%Y',\s*([^)]+)\)",
            r"EXTRACT(YEAR FROM \1)::TEXT",
            converted_query
        )
        
        # Replace DATE() function - SQLite DATE() -> PostgreSQL DATE cast
        # DATE(column) -> column::DATE
        # DATE(?) -> ?::DATE (parameter binding)
        converted_query = re.sub(
            r"DATE\(([^)]+)\)",
            r"\1::DATE",
            converted_query
        )
        
        return converted_query, params
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        if self.db_type == 'postgres':
            conn = psycopg2.connect(self.database_url)
            # Return dict-like rows
            conn.cursor_factory = psycopg2.extras.RealDictCursor
        else:
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
        converted_query, converted_params = self._convert_query(query, params)
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if converted_params:
                cursor.execute(converted_query, converted_params)
            else:
                cursor.execute(converted_query)
            rows = cursor.fetchall()
            
            # Convert rows to list of dicts
            if self.db_type == 'postgres':
                # RealDictCursor already returns dict-like objects
                return [dict(row) for row in rows]
            else:
                # sqlite3.Row needs conversion
                return [dict(row) for row in rows]
    
    def execute_update(self, query, params=None):
        """Execute an INSERT/UPDATE/DELETE query and return lastrowid"""
        converted_query, converted_params = self._convert_query(query, params)
        
        # For PostgreSQL INSERT queries, we need to add RETURNING id
        # to get the lastrowid equivalent
        if self.db_type == 'postgres' and 'INSERT INTO' in converted_query.upper():
            if 'RETURNING' not in converted_query.upper():
                # Add RETURNING id clause
                converted_query = converted_query.rstrip().rstrip(';') + ' RETURNING id'
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if converted_params:
                cursor.execute(converted_query, converted_params)
            else:
                cursor.execute(converted_query)
            
            # Handle returning lastrowid
            if self.db_type == 'postgres':
                if 'RETURNING' in converted_query.upper():
                    result = cursor.fetchone()
                    return result['id'] if result else None
                else:
                    # For UPDATE/DELETE, return None (consistent with SQLite)
                    return None
            else:
                return cursor.lastrowid


# Singleton instance
_db_instance = None

def get_db():
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance
