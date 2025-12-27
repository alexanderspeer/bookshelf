#!/usr/bin/env python3
"""
Migrate data from local SQLite database to Heroku Postgres.
This script exports all data from SQLite and imports it to Postgres.
"""

import sys
import os
import json

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database.db import Database

def export_from_sqlite(sqlite_path):
    """Export all data from SQLite database"""
    print(f"Connecting to SQLite database: {sqlite_path}")
    db = Database(sqlite_path)
    
    data = {}
    
    # Export books
    print("Exporting books...")
    data['books'] = db.execute_query("SELECT * FROM books ORDER BY id")
    print(f"  Found {len(data['books'])} books")
    
    # Export reading_states
    print("Exporting reading states...")
    data['reading_states'] = db.execute_query("SELECT * FROM reading_states ORDER BY id")
    print(f"  Found {len(data['reading_states'])} reading states")
    
    # Export rankings
    print("Exporting rankings...")
    data['rankings'] = db.execute_query("SELECT * FROM rankings ORDER BY id")
    print(f"  Found {len(data['rankings'])} rankings")
    
    # Export comparisons
    print("Exporting comparisons...")
    data['comparisons'] = db.execute_query("SELECT * FROM comparisons ORDER BY id")
    print(f"  Found {len(data['comparisons'])} comparisons")
    
    # Export tags
    print("Exporting tags...")
    data['tags'] = db.execute_query("SELECT * FROM tags ORDER BY id")
    print(f"  Found {len(data['tags'])} tags")
    
    # Export book_tags
    print("Exporting book-tag relationships...")
    data['book_tags'] = db.execute_query("SELECT * FROM book_tags")
    print(f"  Found {len(data['book_tags'])} book-tag relationships")
    
    # Export thought_continuations
    print("Exporting thought continuations...")
    data['thought_continuations'] = db.execute_query("SELECT * FROM thought_continuations ORDER BY id")
    print(f"  Found {len(data['thought_continuations'])} continuations")
    
    # Export reading_goals
    print("Exporting reading goals...")
    data['reading_goals'] = db.execute_query("SELECT * FROM reading_goals ORDER BY id")
    print(f"  Found {len(data['reading_goals'])} goals")
    
    # Export import_history
    print("Exporting import history...")
    data['import_history'] = db.execute_query("SELECT * FROM import_history ORDER BY id")
    print(f"  Found {len(data['import_history'])} import records")
    
    return data

def import_to_postgres(database_url, data):
    """Import all data to Postgres database"""
    print(f"\nConnecting to Postgres database...")
    
    # Temporarily set DATABASE_URL
    original_url = os.environ.get('DATABASE_URL')
    os.environ['DATABASE_URL'] = database_url
    
    # Force db module to reload to pick up new DATABASE_URL
    from importlib import reload
    import database.db as db_module
    reload(db_module)
    
    db = db_module.Database()
    
    try:
        # Import books
        print("\nImporting books...")
        for book in data['books']:
            # Remove id to let Postgres auto-generate
            book_data = {k: v for k, v in book.items() if k != 'id'}
            old_id = book['id']
            
            query = """
                INSERT INTO books (
                    title, author, isbn, isbn13, pub_date, num_pages, genre,
                    cover_image_url, spine_image_path, dimensions, dom_color,
                    series, series_position, notes, why_reading,
                    date_added, date_started, date_finished, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            new_id = db.execute_update(query, (
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
                book_data.get('dom_color'),
                book_data.get('series'),
                book_data.get('series_position'),
                book_data.get('notes'),
                book_data.get('why_reading'),
                book_data.get('date_added'),
                book_data.get('date_started'),
                book_data.get('date_finished'),
                book_data.get('created_at'),
                book_data.get('updated_at')
            ))
            # Store mapping of old ID to new ID
            if not hasattr(import_to_postgres, 'book_id_map'):
                import_to_postgres.book_id_map = {}
            import_to_postgres.book_id_map[old_id] = new_id
        
        print(f"  Imported {len(data['books'])} books")
        
        # Import reading_states (using new book IDs)
        print("Importing reading states...")
        for state in data['reading_states']:
            old_book_id = state['book_id']
            new_book_id = import_to_postgres.book_id_map.get(old_book_id)
            if new_book_id:
                query = """
                    INSERT INTO reading_states (book_id, state, position, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                """
                db.execute_update(query, (
                    new_book_id,
                    state['state'],
                    state.get('position', 0),
                    state.get('created_at'),
                    state.get('updated_at')
                ))
        print(f"  Imported {len(data['reading_states'])} reading states")
        
        # Import rankings (using new book IDs)
        print("Importing rankings...")
        for rank in data['rankings']:
            old_book_id = rank['book_id']
            new_book_id = import_to_postgres.book_id_map.get(old_book_id)
            if new_book_id:
                query = """
                    INSERT INTO rankings (book_id, rank_position, initial_stars, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                """
                db.execute_update(query, (
                    new_book_id,
                    rank['rank_position'],
                    rank.get('initial_stars'),
                    rank.get('created_at'),
                    rank.get('updated_at')
                ))
        print(f"  Imported {len(data['rankings'])} rankings")
        
        # Import tags
        print("Importing tags...")
        tag_id_map = {}
        for tag in data['tags']:
            old_id = tag['id']
            query = "INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)"
            new_id = db.execute_update(query, (
                tag['name'],
                tag.get('color'),
                tag.get('created_at')
            ))
            tag_id_map[old_id] = new_id
        print(f"  Imported {len(data['tags'])} tags")
        
        # Import book_tags (using new IDs)
        print("Importing book-tag relationships...")
        for bt in data['book_tags']:
            old_book_id = bt['book_id']
            old_tag_id = bt['tag_id']
            new_book_id = import_to_postgres.book_id_map.get(old_book_id)
            new_tag_id = tag_id_map.get(old_tag_id)
            if new_book_id and new_tag_id:
                query = "INSERT INTO book_tags (book_id, tag_id, created_at) VALUES (?, ?, ?)"
                db.execute_update(query, (new_book_id, new_tag_id, bt.get('created_at')))
        print(f"  Imported {len(data['book_tags'])} book-tag relationships")
        
        # Import thought_continuations (using new book IDs)
        print("Importing thought continuations...")
        for cont in data['thought_continuations']:
            old_from = cont['from_book_id']
            old_to = cont['to_book_id']
            new_from = import_to_postgres.book_id_map.get(old_from)
            new_to = import_to_postgres.book_id_map.get(old_to)
            if new_from and new_to:
                query = """
                    INSERT INTO thought_continuations (from_book_id, to_book_id, created_at)
                    VALUES (?, ?, ?)
                """
                db.execute_update(query, (new_from, new_to, cont.get('created_at')))
        print(f"  Imported {len(data['thought_continuations'])} continuations")
        
        # Import comparisons (using new book IDs)
        print("Importing comparisons...")
        for comp in data['comparisons']:
            old_a = comp['book_a_id']
            old_b = comp['book_b_id']
            old_winner = comp['winner_id']
            new_a = import_to_postgres.book_id_map.get(old_a)
            new_b = import_to_postgres.book_id_map.get(old_b)
            new_winner = import_to_postgres.book_id_map.get(old_winner)
            if new_a and new_b and new_winner:
                query = """
                    INSERT INTO comparisons (book_a_id, book_b_id, winner_id, created_at)
                    VALUES (?, ?, ?, ?)
                """
                db.execute_update(query, (new_a, new_b, new_winner, comp.get('created_at')))
        print(f"  Imported {len(data['comparisons'])} comparisons")
        
        # Import reading_goals
        print("Importing reading goals...")
        for goal in data['reading_goals']:
            query = """
                INSERT INTO reading_goals (year, target_count, period, created_at)
                VALUES (?, ?, ?, ?)
            """
            db.execute_update(query, (
                goal['year'],
                goal['target_count'],
                goal['period'],
                goal.get('created_at')
            ))
        print(f"  Imported {len(data['reading_goals'])} goals")
        
        # Import import_history
        print("Importing import history...")
        for imp in data['import_history']:
            query = """
                INSERT INTO import_history (source, books_imported, import_date)
                VALUES (?, ?, ?)
            """
            db.execute_update(query, (
                imp['source'],
                imp.get('books_imported'),
                imp.get('import_date')
            ))
        print(f"  Imported {len(data['import_history'])} import records")
        
        print("\n✓ All data imported successfully!")
        
    finally:
        # Restore original DATABASE_URL
        if original_url:
            os.environ['DATABASE_URL'] = original_url
        else:
            os.environ.pop('DATABASE_URL', None)

def main():
    print("=" * 60)
    print("SQLite to Postgres Data Migration")
    print("=" * 60)
    
    # Check for SQLite database
    sqlite_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'bookshelf.db')
    if not os.path.exists(sqlite_path):
        print(f"\n❌ Error: SQLite database not found at {sqlite_path}")
        print("Please ensure your local database exists before migrating.")
        return 1
    
    # Get Heroku database URL
    database_url = input("\nEnter Heroku DATABASE_URL (or press Enter to use environment variable): ").strip()
    if not database_url:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("\n❌ Error: DATABASE_URL not found in environment")
            print("Get it with: heroku config:get DATABASE_URL -a bookshelf-hermes")
            return 1
    
    print(f"\nUsing DATABASE_URL: {database_url[:30]}...")
    
    confirm = input("\nThis will import data to Heroku Postgres. Continue? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Migration cancelled.")
        return 0
    
    # Export from SQLite
    print("\n" + "=" * 60)
    print("STEP 1: Export from SQLite")
    print("=" * 60)
    data = export_from_sqlite(sqlite_path)
    
    # Import to Postgres
    print("\n" + "=" * 60)
    print("STEP 2: Import to Postgres")
    print("=" * 60)
    import_to_postgres(database_url, data)
    
    print("\n" + "=" * 60)
    print("Migration Complete!")
    print("=" * 60)
    print("\nYour books are now on Heroku!")
    print("Visit: https://bookshelf-hermes-4f6d58f1165f.herokuapp.com/")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

