import React, { useState, useEffect } from 'react';
import { Book } from '../types/types';
import apiService from '../services/api';
import { BookshelfRenderer } from '../utils/BookshelfRenderer';
import { toast } from 'react-toastify';
import '../styles/visualize.css';

export const VisualizeShelf: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [shelfImage, setShelfImage] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<'all' | 'want_to_read' | 'currently_reading' | 'read'>('all');
  const [bookPositions, setBookPositions] = useState<any[]>([]);
  const [hoveredBook, setHoveredBook] = useState<any | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    fetchBooks();
  }, [selectedShelf]);

  // Auto-generate bookshelf when books are loaded for the first time
  useEffect(() => {
    if (books.length > 0 && !shelfImage && !rendering) {
      generateBookshelf();
    }
  }, [books]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      let booksData;
      if (selectedShelf === 'all') {
        // Reduced from 1000 to 500 for better performance
        const response = await apiService.listBooks({ limit: 500 });
        booksData = response.books;
      } else {
        const response = await apiService.getShelf(selectedShelf, 500, 0);
        booksData = response.books;
      }
      
      // Don't filter - the BookshelfRenderer will generate fake spines for books without real spine images
      setBooks(booksData);
    } catch (error) {
      toast.error('Failed to load books');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateBookshelf = async () => {
    if (books.length === 0) {
      toast.info('No books to display');
      return;
    }

    setRendering(true);
    try {
      // Convert books to format expected by BookshelfRenderer
      // All books will get fake spines generated automatically
      const rendererBooks = books.map(book => ({
        ...book,
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

      // Don't use progressive rendering - generate all at once
      // renderer.inProgressRenderCallback = null;

      const finalImage = await renderer.render();
      const positions = renderer.getBookPositions();
      console.log(`Captured ${positions.length} book positions for interactivity`);
      setShelfImage(finalImage);
      setBookPositions(positions);
      toast.success('Bookshelf generated!');
    } catch (error) {
      toast.error('Failed to generate bookshelf');
      console.error(error);
    } finally {
      setRendering(false);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Find clicked book
    const clickedBook = bookPositions.find(pos => 
      x >= pos.x && x <= pos.x + pos.width &&
      y >= pos.y && y <= pos.y + pos.height
    );

    if (clickedBook) {
      // Find the full book data
      const fullBook = books.find(b => b.title === clickedBook.book.title && b.author === clickedBook.book.author);
      setSelectedBook(fullBook || null);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Find hovered book
    const hovered = bookPositions.find(pos => 
      x >= pos.x && x <= pos.x + pos.width &&
      y >= pos.y && y <= pos.y + pos.height
    );

    setHoveredBook(hovered || null);
    canvasRef.current.style.cursor = hovered ? 'pointer' : 'default';
  };

  const downloadShelf = () => {
    if (!shelfImage) return;
    
    const link = document.createElement('a');
    link.href = shelfImage;
    link.download = `my-bookshelf-${selectedShelf}-${new Date().toISOString().split('T')[0]}.jpg`;
    link.click();
  };

  React.useEffect(() => {
    if (shelfImage && canvasRef.current && bookPositions.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = shelfImage;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // *** ADJUST THIS VALUE TO CHANGE HOW FAR THE BOOK LIFTS UP ***
        // Higher number = book lifts more (in pixels)
        const LIFT_DISTANCE = 15; // <-- Change this value!
        
        // First, draw the base image
        ctx.drawImage(img, 0, 0);

        // If there's a hovered book, redraw it with lift effect
        if (hoveredBook) {
          // Create a small canvas to extract just the hovered book
          const bookCanvas = document.createElement('canvas');
          bookCanvas.width = hoveredBook.width + 10;
          bookCanvas.height = hoveredBook.height + 10;
          const bookCtx = bookCanvas.getContext('2d');
          
          if (bookCtx) {
            // Copy the book region from the original image
            bookCtx.drawImage(
              img,
              hoveredBook.x - 5,
              hoveredBook.y - 5,
              hoveredBook.width + 10,
              hoveredBook.height + 10,
              0,
              0,
              hoveredBook.width + 10,
              hoveredBook.height + 10
            );

            // Fill the area where the original book was with shelf background
            // to prevent remnant color when the book lifts up
            ctx.fillStyle = '#8B6F47'; // Match the shelf background color
            ctx.fillRect(
              hoveredBook.x,
              hoveredBook.y,
              hoveredBook.width,
              hoveredBook.height
            );

            // Draw the lifted book (no glow effect)
            ctx.save();
            
            // Draw the book at lifted position
            ctx.drawImage(
              bookCanvas,
              0,
              0,
              hoveredBook.width + 10,
              hoveredBook.height + 10,
              hoveredBook.x - 5,
              hoveredBook.y - LIFT_DISTANCE - 5,
              hoveredBook.width + 10,
              hoveredBook.height + 10
            );
            
            // Draw simple border around the book
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.strokeRect(
              hoveredBook.x,
              hoveredBook.y - LIFT_DISTANCE,
              hoveredBook.width,
              hoveredBook.height
            );
            
            ctx.restore();
          }
        }
      };
    }
  }, [shelfImage, hoveredBook, bookPositions]);

  return (
    <div className="visualize-shelf-container">
      <h1>Visualize Your Bookshelf</h1>
      
      <div className="shelf-controls">
        <div className="shelf-selector">
          <label>Filter by Shelf:</label>
          <select value={selectedShelf} onChange={(e) => setSelectedShelf(e.target.value as any)}>
            <option value="all">All Books</option>
            <option value="read">Read</option>
            <option value="currently_reading">Currently Reading</option>
            <option value="want_to_read">Want to Read</option>
          </select>
        </div>

        <button
          className="regenerate-btn"
          onClick={generateBookshelf}
          disabled={loading || rendering || books.length === 0}
        >
          {rendering ? 'Regenerating...' : 'Regenerate Bookshelf'}
        </button>
      </div>

      <div className="books-info">
        <p>
          {loading ? 'Loading books...' : 
           rendering ? 'Generating bookshelf...' :
           `Showing ${books.length} book${books.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {shelfImage && bookPositions.length > 0 && (
        <div className="shelf-preview">
          <div className="preview-actions">
            <button onClick={downloadShelf}>Download Image</button>
          </div>
          <canvas 
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredBook(null)}
            className="shelf-canvas"
          />
        </div>
      )}

      {shelfImage && bookPositions.length === 0 && (
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

      {selectedBook && (
        <div className="book-detail-modal" onClick={() => setSelectedBook(null)}>
          <div className="book-detail-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedBook(null)}>×</button>
            <h2>{selectedBook.title}</h2>
            <h3 style={{ textAlign: 'center' }}>by {selectedBook.author}</h3>
            {selectedBook.cover_image_url && (
              <img src={selectedBook.cover_image_url} alt={selectedBook.title} className="book-cover" />
            )}
            <div className="book-details">
              {selectedBook.pub_date && <p><strong>Published:</strong> {selectedBook.pub_date}</p>}
              {selectedBook.num_pages && <p><strong>Pages:</strong> {selectedBook.num_pages}</p>}
              {selectedBook.genre && <p><strong>Genre:</strong> {selectedBook.genre}</p>}
              {selectedBook.reading_state && <p><strong>Status:</strong> {selectedBook.reading_state.replace('_', ' ')}</p>}
              {selectedBook.initial_stars !== null && selectedBook.initial_stars !== undefined && (
                <p>
                  <strong>Rating:</strong>{' '}
                  {selectedBook.initial_stars > 0 
                    ? '⭐'.repeat(selectedBook.initial_stars)
                    : 'Unrated'}
                </p>
              )}
              {selectedBook.rank_position && <p><strong>Rank:</strong> #{selectedBook.rank_position}</p>}
              {selectedBook.notes && <p><strong>Notes:</strong> {selectedBook.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

