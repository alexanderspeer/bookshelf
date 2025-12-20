import React, { useState, useEffect } from 'react';
import { Book } from '../types/types';
import apiService from '../services/api';
import { BookshelfRenderer } from '../utils/BookshelfRenderer';
import { toast } from 'react-toastify';

export const VisualizeShelf: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [shelfImage, setShelfImage] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<'all' | 'want_to_read' | 'currently_reading' | 'read'>('read');
  
  useEffect(() => {
    fetchBooks();
  }, [selectedShelf]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      let booksData;
      if (selectedShelf === 'all') {
        const response = await apiService.listBooks({ limit: 1000 });
        booksData = response.books;
      } else {
        const response = await apiService.getShelf(selectedShelf, 1000, 0);
        booksData = response.books;
      }
      
      // Filter books with spine images
      const booksWithSpines = booksData.filter((book: Book) => book.spine_image_path);
      setBooks(booksWithSpines);
    } catch (error) {
      toast.error('Failed to load books');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateBookshelf = async () => {
    if (books.length === 0) {
      toast.info('No books with spine images to display');
      return;
    }

    setRendering(true);
    try {
      // Convert books to format expected by BookshelfRenderer
      const rendererBooks = books.map(book => ({
        ...book,
        fileName: book.spine_image_path || '',
        dimensions: book.dimensions || '6x1x9', // Default dimensions
        domColor: book.dom_color || '#888888',
        book_id: String(book.id || ''),
        title: book.title,
        author: book.author
      } as any));

      const renderer = new BookshelfRenderer({
        books: rendererBooks,
        shelfWidthInches: 30,
        shelfHeightInches: 10.5,
        borderWidthInches: 1
      });

      // Set up in-progress callback
      renderer.inProgressRenderCallback = (b64Image: string) => {
        setShelfImage(b64Image);
      };

      const finalImage = await renderer.render();
      setShelfImage(finalImage);
      toast.success('Bookshelf generated!');
    } catch (error) {
      toast.error('Failed to generate bookshelf');
      console.error(error);
    } finally {
      setRendering(false);
    }
  };

  const downloadShelf = () => {
    if (!shelfImage) return;
    
    const link = document.createElement('a');
    link.href = shelfImage;
    link.download = `my-bookshelf-${selectedShelf}-${new Date().toISOString().split('T')[0]}.jpg`;
    link.click();
  };

  return (
    <div className="visualize-shelf-container">
      <h1>Visualize Your Bookshelf</h1>
      
      <div className="shelf-controls">
        <div className="shelf-selector">
          <label>Select Shelf:</label>
          <select value={selectedShelf} onChange={(e) => setSelectedShelf(e.target.value as any)}>
            <option value="read">Read</option>
            <option value="currently_reading">Currently Reading</option>
            <option value="want_to_read">Want to Read</option>
            <option value="all">All Books</option>
          </select>
        </div>

        <button
          className="generate-btn"
          onClick={generateBookshelf}
          disabled={loading || rendering || books.length === 0}
        >
          {rendering ? 'Generating...' : 'Generate Bookshelf'}
        </button>
      </div>

      <div className="books-info">
        <p>
          {loading ? 'Loading...' : 
           `${books.length} book${books.length !== 1 ? 's' : ''} with spine images`}
        </p>
        {books.length === 0 && !loading && (
          <p className="hint">Upload spine images to your books to visualize them!</p>
        )}
      </div>

      {shelfImage && (
        <div className="shelf-preview">
          <div className="preview-actions">
            <button onClick={downloadShelf}>Download Image</button>
          </div>
          <img src={shelfImage} alt="Generated bookshelf" className="shelf-image" />
        </div>
      )}

      {rendering && !shelfImage && (
        <div className="rendering-state">
          <p>Rendering your bookshelf...</p>
          <p className="hint">This may take a moment for large collections</p>
        </div>
      )}
    </div>
  );
};

