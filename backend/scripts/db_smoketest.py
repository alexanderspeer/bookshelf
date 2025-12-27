#!/usr/bin/env python3
"""
Database smoke test for Heroku Postgres deployment.
Tests basic database connectivity and schema integrity.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database.db import get_db

def main():
    print("=" * 60)
    print("Database Smoke Test")
    print("=" * 60)
    
    # Check environment
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        print(f"\nUsing DATABASE_URL: {database_url[:30]}...")
    else:
        print("\nNo DATABASE_URL found, using local SQLite")
    
    try:
        # Initialize database connection
        print("\n1. Testing database connection...")
        db = get_db()
        print("   ✓ Database connection initialized")
        
        # Test basic query
        print("\n2. Testing basic query (SELECT 1)...")
        result = db.execute_query("SELECT 1 as test")
        assert result[0]['test'] == 1
        print("   ✓ Basic query works")
        
        # Check if books table exists
        print("\n3. Checking if 'books' table exists...")
        if db.db_type == 'postgres':
            table_check = db.execute_query("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'books'
                ) as exists
            """)
            exists = table_check[0]['exists']
        else:
            table_check = db.execute_query("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='books'
            """)
            exists = len(table_check) > 0
        
        assert exists, "books table does not exist"
        print("   ✓ 'books' table exists")
        
        # Test INSERT
        print("\n4. Testing INSERT operation...")
        book_id = db.execute_update("""
            INSERT INTO books (title, author, created_at, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, ('Test Book - SMOKE TEST', 'Test Author'))
        
        assert book_id is not None and book_id > 0
        print(f"   ✓ INSERT works (created book id={book_id})")
        
        # Test SELECT
        print("\n5. Testing SELECT operation...")
        books = db.execute_query("""
            SELECT id, title, author FROM books WHERE id = ?
        """, (book_id,))
        
        assert len(books) == 1
        assert books[0]['title'] == 'Test Book - SMOKE TEST'
        assert books[0]['author'] == 'Test Author'
        print(f"   ✓ SELECT works (found book: '{books[0]['title']}')")
        
        # Test UPDATE
        print("\n6. Testing UPDATE operation...")
        db.execute_update("""
            UPDATE books SET author = ? WHERE id = ?
        """, ('Updated Author', book_id))
        
        updated = db.execute_query("""
            SELECT author FROM books WHERE id = ?
        """, (book_id,))
        
        assert updated[0]['author'] == 'Updated Author'
        print("   ✓ UPDATE works")
        
        # Test reading state (test foreign key and insert)
        print("\n7. Testing reading_states table...")
        db.execute_update("""
            INSERT INTO reading_states (book_id, state, created_at, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (book_id, 'want_to_read'))
        print("   ✓ reading_states INSERT works")
        
        # Clean up - Test DELETE
        print("\n8. Testing DELETE operation (cleanup)...")
        db.execute_update("DELETE FROM books WHERE id = ?", (book_id,))
        
        deleted = db.execute_query("SELECT * FROM books WHERE id = ?", (book_id,))
        assert len(deleted) == 0
        print("   ✓ DELETE works (test data cleaned up)")
        
        # Test all critical tables exist
        print("\n9. Checking all critical tables exist...")
        critical_tables = [
            'books', 'reading_states', 'rankings', 'comparisons',
            'tags', 'book_tags', 'thought_continuations', 
            'reading_goals', 'import_history'
        ]
        
        for table in critical_tables:
            if db.db_type == 'postgres':
                check = db.execute_query("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = ?
                    ) as exists
                """, (table,))
                exists = check[0]['exists']
            else:
                check = db.execute_query("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name=?
                """, (table,))
                exists = len(check) > 0
            
            assert exists, f"Table {table} does not exist"
            print(f"   ✓ Table '{table}' exists")
        
        print("\n" + "=" * 60)
        print("All smoke tests passed!")
        print("=" * 60)
        return 0
        
    except Exception as e:
        print(f"\n❌ Smoke test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())

