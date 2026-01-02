#!/usr/bin/env python3
"""
Quick migration script - just run with DATABASE_URL set
"""

import sys
import os

# Store DATABASE_URL and temporarily remove it
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("ERROR: Set DATABASE_URL environment variable")
    sys.exit(1)

# Remove DATABASE_URL temporarily for SQLite
os.environ.pop('DATABASE_URL', None)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database.db import Database

# SQLite path
sqlite_path = 'data/bookshelf.db'

print(f"SQLite: {sqlite_path}")
print(f"Postgres: {database_url[:40]}...")
print()

# Export from SQLite (DATABASE_URL not set, will use SQLite)
print("Exporting from SQLite...")
sqlite_db = Database(sqlite_path)

books = sqlite_db.execute_query("SELECT * FROM books ORDER BY id")
states = sqlite_db.execute_query("SELECT * FROM reading_states ORDER BY id")
rankings = sqlite_db.execute_query("SELECT * FROM rankings ORDER BY id")
tags = sqlite_db.execute_query("SELECT * FROM tags ORDER BY id")
book_tags = sqlite_db.execute_query("SELECT * FROM book_tags")
continuations = sqlite_db.execute_query("SELECT * FROM thought_continuations ORDER BY id")
comparisons = sqlite_db.execute_query("SELECT * FROM comparisons ORDER BY id")
goals = sqlite_db.execute_query("SELECT * FROM reading_goals ORDER BY id")

print(f"  Books: {len(books)}")
print(f"  States: {len(states)}")
print(f"  Rankings: {len(rankings)}")
print(f"  Tags: {len(tags)}")
print(f"  Book-Tags: {len(book_tags)}")
print(f"  Continuations: {len(continuations)}")
print(f"  Comparisons: {len(comparisons)}")
print(f"  Goals: {len(goals)}")
print()

# Import to Postgres
print("Importing to Postgres...")

# Now set DATABASE_URL back for Postgres
os.environ['DATABASE_URL'] = database_url

# Reload the db module to pick up new DATABASE_URL
from importlib import reload
import database.db as db_module
reload(db_module)

postgres_db = db_module.Database()  # Will use DATABASE_URL

book_id_map = {}
tag_id_map = {}

# Import books
for book in books:
    old_id = book['id']
    query = """
        INSERT INTO books (
            title, author, isbn, isbn13, pub_date, num_pages, genre,
            cover_image_url, dimensions, dom_color,
            series, series_position, notes, why_reading,
            date_added, date_started, date_finished, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    new_id = postgres_db.execute_update(query, (
        book.get('title'), book.get('author'), book.get('isbn'), book.get('isbn13'),
        book.get('pub_date'), book.get('num_pages'), book.get('genre'),
        book.get('cover_image_url'),
        book.get('dimensions'), book.get('dom_color'), book.get('series'),
        book.get('series_position'), book.get('notes'), book.get('why_reading'),
        book.get('date_added'), book.get('date_started'), book.get('date_finished'),
        book.get('created_at'), book.get('updated_at')
    ))
    book_id_map[old_id] = new_id

print(f"  ✓ Imported {len(books)} books")

# Import reading states
for state in states:
    new_book_id = book_id_map.get(state['book_id'])
    if new_book_id:
        query = "INSERT INTO reading_states (book_id, state, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        postgres_db.execute_update(query, (new_book_id, state['state'], state.get('position', 0), state.get('created_at'), state.get('updated_at')))

print(f"  ✓ Imported {len(states)} reading states")

# Import rankings
for rank in rankings:
    new_book_id = book_id_map.get(rank['book_id'])
    if new_book_id:
        query = "INSERT INTO rankings (book_id, rank_position, initial_stars, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        postgres_db.execute_update(query, (new_book_id, rank['rank_position'], rank.get('initial_stars'), rank.get('created_at'), rank.get('updated_at')))

print(f"  ✓ Imported {len(rankings)} rankings")

# Import tags
for tag in tags:
    old_id = tag['id']
    query = "INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)"
    new_id = postgres_db.execute_update(query, (tag['name'], tag.get('color'), tag.get('created_at')))
    tag_id_map[old_id] = new_id

print(f"  ✓ Imported {len(tags)} tags")

# Import book_tags
count = 0
for bt in book_tags:
    new_book_id = book_id_map.get(bt['book_id'])
    new_tag_id = tag_id_map.get(bt['tag_id'])
    if new_book_id and new_tag_id:
        # Use raw SQL to avoid RETURNING id issue with junction table
        query = "INSERT INTO book_tags (book_id, tag_id, created_at) VALUES (%s, %s, %s)"
        with postgres_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, (new_book_id, new_tag_id, bt.get('created_at')))
        count += 1

print(f"  ✓ Imported {count} book-tag relationships")

# Import continuations
for cont in continuations:
    new_from = book_id_map.get(cont['from_book_id'])
    new_to = book_id_map.get(cont['to_book_id'])
    if new_from and new_to:
        query = "INSERT INTO thought_continuations (from_book_id, to_book_id, created_at) VALUES (?, ?, ?)"
        postgres_db.execute_update(query, (new_from, new_to, cont.get('created_at')))

print(f"  ✓ Imported {len(continuations)} continuations")

# Import comparisons
for comp in comparisons:
    new_a = book_id_map.get(comp['book_a_id'])
    new_b = book_id_map.get(comp['book_b_id'])
    new_winner = book_id_map.get(comp['winner_id'])
    if new_a and new_b and new_winner:
        query = "INSERT INTO comparisons (book_a_id, book_b_id, winner_id, created_at) VALUES (?, ?, ?, ?)"
        postgres_db.execute_update(query, (new_a, new_b, new_winner, comp.get('created_at')))

print(f"  ✓ Imported {len(comparisons)} comparisons")

# Import goals
for goal in goals:
    query = "INSERT INTO reading_goals (year, target_count, period, created_at) VALUES (?, ?, ?, ?)"
    postgres_db.execute_update(query, (goal['year'], goal['target_count'], goal['period'], goal.get('created_at')))

print(f"  ✓ Imported {len(goals)} goals")

print()
print("✓✓✓ Migration complete! All your books are now on Heroku!")

