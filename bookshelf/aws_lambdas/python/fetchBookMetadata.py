"""
Book Metadata Fetcher - Replaces Goodreads dependency
Supports multiple APIs: Open Library, Google Books
"""
import requests
import json
import os

def fetch_from_open_library(title, author=None):
    """
    Fetch book metadata from Open Library API (FREE, no API key required)
    API: https://openlibrary.org/developers/api
    """
    try:
        # Search by title
        search_query = title
        if author:
            search_query = f"{title} {author}"
        
        url = "https://openlibrary.org/search.json"
        params = {
            "q": search_query,
            "limit": 5  # Get top 5 results
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("docs") or len(data["docs"]) == 0:
            return None
        
        # Get the first result (most relevant)
        book = data["docs"][0]
        
        # Extract ISBNs
        isbn_list = book.get("isbn", [])
        isbn = isbn_list[0] if isbn_list else None
        isbn13 = None
        
        # Try to find ISBN-13
        for isbn_val in isbn_list:
            if len(isbn_val) == 13:
                isbn13 = isbn_val
                break
        
        # If no ISBN-13 found, convert ISBN-10 to ISBN-13
        if not isbn13 and isbn and len(isbn) == 10:
            isbn13 = convert_isbn10_to_isbn13(isbn)
        
        # Extract author
        authors = book.get("author_name", [])
        author_name = authors[0] if authors else ""
        
        # Extract publication date
        publish_year = book.get("first_publish_year")
        pub_date = str(publish_year) if publish_year else ""
        
        # Extract number of pages
        num_pages = book.get("number_of_pages_median", "")
        
        return {
            "title": book.get("title", title),
            "author": author_name,
            "isbn": isbn,
            "isbn13": isbn13,
            "pubDate": pub_date,
            "numPages": str(num_pages) if num_pages else "",
            "genre": "",  # Open Library doesn't provide genre easily
            "book_id": isbn13 or isbn or book.get("key", "").split("/")[-1]  # Use ISBN as book_id
        }
    except Exception as e:
        print(f"Error fetching from Open Library: {e}")
        return None

def fetch_from_google_books(title, author=None, api_key=None):
    """
    Fetch book metadata from Google Books API
    API: https://developers.google.com/books/docs/v1/using
    Free tier: 1000 requests/day
    """
    try:
        # Build search query
        query = f"intitle:{title}"
        if author:
            query += f"+inauthor:{author}"
        
        url = "https://www.googleapis.com/books/v1/volumes"
        params = {
            "q": query,
            "maxResults": 5
        }
        
        if api_key:
            params["key"] = api_key
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("items") or len(data["items"]) == 0:
            return None
        
        # Get the first result
        volume = data["items"][0]
        info = volume.get("volumeInfo", {})
        
        # Extract ISBNs
        industry_identifiers = info.get("industryIdentifiers", [])
        isbn = None
        isbn13 = None
        
        for identifier in industry_identifiers:
            if identifier.get("type") == "ISBN_13":
                isbn13 = identifier.get("identifier")
            elif identifier.get("type") == "ISBN_10":
                isbn = identifier.get("identifier")
        
        # Convert ISBN-10 to ISBN-13 if needed
        if not isbn13 and isbn:
            isbn13 = convert_isbn10_to_isbn13(isbn)
        
        # Extract authors
        authors = info.get("authors", [])
        author_name = authors[0] if authors else ""
        
        # Extract publication date
        pub_date = info.get("publishedDate", "")
        if pub_date:
            # Extract just the year if full date provided
            pub_date = pub_date.split("-")[0]
        
        # Extract page count
        num_pages = info.get("pageCount", "")
        
        # Extract categories (genres)
        categories = info.get("categories", [])
        genre = categories[0] if categories else ""
        
        return {
            "title": info.get("title", title),
            "author": author_name,
            "isbn": isbn,
            "isbn13": isbn13,
            "pubDate": pub_date,
            "numPages": str(num_pages) if num_pages else "",
            "genre": genre,
            "book_id": isbn13 or isbn or volume.get("id", "")
        }
    except Exception as e:
        print(f"Error fetching from Google Books: {e}")
        return None

def convert_isbn10_to_isbn13(isbn10):
    """Convert ISBN-10 to ISBN-13"""
    if len(isbn10) != 10:
        return None
    
    # Remove check digit and add 978 prefix
    prefix = "978" + isbn10[:-1]
    
    # Calculate check digit
    check = check_digit_13(prefix)
    return prefix + check

def check_digit_13(isbn):
    """Calculate ISBN-13 check digit"""
    assert len(isbn) == 12
    sum_val = 0
    for i in range(len(isbn)):
        c = int(isbn[i])
        if i % 2: 
            w = 3
        else: 
            w = 1
        sum_val += w * c
    r = 10 - (sum_val % 10)
    if r == 10: 
        return '0'
    else: 
        return str(r)

def fetch_book_metadata(title, author=None, prefer_api="open_library"):
    """
    Main function to fetch book metadata
    Tries multiple APIs in order of preference
    """
    # Try Open Library first (free, no API key)
    if prefer_api == "open_library":
        result = fetch_from_open_library(title, author)
        if result:
            return result
        
        # Fallback to Google Books
        google_api_key = os.getenv("GOOGLE_BOOKS_API_KEY")
        result = fetch_from_google_books(title, author, google_api_key)
        if result:
            return result
    else:
        # Try Google Books first
        google_api_key = os.getenv("GOOGLE_BOOKS_API_KEY")
        result = fetch_from_google_books(title, author, google_api_key)
        if result:
            return result
        
        # Fallback to Open Library
        result = fetch_from_open_library(title, author)
        if result:
            return result
    
    # If both fail, return minimal data
    return {
        "title": title,
        "author": author or "",
        "isbn": "",
        "isbn13": "",
        "pubDate": "",
        "numPages": "",
        "genre": "",
        "book_id": ""  # Will need to generate a custom ID
    }

# Lambda handler
def lambda_handler(event, context):
    """
    AWS Lambda handler for fetching book metadata
    Expected event: {
        "title": "Book Title",
        "author": "Author Name" (optional)
    }
    """
    title = event.get("title", "")
    author = event.get("author", None)
    
    if not title:
        return {
            "statusCode": 400,
            "body": {"error": "Title is required"}
        }
    
    result = fetch_book_metadata(title, author)
    
    return {
        "statusCode": 200,
        "body": result
    }

