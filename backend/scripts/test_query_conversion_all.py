#!/usr/bin/env python3
"""
Test query conversion from SQLite to PostgreSQL.
Verifies all conversion patterns work correctly.
"""

import os
import sys
import re

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def _convert_query_postgres(query, params):
    """
    Standalone version of query conversion for testing.
    Copy of Database._convert_query logic.
    """
    converted_query = query
    
    # 1. Convert ? to %s for PostgreSQL parameter binding
    converted_query = converted_query.replace('?', '%s')
    
    # 2. Replace INSERT OR IGNORE with INSERT ... ON CONFLICT DO NOTHING
    if re.search(r'\bINSERT\s+OR\s+IGNORE\s+INTO\b', converted_query, re.IGNORECASE):
        converted_query = re.sub(
            r'\bINSERT\s+OR\s+IGNORE\s+INTO\b',
            'INSERT INTO',
            converted_query,
            flags=re.IGNORECASE
        )
        
        if 'ON CONFLICT' not in converted_query.upper():
            if 'RETURNING' in converted_query.upper():
                converted_query = re.sub(
                    r'\s+RETURNING\b',
                    ' ON CONFLICT DO NOTHING RETURNING',
                    converted_query,
                    flags=re.IGNORECASE
                )
            else:
                converted_query = converted_query.rstrip().rstrip(';') + ' ON CONFLICT DO NOTHING'
    
    # 3. Replace SUBSTR() with SUBSTRING()
    converted_query = re.sub(
        r'\bSUBSTR\s*\(\s*([^,]+),\s*(\d+),\s*(\d+)\s*\)',
        r'SUBSTRING(\1 FROM \2 FOR \3)',
        converted_query,
        flags=re.IGNORECASE
    )
    
    # 4. Replace SQLite date functions with PostgreSQL equivalents
    # Handle nested parentheses properly
    def replace_strftime(match):
        content = match.group(0)
        start = content.lower().find('strftime(') + 9
        paren_count = 1
        i = start
        while i < len(content) and paren_count > 0:
            if content[i] == '(':
                paren_count += 1
            elif content[i] == ')':
                paren_count -= 1
            i += 1
        args_str = content[start:i-1]
        comma_pos = args_str.find(',')
        if comma_pos > 0:
            inner_expr = args_str[comma_pos+1:].strip()
        else:
            inner_expr = args_str.strip()
        return f"EXTRACT(YEAR FROM {inner_expr})::TEXT"
    
    # Use iterative approach for strftime to handle nested parens
    while True:
        match = re.search(r"strftime\s*\(", converted_query, re.IGNORECASE)
        if not match:
            break
        start_pos = match.end()
        paren_count = 1
        i = start_pos
        while i < len(converted_query) and paren_count > 0:
            if converted_query[i] == '(':
                paren_count += 1
            elif converted_query[i] == ')':
                paren_count -= 1
            i += 1
        args_str = converted_query[start_pos:i-1]
        comma_pos = args_str.find(',')
        if comma_pos > 0:
            inner_expr = args_str[comma_pos+1:].strip()
        else:
            inner_expr = args_str.strip()
        replacement = f"EXTRACT(YEAR FROM {inner_expr})::TEXT"
        converted_query = converted_query[:match.start()] + replacement + converted_query[i:]
    
    # 5. Replace DATE() function
    converted_query = re.sub(
        r"DATE\s*\(([^)]+)\)",
        r"\1::DATE",
        converted_query,
        flags=re.IGNORECASE
    )
    
    return converted_query, params

def test_conversions():
    """Test all query conversion patterns"""
    
    print("=" * 70)
    print("Query Conversion Tests")
    print("=" * 70)
    
    test_cases = [
        {
            'name': 'Placeholder conversion',
            'input': 'SELECT * FROM books WHERE id = ? AND user_id = ?',
            'expected_contains': ['%s', 'WHERE id = %s AND user_id = %s'],
            'expected_not_contains': ['?']
        },
        {
            'name': 'INSERT OR IGNORE - simple',
            'input': 'INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)',
            'expected_contains': ['INSERT INTO', 'ON CONFLICT DO NOTHING', '%s'],
            'expected_not_contains': ['OR IGNORE', '?']
        },
        {
            'name': 'INSERT OR IGNORE - with RETURNING',
            'input': 'INSERT OR IGNORE INTO books (title) VALUES (?) RETURNING id',
            'expected_contains': ['INSERT INTO', 'ON CONFLICT DO NOTHING RETURNING id', '%s'],
            'expected_not_contains': ['OR IGNORE', '?']
        },
        {
            'name': 'SUBSTR function',
            'input': "SELECT SUBSTR(date_finished, 1, 10) FROM books",
            'expected_contains': ['SUBSTRING(date_finished FROM 1 FOR 10)'],
            'expected_not_contains': ['SUBSTR(']
        },
        {
            'name': 'SUBSTR in WHERE clause',
            'input': "SELECT * FROM books WHERE SUBSTR(b.date_finished, 1, 10) <= ?",
            'expected_contains': ['SUBSTRING(b.date_finished FROM 1 FOR 10)', '%s'],
            'expected_not_contains': ['SUBSTR(', '?']
        },
        {
            'name': 'strftime function',
            'input': "SELECT * FROM books WHERE strftime('%Y', date_finished) = ?",
            'expected_contains': ['EXTRACT(YEAR FROM date_finished)::TEXT', '%s'],
            'expected_not_contains': ['strftime', '?']
        },
        {
            'name': 'Combined SUBSTR and strftime',
            'input': "SELECT * FROM books WHERE strftime('%Y', SUBSTR(date_finished, 1, 10)) = ?",
            'expected_contains': ['EXTRACT(YEAR FROM SUBSTRING(date_finished FROM 1 FOR 10))::TEXT', '%s'],
            'expected_not_contains': ['strftime', 'SUBSTR(', '?']
        },
        {
            'name': 'ON CONFLICT DO UPDATE (already Postgres)',
            'input': 'INSERT INTO reading_states (book_id, state) VALUES (?, ?) ON CONFLICT(book_id) DO UPDATE SET state = excluded.state',
            'expected_contains': ['INSERT INTO', 'ON CONFLICT(book_id) DO UPDATE', '%s'],
            'expected_not_contains': ['?']
        },
        {
            'name': 'DATE function',
            'input': 'SELECT * FROM books WHERE DATE(date_finished) = ?',
            'expected_contains': ['date_finished::DATE', '%s'],
            'expected_not_contains': ['DATE(', '?']
        }
    ]
    
    passed = 0
    failed = 0
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n{i}. {test['name']}")
        print(f"   Input:  {test['input']}")
        
        converted_query, params = _convert_query_postgres(test['input'], None)
        
        print(f"   Output: {converted_query}")
        
        # Check expected patterns
        all_found = True
        for expected in test['expected_contains']:
            if expected not in converted_query:
                print(f"   ❌ FAIL: Expected to find '{expected}'")
                all_found = False
                failed += 1
        
        for not_expected in test.get('expected_not_contains', []):
            if not_expected in converted_query:
                print(f"   ❌ FAIL: Expected NOT to find '{not_expected}'")
                all_found = False
                failed += 1
        
        if all_found:
            print(f"   ✓ PASS")
            passed += 1
    
    print("\n" + "=" * 70)
    print(f"Results: {passed} passed, {failed} failed out of {len(test_cases)} tests")
    print("=" * 70)
    
    return failed == 0

def main():
    try:
        success = test_conversions()
        return 0 if success else 1
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())

