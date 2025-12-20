#!/usr/bin/env python3
"""
Import books from books.json into the bookshelf database.
This script fetches metadata from Open Library and creates proper entries.
"""

import json
import sys
import os
import time
import requests
from datetime import datetime
from dateutil import parser as date_parser

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.database.db import get_db

def fetch_book_metadata(title, author=None):
    """Fetch book metadata from Open Library"""
    try:
        search_query = f"{title} {author}" if author else title
        url = "https://openlibrary.org/search.json"
        params = {"q": search_query, "limit": 5}
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("docs"):
            return []
        
        results = []
        for book in data["docs"]:
            # Extract ISBNs
            isbn_list = book.get("isbn", [])
            isbn = isbn_list[0] if isbn_list else None
            isbn13 = None
            
            for isbn_val in isbn_list:
                if len(isbn_val) == 13:
                    isbn13 = isbn_val
                    break
            
            # Extract author
            authors = book.get("author_name", [])
            book_author = authors[0] if authors else ""
            
            # Extract publication date
            publish_year = book.get("first_publish_year")
            
            # Get cover image
            cover_id = book.get("cover_i")
            cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None
            
            results.append({
                "title": book.get("title", ""),
                "author": book_author,
                "isbn": isbn,
                "isbn13": isbn13,
                "published_date": str(publish_year) if publish_year else None,
                "publisher": book.get("publisher", [None])[0] if book.get("publisher") else None,
                "page_count": book.get("number_of_pages_median"),
                "description": None,
                "cover_url": cover_url,
                "ol_work_id": book.get("key", "")
            })
        
        return results
    except Exception as e:
        print(f"    Error fetching metadata: {e}")
        return []

def parse_date(date_str):
    """Parse various date formats from Goodreads export"""
    if not date_str or date_str.lower() == 'not set':
        return None
    
    try:
        # Try parsing with dateutil
        parsed = date_parser.parse(date_str, fuzzy=True)
        return parsed.strftime('%Y-%m-%d')
    except:
        # If it fails, try to extract year
        if len(date_str) == 4 and date_str.isdigit():
            return f"{date_str}-01-01"
        return None

def clean_title(title):
    """Remove series information from title"""
    # Remove patterns like "(Series Name, #1)"
    import re
    cleaned = re.sub(r'\s*\([^)]*#\d+\)', '', title)
    return cleaned.strip()

def get_star_rating(position):
    """Get star rating based on position in ranked list"""
    if position <= 31:
        return 5.0
    elif position <= 81:
        return 4.0
    elif position <= 120:
        return 3.0
    elif position <= 136:
        return 2.0
    else:
        return 1.0

def import_books(json_path):
    """Import books from JSON file"""
    
    # Load JSON
    print(f"Loading books from {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    books = data.get('books', [])
    print(f"Found {len(books)} books to import\n")
    
    # Initialize database with explicit path
    db_path = os.path.join(os.path.dirname(__file__), 'backend', 'data', 'bookshelf.db')
    print(f"Using database: {db_path}\n")
    
    from backend.database.db import Database
    db = Database(db_path)
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for i, book_data in enumerate(books, 1):
        title = book_data.get('title', '')
        author = book_data.get('author', '')
        date_read = book_data.get('date_read', 'not set')
        
        # Get star rating based on position
        star_rating = get_star_rating(i)
        
        print(f"\n[{i}/{len(books)}] Processing: {title} by {author} ({star_rating} stars)")
        
        # Clean title (remove series info)
        clean_title_str = clean_title(title)
        
        try:
            # Check if book already exists
            existing = db.execute_query(
                "SELECT id FROM books WHERE title = ? AND author = ?",
                (title, author)
            )
            
            if existing:
                print(f"  ⚠️  Already in database, skipping")
                skip_count += 1
                continue
            
            # Fetch metadata from Open Library
            print(f"  🔍 Searching Open Library for metadata...")
            metadata_results = fetch_book_metadata(clean_title_str, author)
            
            if not metadata_results or len(metadata_results) == 0:
                print(f"  ⚠️  No metadata found, adding with basic info")
                # Add book with just the basic info we have
                book_id = db.execute_update(
                    """INSERT INTO books (
                        title, author, created_at
                    ) VALUES (?, ?, ?)""",
                    (title, author, datetime.now().isoformat())
                )
            else:
                # Use first result
                metadata = metadata_results[0]
                print(f"  ✓ Found metadata: {metadata.get('title')}")
                
                # Insert book
                book_id = db.execute_update(
                    """INSERT INTO books (
                        title, author, isbn, isbn13, 
                        pub_date, num_pages,
                        cover_image_url, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        title,  # Keep original title with series info
                        author,
                        metadata.get('isbn'),
                        metadata.get('isbn13'),
                        metadata.get('published_date'),
                        metadata.get('page_count'),
                        metadata.get('cover_url'),
                        datetime.now().isoformat()
                    )
                )
            
            # All books from Goodreads export are already read
            # Date is optional - some books just don't have completion dates recorded
            state = 'read'
            parsed_date = parse_date(date_read)
            date_finished = parsed_date  # Will be None if date couldn't be parsed
            
            # Add to reading states
            db.execute_update(
                """INSERT INTO reading_states (
                    book_id, state, created_at
                ) VALUES (?, ?, ?)""",
                (
                    book_id,
                    state,
                    datetime.now().isoformat()
                )
            )
            
            # Update book with date_finished if applicable
            if date_finished:
                db.execute_update(
                    "UPDATE books SET date_finished = ? WHERE id = ?",
                    (date_finished, book_id)
                )
            
            # Add to rankings table with star rating and position
            db.execute_update(
                """INSERT INTO rankings (
                    book_id, rank_position, initial_stars, created_at
                ) VALUES (?, ?, ?, ?)""",
                (book_id, i, star_rating, datetime.now().isoformat())
            )
            
            print(f"  ✓ Added to '{state}' shelf" + (f" (finished: {date_finished})" if date_finished else "") + f" [Rank: {i}, Stars: {star_rating}]")
            success_count += 1
            
            # Rate limit to be nice to Open Library API
            time.sleep(0.5)
            
        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            error_count += 1
            continue
    
    print(f"\n{'='*60}")
    print(f"Import complete!")
    print(f"  ✓ Successfully imported: {success_count}")
    print(f"  ⚠️  Skipped (already exists): {skip_count}")
    print(f"  ❌ Errors: {error_count}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    json_file = 'books.json'
    
    if not os.path.exists(json_file):
        print(f"Error: {json_file} not found!")
        print("Please make sure books.json is in the project root directory.")
        sys.exit(1)
    
    print("=" * 60)
    print("Bookshelf Import Script")
    print("=" * 60)
    print()
    
    import_books(json_file)

