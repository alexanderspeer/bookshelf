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
            self._ensure_postgres_schema()
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
    
    def _ensure_postgres_schema(self):
        """Initialize PostgreSQL schema if tables don't exist"""
        print("_ensure_postgres_schema called")
        if self.db_type != 'postgres':
            print(f"Skipping schema init - db_type is {self.db_type}")
            return
        
        schema_path = os.path.join(os.path.dirname(__file__), 'schema_postgres.sql')
        print(f"Looking for schema at: {schema_path}")
        print(f"__file__ is: {__file__}")
        print(f"os.path.dirname(__file__) is: {os.path.dirname(__file__)}")
        
        if not os.path.exists(schema_path):
            print(f"ERROR: PostgreSQL schema file not found at {schema_path}")
            # List what files ARE in this directory
            try:
                dir_path = os.path.dirname(__file__)
                print(f"Files in {dir_path}: {os.listdir(dir_path)}")
            except Exception as e:
                print(f"Could not list directory: {e}")
            return
        
        print(f"Schema file found, reading...")
        try:
            with open(schema_path, 'r') as f:
                schema = f.read()
            
            print(f"Schema file read successfully, {len(schema)} characters")
            
            # Execute schema - split by semicolon and execute each statement
            # PostgreSQL doesn't support executing multiple statements in one execute()
            # so we need to split them carefully
            print("Opening database connection...")
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Split schema by semicolon, filtering out comments and empty statements
                statements = []
                for stmt in schema.split(';'):
                    stmt = stmt.strip()
                    # Skip empty statements and comment-only lines
                    if stmt and not stmt.startswith('--'):
                        statements.append(stmt)
                
                print(f"Executing {len(statements)} schema statements...")
                for i, statement in enumerate(statements):
                    try:
                        cursor.execute(statement)
                        if i < 5 or 'users' in statement.lower():  # Log first few and users table
                            print(f"  Statement {i+1} executed successfully")
                    except Exception as e:
                        # Ignore errors for "table already exists", "already exists", etc.
                        # since we're using CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS
                        error_msg = str(e).lower()
                        ignore_patterns = ['already exists', 'duplicate', 'relation']
                        if any(pattern in error_msg for pattern in ignore_patterns):
                            # Expected error - table/index already exists, skip silently
                            print(f"  Statement {i+1} already exists (expected), skipping")
                        else:
                            # Unexpected error - log it but continue
                            print(f"ERROR: Error executing schema statement {i+1}: {e}")
                            print(f"Statement (first 150 chars): {statement[:150]}...")
            
            # Context manager handles commit automatically
            print("PostgreSQL schema initialized successfully!")
        except Exception as e:
            print(f"ERROR: Could not initialize PostgreSQL schema: {e}")
            import traceback
            traceback.print_exc()
            # Don't raise - allow app to continue in case schema already exists
    
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
