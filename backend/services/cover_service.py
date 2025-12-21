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
    
    # Create spine_images directory if it doesn't exist
    spine_dir = os.getenv('SPINE_IMAGES_PATH', 'data/spine_images')
    os.makedirs(spine_dir, exist_ok=True)
    
    # Create a safe filename
    safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_title = safe_title.replace(' ', '_')[:50]
    filename = f"book_{book_id}_{safe_title}.jpg"
    filepath = os.path.join(spine_dir, filename)
    
    # Save the image
    try:
        image = Image.open(BytesIO(image_bytes))
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        image.save(filepath, 'JPEG', quality=85)
        return filename
    except Exception as e:
        print(f"Error saving cover image: {e}")
        return None

