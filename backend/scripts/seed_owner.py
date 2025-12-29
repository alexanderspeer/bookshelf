#!/usr/bin/env python3
"""
Seed script to create owner user and migrate existing books.

This script:
1. Creates an owner user from OWNER_EMAIL and OWNER_PASSWORD env vars
2. Migrates all existing books (without user_id) to belong to the owner
3. Optionally sets books as public (default: private for safety)

Usage:
    python backend/scripts/seed_owner.py [--make-public]

On Heroku:
    heroku run -a bookshelf-hermes python backend/scripts/seed_owner.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import from backend
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from database.db import get_db
from services.auth_service import get_auth_service

# Load environment variables
load_dotenv()


def seed_owner(make_public=False):
    """Create owner user and migrate existing books"""
    
    # Get env vars
    owner_email = os.getenv('OWNER_EMAIL')
    owner_password = os.getenv('OWNER_PASSWORD')
    
    if not owner_email or not owner_password:
        print("ERROR: OWNER_EMAIL and OWNER_PASSWORD environment variables must be set")
        sys.exit(1)
    
    print(f"Starting seed process for owner: {owner_email}")
    
    db = get_db()
    auth_service = get_auth_service()
    
    # Check if owner user already exists
    existing_user = auth_service.get_user_by_email(owner_email)
    
    if existing_user:
        print(f"✓ Owner user already exists (ID: {existing_user['id']})")
        owner_id = existing_user['id']
    else:
        # Create owner user
        try:
            user = auth_service.create_user(owner_email, owner_password)
            owner_id = user['id']
            print(f"✓ Created owner user (ID: {owner_id})")
        except Exception as e:
            print(f"ERROR creating owner user: {e}")
            sys.exit(1)
    
    # Check for books without user_id (need migration)
    orphan_books_query = "SELECT COUNT(*) as count FROM books WHERE user_id IS NULL"
    try:
        result = db.execute_query(orphan_books_query)
        orphan_count = result[0]['count'] if result else 0
    except Exception:
        # Column might not exist in old schema
        print("Note: user_id column not found - schema needs to be updated")
        orphan_count = 0
    
    if orphan_count > 0:
        print(f"\nFound {orphan_count} books without owner, migrating...")
        
        # Migrate orphan books to owner
        migrate_query = """
            UPDATE books 
            SET user_id = ?, is_public = ?
            WHERE user_id IS NULL
        """
        
        try:
            db.execute_update(migrate_query, (owner_id, make_public))
            print(f"✓ Migrated {orphan_count} books to owner (public: {make_public})")
        except Exception as e:
            print(f"ERROR migrating books: {e}")
            sys.exit(1)
    else:
        print("\nNo orphan books found - all books have owners")
    
    # Print summary
    print("\n" + "="*50)
    print("SEED COMPLETE")
    print("="*50)
    print(f"Owner Email: {owner_email}")
    print(f"Owner ID: {owner_id}")
    
    # Count owner's books
    try:
        books_query = "SELECT COUNT(*) as count FROM books WHERE user_id = ?"
        result = db.execute_query(books_query, (owner_id,))
        total_books = result[0]['count'] if result else 0
        print(f"Total Books: {total_books}")
        
        if make_public:
            public_query = "SELECT COUNT(*) as count FROM books WHERE user_id = ? AND is_public = ?"
            result = db.execute_query(public_query, (owner_id, True))
            public_books = result[0]['count'] if result else 0
            print(f"Public Books: {public_books}")
    except Exception as e:
        print(f"Note: Could not count books: {e}")
    
    print("\nNext steps:")
    print("1. Ensure OWNER_EMAIL and OWNER_PASSWORD are set in production")
    print("2. To make books public, use --make-public flag or update via UI")
    print("3. Public bookshelf available at: /public")


if __name__ == '__main__':
    # Check for --make-public flag
    make_public = '--make-public' in sys.argv
    
    if make_public:
        print("WARNING: --make-public flag set. Existing books will be PUBLIC.")
        confirm = input("Continue? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Aborted.")
            sys.exit(0)
    else:
        print("Books will be PRIVATE by default (safer).")
        print("Use --make-public flag to make existing books public.\n")
    
    seed_owner(make_public=make_public)

