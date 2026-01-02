#!/usr/bin/env python3
"""
Migration script to add username and is_public columns to users table
and backfill usernames from email local-part
"""

import sys
import os
import re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database.db import get_db

# Reserved usernames that cannot be used
RESERVED_USERNAMES = {'me', 'u', 'api', 'auth', 'admin', 'static', 'assets'}

def normalize_username(username: str) -> str:
    """Normalize username to lowercase and remove invalid characters"""
    # Only allow alphanumeric and underscore
    username = re.sub(r'[^a-z0-9_]', '', username.lower())
    return username

def validate_username(username: str) -> bool:
    """Validate username format"""
    if not username:
        return False
    if len(username) < 3 or len(username) > 24:
        return False
    if not re.match(r'^[a-z0-9_]+$', username):
        return False
    if username in RESERVED_USERNAMES:
        return False
    return True

def generate_username_from_email(email: str, db) -> str:
    """Generate a unique username from email local-part"""
    # Extract local part (before @)
    local_part = email.split('@')[0] if '@' in email else email
    
    # Normalize
    base = normalize_username(local_part)
    
    # If invalid or reserved, use 'user' as base
    if not base or base in RESERVED_USERNAMES or not validate_username(base):
        base = 'user'
    
    # Check if base is available
    existing = db.execute_query(
        'SELECT id FROM users WHERE username = ?',
        (base,)
    )
    
    if not existing:
        return base
    
    # Try base2, base3, etc.
    counter = 2
    while counter < 1000:  # Safety limit
        candidate = f"{base}{counter}"
        existing = db.execute_query(
            'SELECT id FROM users WHERE username = ?',
            (candidate,)
        )
        if not existing:
            return candidate
        counter += 1
    
    # Fallback: use base + timestamp
    import time
    return f"{base}{int(time.time())}"

def main():
    db = get_db()
    
    print("Starting migration: Add username and is_public columns")
    print(f"Database type: {db.db_type}")
    print()
    
    # Check if columns already exist
    if db.db_type == 'sqlite':
        # SQLite: Check if username column exists
        try:
            db.execute_query('SELECT username FROM users LIMIT 1')
            print("✓ Username column already exists")
        except Exception:
            print("Adding username column...")
            db.execute_update('ALTER TABLE users ADD COLUMN username TEXT UNIQUE')
            print("✓ Added username column")
        
        try:
            db.execute_query('SELECT is_public FROM users LIMIT 1')
            print("✓ is_public column already exists")
        except Exception:
            print("Adding is_public column...")
            db.execute_update('ALTER TABLE users ADD COLUMN is_public BOOLEAN DEFAULT 0')
            print("✓ Added is_public column")
    else:
        # PostgreSQL: Check if columns exist
        try:
            db.execute_query('SELECT username FROM users LIMIT 1')
            print("✓ Username column already exists")
        except Exception:
            print("Adding username column...")
            db.execute_update('ALTER TABLE users ADD COLUMN username TEXT')
            db.execute_update('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)')
            print("✓ Added username column")
        
        try:
            db.execute_query('SELECT is_public FROM users LIMIT 1')
            print("✓ is_public column already exists")
        except Exception:
            print("Adding is_public column...")
            db.execute_update('ALTER TABLE users ADD COLUMN is_public BOOLEAN DEFAULT FALSE')
            print("✓ Added is_public column")
    
    print()
    print("Backfilling usernames from email local-part...")
    
    # Get all users without usernames
    if db.db_type == 'postgres':
        users = db.execute_query(
            'SELECT id, email FROM users WHERE username IS NULL OR username = \'\''
        )
    else:
        users = db.execute_query(
            'SELECT id, email FROM users WHERE username IS NULL OR username = ""'
        )
    
    print(f"Found {len(users)} users without usernames")
    
    updated = 0
    for user in users:
        username = generate_username_from_email(user['email'], db)
        
        # Update user with username
        db.execute_update(
            'UPDATE users SET username = ? WHERE id = ?',
            (username, user['id'])
        )
        print(f"  User {user['id']} ({user['email']}) -> {username}")
        updated += 1
    
    print()
    print(f"✓✓✓ Migration complete! Updated {updated} users with usernames")

if __name__ == '__main__':
    main()

