#!/usr/bin/env python3
"""
Initialize PostgreSQL schema on Heroku release phase.
Runs automatically before app starts. Idempotent - safe to run multiple times.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def main():
    print("=" * 60)
    print("PostgreSQL Schema Initialization")
    print("=" * 60)
    
    # Only run if DATABASE_URL is set (Postgres mode)
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("\nNo DATABASE_URL found - skipping schema initialization")
        print("(SQLite mode - schema auto-created)")
        return 0
    
    print(f"\nDATABASE_URL detected: {database_url[:30]}...")
    
    try:
        # Import psycopg directly for schema initialization
        from psycopg import connect
        
        # Read schema file
        schema_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'schema_postgres.sql')
        
        if not os.path.exists(schema_path):
            print(f"\n❌ ERROR: Schema file not found at {schema_path}")
            return 1
        
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        print("\n1. Connecting to PostgreSQL database...")
        conn = connect(database_url)
        
        print("2. Checking if schema already exists...")
        cursor = conn.cursor()
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            ) as exists
        """)
        schema_exists = cursor.fetchone()[0]
        
        if schema_exists:
            print("   ✓ Schema already exists - skipping initialization")
        else:
            print("   → Schema not found - initializing...")
            print("3. Applying schema...")
            
            # Execute schema SQL
            cursor.execute(schema_sql)
            conn.commit()
            
            print("   ✓ Schema applied successfully")
        
        # Verify critical tables exist
        print("\n4. Verifying critical tables...")
        critical_tables = [
            'users', 'books', 'reading_states', 'rankings', 
            'comparisons', 'tags', 'book_tags', 
            'thought_continuations', 'reading_goals', 'import_history'
        ]
        
        for table in critical_tables:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                ) as exists
            """, (table,))
            exists = cursor.fetchone()[0]
            
            if not exists:
                print(f"   ❌ ERROR: Table '{table}' not found!")
                conn.close()
                return 1
            
            print(f"   ✓ Table '{table}' exists")
        
        conn.close()
        
        print("\n" + "=" * 60)
        print("Schema initialization complete!")
        print("=" * 60)
        return 0
        
    except ImportError as e:
        print(f"\n❌ ERROR: psycopg not installed: {e}")
        print("Add psycopg[binary]>=3.1.0 to requirements.txt")
        return 1
    except Exception as e:
        print(f"\n❌ ERROR: Schema initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())

