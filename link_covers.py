#!/usr/bin/env python3
"""
Link downloaded cover images to books in the database
"""
import os
import sys
import sqlite3

spine_dir = "backend/data/spine_images"
db_path = "backend/data/bookshelf.db"

# Connect directly to ensure commits work
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all image files
image_files = [f for f in os.listdir(spine_dir) if f.endswith('.jpg')]
print(f"Found {len(image_files)} image files")

updated = 0
for filename in image_files:
    # Extract book ID from filename (format: book_ID_title.jpg)
    try:
        book_id = int(filename.split('_')[1])
        cursor.execute(
            "UPDATE books SET spine_image_path = ? WHERE id = ?",
            (filename, book_id)
        )
        updated += 1
    except Exception as e:
        print(f"Could not parse filename: {filename} - {e}")
        continue

# Commit changes
conn.commit()
print(f"Updated {updated} books with spine image paths")

# Verify
cursor.execute("SELECT COUNT(*) as c FROM books WHERE spine_image_path IS NOT NULL")
count = cursor.fetchone()[0]
print(f"Total books with covers in database: {count}")

conn.close()

