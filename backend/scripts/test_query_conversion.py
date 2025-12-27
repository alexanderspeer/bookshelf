#!/usr/bin/env python3
"""
Test script to verify SQL query conversion logic.
This doesn't connect to any database, just tests the conversion function.
"""

import re

def convert_query_test(query):
    """Test version of the conversion function"""
    # Convert ? to %s for PostgreSQL
    converted_query = query.replace('?', '%s')
    
    # Replace SQLite-specific date functions with PostgreSQL equivalents
    # strftime('%Y', column) -> EXTRACT(YEAR FROM column)::TEXT
    converted_query = re.sub(
        r"strftime\('%Y',\s*([^)]+)\)",
        r"EXTRACT(YEAR FROM \1)::TEXT",
        converted_query
    )
    
    return converted_query

# Test cases
test_queries = [
    # Basic placeholder conversion
    ("SELECT * FROM books WHERE id = ?", "SELECT * FROM books WHERE id = %s"),
    
    # Multiple placeholders
    ("INSERT INTO books (title, author) VALUES (?, ?)", 
     "INSERT INTO books (title, author) VALUES (%s, %s)"),
    
    # strftime conversion
    ("SELECT COUNT(*) FROM books WHERE strftime('%Y', date_finished) = ?",
     "SELECT COUNT(*) FROM books WHERE EXTRACT(YEAR FROM date_finished)::TEXT = %s"),
    
    # Complex query with both
    ("""SELECT b.* FROM books b
        WHERE strftime('%Y', b.date_finished) = ?
        AND b.author = ?""",
     """SELECT b.* FROM books b
        WHERE EXTRACT(YEAR FROM b.date_finished)::TEXT = %s
        AND b.author = %s"""),
]

print("Testing SQL Query Conversion")
print("=" * 60)

all_passed = True
for i, (input_query, expected_output) in enumerate(test_queries, 1):
    result = convert_query_test(input_query)
    # Normalize whitespace for comparison
    result_normalized = ' '.join(result.split())
    expected_normalized = ' '.join(expected_output.split())
    
    if result_normalized == expected_normalized:
        print(f"\n✓ Test {i} PASSED")
    else:
        print(f"\n✗ Test {i} FAILED")
        print(f"  Input:    {input_query}")
        print(f"  Expected: {expected_output}")
        print(f"  Got:      {result}")
        all_passed = False

print("\n" + "=" * 60)
if all_passed:
    print("All conversion tests passed!")
else:
    print("Some tests failed!")
    exit(1)

