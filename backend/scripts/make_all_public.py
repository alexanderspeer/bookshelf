#!/usr/bin/env python3
"""Set all users to public"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database.db import get_db

def main():
    db = get_db()
    
    print("Setting all users to public...")
    db.execute_update('UPDATE users SET is_public = TRUE')
    
    users = db.execute_query('SELECT id, email, username, is_public FROM users')
    print(f"\nUpdated {len(users)} users:")
    for u in users:
        print(f"  ID {u['id']}: {u['email']} -> is_public={u.get('is_public')}")

if __name__ == '__main__':
    main()

