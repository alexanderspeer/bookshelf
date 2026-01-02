import requests
import os
from PIL import Image
from io import BytesIO

def fetch_and_save_cover(book_id, title, isbn=None, isbn13=None, cover_url=None):
    """
    Fetch cover image from Open Library and save it locally
    Returns the filename if successful, None otherwise
    """
    
    def fetch_cover_bytes(isbn=None, cover_url=None):
        """Helper to fetch cover image bytes"""
        base_url = "https://covers.openlibrary.org/b/"
        
        # Try ISBN13 first
        if isbn13:
            for size in ['L', 'M']:
                url = f"{base_url}isbn/{isbn13}-{size}.jpg"
                try:
                    response = requests.get(url, timeout=10)
                    if response.status_code == 200 and len(response.content) > 1000:
                        return response.content
                except:
                    continue
        
        # Try ISBN
        if isbn:
            for size in ['L', 'M']:
                url = f"{base_url}isbn/{isbn}-{size}.jpg"
                try:
                    response = requests.get(url, timeout=10)
                    if response.status_code == 200 and len(response.content) > 1000:
                        return response.content
                except:
                    continue
        
        # Try cover_url from database
        if cover_url and 'covers.openlibrary.org' in cover_url:
            try:
                response = requests.get(cover_url, timeout=10)
                if response.status_code == 200 and len(response.content) > 1000:
                    return response.content
            except:
                pass
        
        return None
    
    # Fetch the cover
    image_bytes = fetch_cover_bytes(isbn, cover_url)
    if not image_bytes:
        return None
    
    # Spine storage has been removed - cover images are stored via cover_image_url in database only
    # This function now just validates that a cover can be fetched, but doesn't save it locally
    return "cover_available"  # Return a placeholder to indicate cover was found

