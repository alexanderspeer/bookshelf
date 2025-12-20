import requests
import time

class MetadataService:
    """Service for fetching book metadata from Open Library"""
    
    def __init__(self):
        self.open_library_base = "https://openlibrary.org"
        self.cache = {}
    
    def search_books(self, query, author=None, limit=10):
        """Search for books by title and optionally author"""
        try:
            search_query = query
            if author:
                search_query = f"{query} {author}"
            
            url = f"{self.open_library_base}/search.json"
            params = {
                "q": search_query,
                "limit": limit
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("docs"):
                return []
            
            results = []
            for book in data["docs"]:
                results.append(self._format_book(book))
            
            return results
        except Exception as e:
            print(f"Error searching books: {e}")
            return []
    
    def get_book_by_isbn(self, isbn):
        """Get book details by ISBN"""
        try:
            url = f"{self.open_library_base}/isbn/{isbn}.json"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Get additional details from work
            work_key = data.get("works", [{}])[0].get("key")
            if work_key:
                work_data = self._get_work(work_key)
                if work_data:
                    data.update(work_data)
            
            return self._format_book_detail(data)
        except Exception as e:
            print(f"Error getting book by ISBN: {e}")
            return None
    
    def _get_work(self, work_key):
        """Get work details from Open Library"""
        try:
            url = f"{self.open_library_base}{work_key}.json"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except:
            return None
    
    def _format_book(self, book):
        """Format Open Library book data to our schema"""
        # Extract ISBNs
        isbn_list = book.get("isbn", [])
        isbn = isbn_list[0] if isbn_list else None
        isbn13 = None
        
        for isbn_val in isbn_list:
            if len(isbn_val) == 13:
                isbn13 = isbn_val
                break
        
        if not isbn13 and isbn and len(isbn) == 10:
            isbn13 = self._convert_isbn10_to_isbn13(isbn)
        
        # Extract author
        authors = book.get("author_name", [])
        author = authors[0] if authors else ""
        
        # Extract publication date
        publish_year = book.get("first_publish_year")
        pub_date = str(publish_year) if publish_year else ""
        
        # Get cover image
        cover_id = book.get("cover_i")
        cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None
        
        return {
            "title": book.get("title", ""),
            "author": author,
            "isbn": isbn,
            "isbn13": isbn13,
            "pub_date": pub_date,
            "num_pages": book.get("number_of_pages_median"),
            "genre": "",
            "cover_image_url": cover_url,
            "ol_key": book.get("key", "")
        }
    
    def _format_book_detail(self, data):
        """Format detailed book data"""
        return {
            "title": data.get("title", ""),
            "author": ", ".join([a.get("name", "") for a in data.get("authors", [])]),
            "isbn": data.get("isbn_10", [None])[0],
            "isbn13": data.get("isbn_13", [None])[0],
            "pub_date": data.get("publish_date", ""),
            "num_pages": data.get("number_of_pages"),
            "genre": ", ".join(data.get("subjects", [])[:3]),
            "cover_image_url": None
        }
    
    def _convert_isbn10_to_isbn13(self, isbn10):
        """Convert ISBN-10 to ISBN-13"""
        if len(isbn10) != 10:
            return None
        
        prefix = "978" + isbn10[:-1]
        check = self._check_digit_13(prefix)
        return prefix + check
    
    def _check_digit_13(self, isbn):
        """Calculate ISBN-13 check digit"""
        if len(isbn) != 12:
            return None
        
        sum_val = 0
        for i, char in enumerate(isbn):
            weight = 3 if i % 2 else 1
            sum_val += int(char) * weight
        
        remainder = sum_val % 10
        check = 0 if remainder == 0 else 10 - remainder
        return str(check)

# Singleton instance
_metadata_service = None

def get_metadata_service():
    global _metadata_service
    if _metadata_service is None:
        _metadata_service = MetadataService()
    return _metadata_service

