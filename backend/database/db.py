import os
import re
from contextlib import contextmanager
from urllib.parse import urlparse

# Try to import both database drivers
try:
    from psycopg import connect
    from psycopg.rows import dict_row
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
                raise RuntimeError(
                    "DATABASE_URL is set but psycopg is not installed. "
                    "Install with: pip install 'psycopg[binary]>=3.1.0'"
                )
            self.db_type = 'postgres'
            print(f"Using PostgreSQL database")
            self._validate_postgres_schema()
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
    
    def _validate_postgres_schema(self):
        """Validate that PostgreSQL schema exists - fail fast if missing"""
        if self.db_type != 'postgres':
            return
        
        try:
            # Check if critical tables exist
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'users'
                    ) as exists
                """)
                result = cursor.fetchone()
                schema_exists = result[0] if result else False
                
                if not schema_exists:
                    raise RuntimeError(
                        "PostgreSQL schema not initialized! "
                        "Run 'python backend/scripts/init_postgres_schema.py' "
                        "or apply schema manually with: "
                        "psql $DATABASE_URL < backend/database/schema_postgres.sql"
                    )
                
                print("✓ PostgreSQL schema validated")
        except Exception as e:
            if "schema not initialized" in str(e):
                raise
            # Other errors (connection issues, etc.) are logged but don't fail fast
            print(f"Warning: Could not validate schema: {e}")
    
    def _convert_query(self, query, params):
        """
        Convert SQLite-style queries to PostgreSQL-compatible syntax.
        Handles:
        - Placeholder conversion: ? -> %s
        - Date functions: strftime, DATE
        - String functions: SUBSTR
        - Upsert syntax: INSERT OR IGNORE, ON CONFLICT
        """
        if self.db_type == 'sqlite':
            return query, params
        
        converted_query = query
        
        # 1. Convert ? to %s for PostgreSQL parameter binding
        # This works because we don't have ? in string literals in our queries
        converted_query = converted_query.replace('?', '%s')
        
        # 2. Replace INSERT OR IGNORE with INSERT ... ON CONFLICT DO NOTHING
        # Pattern: INSERT OR IGNORE INTO table (...) VALUES (...)
        if re.search(r'\bINSERT\s+OR\s+IGNORE\s+INTO\b', converted_query, re.IGNORECASE):
            # Remove OR IGNORE
            converted_query = re.sub(
                r'\bINSERT\s+OR\s+IGNORE\s+INTO\b',
                'INSERT INTO',
                converted_query,
                flags=re.IGNORECASE
            )
            
            # Add ON CONFLICT DO NOTHING if not already present
            if 'ON CONFLICT' not in converted_query.upper():
                # Insert before RETURNING clause or at end
                if 'RETURNING' in converted_query.upper():
                    converted_query = re.sub(
                        r'\s+RETURNING\b',
                        ' ON CONFLICT DO NOTHING RETURNING',
                        converted_query,
                        flags=re.IGNORECASE
                    )
                else:
                    # Add at end of statement (before semicolon if present)
                    converted_query = converted_query.rstrip().rstrip(';') + ' ON CONFLICT DO NOTHING'
        
        # 3. Replace SUBSTR() with SUBSTRING()
        # SUBSTR(column, start, length) -> SUBSTRING(column::TEXT FROM start FOR length)
        # Note: PostgreSQL SUBSTRING requires text type, so cast to TEXT
        # SQLite SUBSTR is 1-indexed, PostgreSQL SUBSTRING is also 1-indexed
        converted_query = re.sub(
            r'\bSUBSTR\s*\(\s*([^,]+),\s*(\d+),\s*(\d+)\s*\)',
            r'SUBSTRING(\1::TEXT FROM \2 FOR \3)',
            converted_query,
            flags=re.IGNORECASE
        )
        
        # 4. Replace SQLite date functions with PostgreSQL equivalents
        # strftime('%Y', column) -> EXTRACT(YEAR FROM column)::TEXT
        # Handle nested parentheses properly
        def replace_strftime(match):
            content = match.group(0)
            # Find content after 'strftime('
            start = content.lower().find('strftime(') + 9
            # Balance parentheses to find the arguments
            paren_count = 1
            i = start
            while i < len(content) and paren_count > 0:
                if content[i] == '(':
                    paren_count += 1
                elif content[i] == ')':
                    paren_count -= 1
                i += 1
            # Extract arguments: '%Y', expression
            args_str = content[start:i-1]
            # Find the comma after '%Y'
            comma_pos = args_str.find(',')
            if comma_pos > 0:
                inner_expr = args_str[comma_pos+1:].strip()
            else:
                inner_expr = args_str.strip()
            return f"EXTRACT(YEAR FROM {inner_expr})::TEXT"
        
        # Use a callback-based approach to handle each strftime occurrence
        # The regex pattern just finds "strftime(", then the callback handles paren balancing
        while True:
            match = re.search(r"strftime\s*\(", converted_query, re.IGNORECASE)
            if not match:
                break
            # Found strftime( - now balance parentheses to find the end
            start_pos = match.end()  # Position after "strftime("
            paren_count = 1
            i = start_pos
            while i < len(converted_query) and paren_count > 0:
                if converted_query[i] == '(':
                    paren_count += 1
                elif converted_query[i] == ')':
                    paren_count -= 1
                i += 1
            # Extract the arguments
            args_str = converted_query[start_pos:i-1]
            # Split on first comma after '%Y'
            comma_pos = args_str.find(',')
            if comma_pos > 0:
                inner_expr = args_str[comma_pos+1:].strip()
            else:
                inner_expr = args_str.strip()
            # Replace this occurrence
            replacement = f"EXTRACT(YEAR FROM {inner_expr})::TEXT"
            converted_query = converted_query[:match.start()] + replacement + converted_query[i:]
        
        # 5. Replace DATE() function - SQLite DATE() -> PostgreSQL DATE cast
        # DATE(column) -> column::DATE
        converted_query = re.sub(
            r"DATE\s*\(([^)]+)\)",
            r"\1::DATE",
            converted_query,
            flags=re.IGNORECASE
        )
        
        return converted_query, params
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        if self.db_type == 'postgres':
            conn = connect(self.database_url)
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
            if self.db_type == 'postgres':
                # Use dict_row factory for PostgreSQL
                cursor = conn.cursor(row_factory=dict_row)
            else:
                cursor = conn.cursor()
            
            if converted_params:
                cursor.execute(converted_query, converted_params)
            else:
                cursor.execute(converted_query)
            rows = cursor.fetchall()
            
            # Convert rows to list of dicts
            if self.db_type == 'postgres':
                # dict_row already returns dict-like objects
                return list(rows)
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
            if self.db_type == 'postgres':
                # Use dict_row factory for PostgreSQL
                cursor = conn.cursor(row_factory=dict_row)
            else:
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
