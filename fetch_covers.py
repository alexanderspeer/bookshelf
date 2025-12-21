#!/usr/bin/env python3
"""
Fetch cover images for books from Open Library and save them locally.
"""

import os
import sys
import requests
import time
from PIL import Image
from io import BytesIO

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from backend.database.db import get_db

def fetch_cover_from_open_library(isbn=None, olid=None):
    """
    Fetch cover image from Open Library
    Returns image bytes if found, None otherwise
    """
    base_url = "https://covers.openlibrary.org/b/"
    
    # Try ISBN first (preferred)
    if isbn:
        for size in ['L', 'M']:  # Try large first, then medium
            url = f"{base_url}isbn/{isbn}-{size}.jpg"
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200 and len(response.content) > 1000:  # Not a placeholder
                    return response.content
            except:
                continue
    
    # Try OLID if ISBN didn't work
    if olid:
        # Extract the ID from the key like "/works/OL45804W"
        if '/' in olid:
            olid = olid.split('/')[-1]
        
        for size in ['L', 'M']:
            url = f"{base_url}olid/{olid}-{size}.jpg"
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200 and len(response.content) > 1000:
                    return response.content
            except:
                continue
    
    return None

def save_cover_image(image_bytes, book_id, title, db):
    """
    Save cover image locally, update database, and return the relative path
    """
    # Create spine_images directory if it doesn't exist
    spine_dir = "backend/data/spine_images"
    os.makedirs(spine_dir, exist_ok=True)
    
    # Create a safe filename
    safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_title = safe_title.replace(' ', '_')[:50]  # Limit length
    filename = f"book_{book_id}_{safe_title}.jpg"
    filepath = os.path.join(spine_dir, filename)
    
    # Save the image
    try:
        image = Image.open(BytesIO(image_bytes))
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        image.save(filepath, 'JPEG', quality=85)
        
        # Update database immediately after saving
        db.execute_update(
            "UPDATE books SET spine_image_path = ? WHERE id = ?",
            (filename, book_id)
        )
        
        return filename
    except Exception as e:
        print(f"    Error saving/updating image: {e}")
        return None

def fetch_covers_for_books():
    """
    Fetch covers for all books that don't have spine images
    """
    db = get_db()
    
    # Get books without spine images
    books = db.execute_query("""
        SELECT id, title, author, isbn, isbn13, cover_image_url
        FROM books 
        WHERE spine_image_path IS NULL
        ORDER BY id
    """)
    
    print(f"Found {len(books)} books without spine images\n")
    
    success_count = 0
    failed_count = 0
    
    for i, book in enumerate(books, 1):
        book_id = book['id']
        title = book['title']
        author = book['author']
        isbn13 = book['isbn13']
        isbn = book['isbn']
        cover_url = book['cover_image_url']
        
        print(f"[{i}/{len(books)}] {title} by {author}")
        
        # Try to fetch cover
        image_bytes = None
        
        # First try: ISBN13
        if isbn13:
            print(f"  Trying ISBN-13: {isbn13}")
            image_bytes = fetch_cover_from_open_library(isbn=isbn13)
        
        # Second try: ISBN
        if not image_bytes and isbn:
            print(f"  Trying ISBN: {isbn}")
            image_bytes = fetch_cover_from_open_library(isbn=isbn)
        
        # Third try: Use the cover_image_url from Open Library if it exists
        if not image_bytes and cover_url and 'covers.openlibrary.org' in cover_url:
            print(f"  Trying cover URL from database")
            try:
                response = requests.get(cover_url, timeout=10)
                if response.status_code == 200 and len(response.content) > 1000:
                    image_bytes = response.content
            except:
                pass
        
        if image_bytes:
            # Save the image and update database
            filename = save_cover_image(image_bytes, book_id, title, db)
            if filename:
                print(f"  ✓ Saved cover: {filename}")
                success_count += 1
            else:
                print(f"  ✗ Failed to save image")
                failed_count += 1
        else:
            print(f"  ✗ No cover found")
            failed_count += 1
        
        # Be nice to Open Library API
        time.sleep(0.3)
    
    print(f"\n{'='*60}")
    print(f"Cover fetch complete!")
    print(f"  ✓ Successfully fetched: {success_count}")
    print(f"  ✗ Not found: {failed_count}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    print("=" * 60)
    print("Bookshelf Cover Fetcher")
    print("=" * 60)
    print()
    
    fetch_covers_for_books()

