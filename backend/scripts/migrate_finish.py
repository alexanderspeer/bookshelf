#!/usr/bin/env python3
"""
Complete the migration - import remaining data (book_tags, continuations, comparisons, goals)
"""

import sys
import os

database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("ERROR: Set DATABASE_URL")
    sys.exit(1)

os.environ.pop('DATABASE_URL', None)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from database.db import Database

# Export from SQLite
sqlite_db = Database('data/bookshelf.db')

# Get ID mappings
print("Getting ID mappings...")
old_books = sqlite_db.execute_query("SELECT id, title FROM books ORDER BY id")
book_tags = sqlite_db.execute_query("SELECT * FROM book_tags")
continuations = sqlite_db.execute_query("SELECT * FROM thought_continuations ORDER BY id")
comparisons = sqlite_db.execute_query("SELECT * FROM comparisons ORDER BY id")
goals = sqlite_db.execute_query("SELECT * FROM reading_goals ORDER BY id")
old_tags = sqlite_db.execute_query("SELECT id, name FROM tags ORDER BY id")

# Connect to Postgres
os.environ['DATABASE_URL'] = database_url
from importlib import reload
import database.db as db_module
reload(db_module)
postgres_db = db_module.Database()

# Get new IDs from Postgres
new_books = postgres_db.execute_query("SELECT id, title FROM books ORDER BY title")
new_tags = postgres_db.execute_query("SELECT id, name FROM tags ORDER BY name")

# Create mappings
book_map = {}
for old_book in old_books:
    for new_book in new_books:
        if old_book['title'] == new_book['title']:
            book_map[old_book['id']] = new_book['id']
            break

tag_map = {}
for old_tag in old_tags:
    for new_tag in new_tags:
        if old_tag['name'] == new_tag['name']:
            tag_map[old_tag['id']] = new_tag['id']
            break

print(f"Mapped {len(book_map)} books and {len(tag_map)} tags")

# Import book_tags
print("Importing book_tags...")
with postgres_db.get_connection() as conn:
    cursor = conn.cursor()
    count = 0
    for bt in book_tags:
        new_book_id = book_map.get(bt['book_id'])
        new_tag_id = tag_map.get(bt['tag_id'])
        if new_book_id and new_tag_id:
            cursor.execute(
                "INSERT INTO book_tags (book_id, tag_id, created_at) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (new_book_id, new_tag_id, bt.get('created_at'))
            )
            count += 1
print(f"  ✓ Imported {count} book-tag relationships")

# Import continuations
print("Importing continuations...")
with postgres_db.get_connection() as conn:
    cursor = conn.cursor()
    count = 0
    for cont in continuations:
        new_from = book_map.get(cont['from_book_id'])
        new_to = book_map.get(cont['to_book_id'])
        if new_from and new_to:
            cursor.execute(
                "INSERT INTO thought_continuations (from_book_id, to_book_id, created_at) VALUES (%s, %s, %s)",
                (new_from, new_to, cont.get('created_at'))
            )
            count += 1
print(f"  ✓ Imported {count} continuations")

# Import comparisons
print("Importing comparisons...")
with postgres_db.get_connection() as conn:
    cursor = conn.cursor()
    count = 0
    for comp in comparisons:
        new_a = book_map.get(comp['book_a_id'])
        new_b = book_map.get(comp['book_b_id'])
        new_winner = book_map.get(comp['winner_id'])
        if new_a and new_b and new_winner:
            cursor.execute(
                "INSERT INTO comparisons (book_a_id, book_b_id, winner_id, created_at) VALUES (%s, %s, %s, %s)",
                (new_a, new_b, new_winner, comp.get('created_at'))
            )
            count += 1
print(f"  ✓ Imported {count} comparisons")

# Import goals
print("Importing goals...")
with postgres_db.get_connection() as conn:
    cursor = conn.cursor()
    count = 0
    for goal in goals:
        cursor.execute(
            "INSERT INTO reading_goals (year, target_count, period, created_at) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
            (goal['year'], goal['target_count'], goal['period'], goal.get('created_at'))
        )
        count += 1
print(f"  ✓ Imported {count} goals")

print("\n✓✓✓ Migration complete!")

