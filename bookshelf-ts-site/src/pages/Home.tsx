import React, { useState, useEffect } from 'react';
import { Book, Goal, Tag } from '../types/types';
import apiService from '../services/api';
import { BookshelfRenderer } from '../utils/BookshelfRenderer';
import { toast } from 'react-toastify';
import { RankingWizard } from '../components/RankingWizard';
import { AddBookModal } from '../components/AddBookModal';
import { GoalModal } from '../components/GoalModal';
import { EditBookModal } from '../components/EditBookModal';
import { GoodreadsImport } from './GoodreadsImport';
import '../styles/home.css';

export const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<Book[]>([]);
  const [wantToRead, setWantToRead] = useState<Book[]>([]);
  const [rankedBooks, setRankedBooks] = useState<Book[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shelfFilter, setShelfFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [shelfImage, setShelfImage] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [bookPositions, setBookPositions] = useState<any[]>([]);
  const [hoveredBook, setHoveredBook] = useState<any | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookToRank, setBookToRank] = useState<Book | null>(null);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditBookModal, setShowEditBookModal] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const hoverCanvasRef = React.useRef<HTMLCanvasElement>(null); // Separate overlay for hover
  const renderingRef = React.useRef<boolean>(false);
  const currentRenderIdRef = React.useRef<number>(0); // Track render ID to cancel old renders

  useEffect(() => {
    fetchBooks();
    fetchCurrentGoal();
    fetchTags();
  }, []);

  useEffect(() => {
    // Debounce only search query (not shelf/tag filters for instant response)
    const isSearchChange = searchQuery !== '';
    const debounceMs = isSearchChange ? 150 : 0; // Only debounce search
    
    const timeoutId = setTimeout(() => {
      if (currentlyReading.length > 0 || wantToRead.length > 0 || rankedBooks.length > 0) {
        generateBookshelf();
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [currentlyReading, wantToRead, rankedBooks, searchQuery, shelfFilter, tagFilter]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      // Fetch currently reading books
      const readingResponse = await apiService.getShelf('currently_reading', 1000, 0);
      setCurrentlyReading(readingResponse.books);

      // Fetch want to read books
      const wantResponse = await apiService.getShelf('want_to_read', 1000, 0);
      setWantToRead(wantResponse.books);

      // Fetch all ranked books (read books)
      const rankedResponse = await apiService.getRankings();
      // Sort by rank position (ascending = highest rank first)
      const sorted = rankedResponse.sort((a: Book, b: Book) => 
        (a.rank_position || 999) - (b.rank_position || 999)
      );
      setRankedBooks(sorted);
    } catch (error) {
      toast.error('Failed to load books');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isGoalExpired = (goal: Goal): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (goal.period === 'year') {
      return goal.year < currentYear;
    } else if (goal.period === 'month') {
      // Goal is expired if it's from a previous year
      return goal.year < currentYear;
    } else if (goal.period === 'week') {
      // Goal is expired if it's from a previous year
      return goal.year < currentYear;
    }
    
    return false;
  };

  const isGoalCompleted = (goal: Goal): boolean => {
    return (goal.completed || 0) >= goal.target_count;
  };

  const fetchCurrentGoal = async (goalData?: any) => {
    // If goal data is passed directly (from setGoal response), use it
    if (goalData) {
      console.log('✅ Using provided goal data:', JSON.stringify(goalData, null, 2));
      setCurrentGoal(goalData);
      return;
    }
    
    // Otherwise fetch from API
    try {
      console.log('🔍 Fetching current goal from API...');
      const goal = await apiService.getCurrentGoal();
      console.log('📥 API Response - goal:', JSON.stringify(goal, null, 2));
      console.log('📥 Goal type:', typeof goal);
      console.log('📥 Goal is null?', goal === null);
      console.log('📥 Goal is undefined?', goal === undefined);
      
      if (goal) {
        console.log('✅ Setting goal to state');
        setCurrentGoal(goal);
      } else {
        console.log('❌ No goal found, setting null');
        setCurrentGoal(null);
      }
    } catch (error) {
      console.error('❌ Error fetching current goal:', error);
      setCurrentGoal(null);
    }
  };

  const fetchTags = async () => {
    try {
      const tags = await apiService.getTags();
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load tags');
    }
  };

  const applySearchAndTagFilters = (books: Book[]) => {
    let filtered = [...books];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        (book.author && book.author.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (tagFilter) {
      filtered = filtered.filter(book => 
        book.tags && book.tags.some(tag => tag.id === parseInt(tagFilter))
      );
    }

    return filtered;
  };

  const generateBookshelf = async () => {
    // Increment render ID to cancel any in-progress renders
    currentRenderIdRef.current += 1;
    const thisRenderId = currentRenderIdRef.current;
    
    // Increment render ID to cancel previous render
    
    setRendering(true);
    renderingRef.current = true;
    setHoveredBook(null); // Clear hover during render
    setBookPositions([]); // Clear positions to prevent wrong hover detection
    
    try {
      let topShelfBooks: Book[];
      let allBooks: Book[];
      
      if (shelfFilter === 'all') {
        // Show all shelves with search and tag filters
        const filteredCurrentlyReading = applySearchAndTagFilters(currentlyReading);
        const filteredWantToRead = applySearchAndTagFilters(wantToRead);
        const filteredRanked = applySearchAndTagFilters(rankedBooks);
        
        topShelfBooks = [...filteredCurrentlyReading, ...filteredWantToRead];
        allBooks = [...topShelfBooks, ...filteredRanked];
      } else {
        // Specific shelf filter active - use the appropriate shelf
        let filtered: Book[];
        
        if (shelfFilter === 'currently_reading') {
          filtered = applySearchAndTagFilters(currentlyReading);
        } else if (shelfFilter === 'want_to_read') {
          filtered = applySearchAndTagFilters(wantToRead);
        } else if (shelfFilter === 'read') {
          filtered = applySearchAndTagFilters(rankedBooks);
        } else if (shelfFilter === 'recently_read') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          filtered = applySearchAndTagFilters(rankedBooks).filter(book => {
            if (!book.date_finished) {
              return false;
            }
            const finishedDate = new Date(book.date_finished);
            return finishedDate >= thirtyDaysAgo;
          });
        } else {
          filtered = [];
        }
        
        topShelfBooks = [];
        allBooks = filtered;
      }
      
      if (allBooks.length === 0) {
        setRendering(false);
        renderingRef.current = false;
        setShelfImage(null);
        return;
      }

      const rendererBooks = allBooks.map(book => ({
        ...book,
        fileName: book.spine_image_path || null,
        dimensions: book.dimensions || '6x1x9',
        domColor: book.dom_color || '#888888',
        book_id: String(book.id || ''),
        title: book.title,
        author: book.author
      } as any));

      // Calculate which shelf labels to show based on book count and filter
      const topShelfCount = topShelfBooks.length;
      let labels: string[];
      
      if (shelfFilter === 'all') {
        labels = ['Currently Reading / Want to Read', 'Ranked Collection'];
      } else {
        // Single label for filtered view
        const filterLabels: Record<string, string> = {
          'currently_reading': 'Currently Reading',
          'want_to_read': 'Want to Read',
          'read': 'Read Books',
          'recently_read': 'Recently Read (Last 30 Days)'
        };
        labels = [filterLabels[shelfFilter] || 'Filtered Books'];
      }
      
      const renderer = new BookshelfRenderer({
        books: rendererBooks,
        shelfWidthInches: 50,  // Wider shelf
        shelfHeightInches: 18,  // Taller to fit more shelves
        borderWidthInches: 1,
        bookScaleFactor: 0.6,  // Zoom out to 60% to see more books
        shelfLabels: labels,
        cascadeDelayMs: 15  // 15ms delay between each book for fast cascade (adjust: 0-200ms)
      });

      // Fast progressive rendering - draw directly from renderer's canvas!
      let bookCounter = 0;
      renderer.inProgressRenderCallback = () => {
        // Ignore callbacks from cancelled renders
        if (thisRenderId !== currentRenderIdRef.current) {
          return;
        }
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Update positions every 5 books for responsive hover (optimized to avoid lag)
        bookCounter++;
        if (bookCounter % 5 === 0) {
          setBookPositions([...renderer.getBookPositions()]);
        }
        
        // Draw directly from renderer's internal canvas - FAST!
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rendererCanvas = renderer.getCanvas();
        
        canvas.width = rendererCanvas.width;
        canvas.height = rendererCanvas.height;
        ctx.drawImage(rendererCanvas, 0, 0);
      };

      const finalImage = await renderer.render();
      
      // Check if this render is still valid (not cancelled by new filter)
      if (thisRenderId !== currentRenderIdRef.current) {
        return; // This render was cancelled, don't apply results
      }
      
      const positions = renderer.getBookPositions();
      
      // Draw final image directly from renderer canvas
      if (canvasRef.current && thisRenderId === currentRenderIdRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const rendererCanvas = renderer.getCanvas();
          canvas.width = rendererCanvas.width;
          canvas.height = rendererCanvas.height;
          ctx.drawImage(rendererCanvas, 0, 0);
        }
      }
      
      // Set final state for full interactivity
      setShelfImage(finalImage);
      setBookPositions(positions);
      
      renderingRef.current = false;
      setRendering(false);
    } catch (error) {
      toast.error('Failed to generate bookshelf');
      console.error(error);
      renderingRef.current = false;
      setRendering(false);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hoverCanvasRef.current || bookPositions.length === 0) return;
    
    const canvas = hoverCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factors (internal canvas size / displayed size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Transform mouse coords from display space to internal canvas space
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const clickedBook = bookPositions.find(pos => 
      x >= pos.x && x <= pos.x + pos.width &&
      y >= pos.y && y <= pos.y + pos.height
    );

    if (clickedBook) {
      const fullBook = [...currentlyReading, ...wantToRead, ...rankedBooks].find(
        b => b.title === clickedBook.book.title && b.author === clickedBook.book.author
      );
      setSelectedBook(fullBook || null);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hoverCanvasRef.current || bookPositions.length === 0) return;
    
    const canvas = hoverCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factors (internal canvas size / displayed size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Transform mouse coords from display space to internal canvas space
    const mouseDisplayX = event.clientX - rect.left;
    const mouseDisplayY = event.clientY - rect.top;
    const x = mouseDisplayX * scaleX;
    const y = mouseDisplayY * scaleY;

    // Find hovered book
    const hovered = bookPositions.find(pos => 
      x >= pos.x && x <= pos.x + pos.width &&
      y >= pos.y && y <= pos.y + pos.height
    );


    setHoveredBook(hovered || null);
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  };

  const handleFinishBook = (book: Book) => {
    setSelectedBook(null);
    setBookToRank(book);
  };

  const handleRankingComplete = () => {
    setBookToRank(null);
    fetchBooks();
    // Refresh goal to update progress and check if completed
    fetchCurrentGoal();
  };

  const handleBookAdded = () => {
    setShowAddBookModal(false);
    fetchBooks();
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!window.confirm('Are you sure you want to delete this book?')) {
      return;
    }

    try {
      await apiService.deleteBook(bookId);
      toast.success('Book deleted');
      setSelectedBook(null);
      fetchBooks();
    } catch (error) {
      toast.error('Failed to delete book');
      console.error(error);
    }
  };

  const handleEditBook = (book: Book) => {
    // Keep selectedBook so EditBookModal can access it
    setShowEditBookModal(true);
  };

  const handleRerankBook = async (book: Book) => {
    setShowEditBookModal(false);
    setSelectedBook(null);
    setBookToRank(book);
  };

  // Hover effect drawing function - defined early so it can be used in multiple effects
  const drawHoverEffect = React.useCallback(() => {
    if (!hoverCanvasRef.current || !canvasRef.current) return;

    const hoverCanvas = hoverCanvasRef.current;
    const baseCanvas = canvasRef.current;
    const hoverCtx = hoverCanvas.getContext('2d');
    if (!hoverCtx) return;

    // Always clear the entire hover canvas first
    hoverCtx.clearRect(0, 0, hoverCanvas.width, hoverCanvas.height);

    // Only draw hover effect if we have a hovered book
    if (!hoveredBook) return;

    const LIFT_DISTANCE = 15;
    
    // Step 1: Create a clean extraction of just the book (with small padding to avoid edge artifacts)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = hoveredBook.width + 10;
    tempCanvas.height = hoveredBook.height + 10;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    // Extract book with 5px padding on all sides
    tempCtx.drawImage(
      baseCanvas,
      hoveredBook.x - 5,
      hoveredBook.y - 5,
      hoveredBook.width + 10,
      hoveredBook.height + 10,
      0,
      0,
      hoveredBook.width + 10,
      hoveredBook.height + 10
    );
    
    // Step 2: Fill original position completely with shelf color (hide original book)
    hoverCtx.fillStyle = '#8B6F47';
    hoverCtx.fillRect(
      hoveredBook.x,
      hoveredBook.y,
      hoveredBook.width,
      hoveredBook.height
    );
    
    // Step 3: Draw extracted book at lifted position (same size, just moved up)
    hoverCtx.drawImage(
      tempCanvas,
      hoveredBook.x - 5,
      hoveredBook.y - LIFT_DISTANCE - 5
    );
    
    // Step 4: Gold border around lifted book (no padding on border)
    hoverCtx.strokeStyle = '#FFD700';
    hoverCtx.lineWidth = 3;
    hoverCtx.strokeRect(
      hoveredBook.x,
      hoveredBook.y - LIFT_DISTANCE,
      hoveredBook.width,
      hoveredBook.height
    );
  }, [hoveredBook]);

  // Trigger hover effect redraw when hoveredBook changes or canvas updates
  React.useEffect(() => {
    drawHoverEffect();
  }, [drawHoverEffect, bookPositions]); // Redraw on position updates (which happen during cascade)

  // Ensure hover canvas matches base canvas size (both internal AND displayed dimensions)
  React.useEffect(() => {
    if (!hoverCanvasRef.current || !canvasRef.current) return;
    
    const hoverCanvas = hoverCanvasRef.current;
    const baseCanvas = canvasRef.current;
    
    // Sync internal canvas dimensions
    // NOTE: Setting canvas.width or canvas.height clears the canvas!
    // The hover effect useEffect will redraw after this if needed
    if (hoverCanvas.width !== baseCanvas.width || hoverCanvas.height !== baseCanvas.height) {
      hoverCanvas.width = baseCanvas.width;
      hoverCanvas.height = baseCanvas.height;
    }
    
    // CRITICAL FIX: Sync displayed dimensions AND position via CSS to ensure perfect alignment
    // Get the positions of both canvases relative to the viewport
    const baseRect = baseCanvas.getBoundingClientRect();
    const parentRect = hoverCanvas.parentElement?.getBoundingClientRect();
    
    if (parentRect) {
      // Calculate offset of base canvas from parent container
      const offsetLeft = baseRect.left - parentRect.left;
      const offsetTop = baseRect.top - parentRect.top;
      
      // Position hover canvas exactly where base canvas is
      hoverCanvas.style.left = `${offsetLeft}px`;
      hoverCanvas.style.top = `${offsetTop}px`;
    }
    
    // Match displayed dimensions
    hoverCanvas.style.width = `${baseRect.width}px`;
    hoverCanvas.style.height = `${baseRect.height}px`;
    
    // Keep hover canvas clear when not hovering (no debug rectangles needed anymore)
    const ctx = hoverCanvas.getContext('2d');
    if (ctx && !hoveredBook) {
      ctx.clearRect(0, 0, hoverCanvas.width, hoverCanvas.height);
    }
    
    // If we're hovering, schedule hover redraw to happen after this effect
    // This ensures hover effect persists after canvas resize/clearing
    if (hoveredBook && ctx) {
      requestAnimationFrame(() => drawHoverEffect());
    }
  }, [shelfImage, rendering, bookPositions, hoveredBook, drawHoverEffect]);

  return (
    <div className="home-container">
      <div className="home-sidebar">
        <h1 className="home-title">My Bookshelf</h1>
        
        {/* Add Book Section */}
        <div className="sidebar-section">
          <h2>Add a Book</h2>
          <button 
            className="primary-button"
            onClick={() => setShowAddBookModal(true)}
          >
            + Add New Book
          </button>
        </div>

        {/* Reading Goal Section */}
        <div className="sidebar-section">
          <h2>Reading Goal</h2>
          {currentGoal ? (
            isGoalCompleted(currentGoal) ? (
              <div className="goal-completed-container">
                <div className="goal-completed">
                  <div className="goal-completed-icon">🎉</div>
                  <h3>Goal Completed!</h3>
                  <p className="goal-completed-text">
                    You've read <strong>{currentGoal.completed}</strong> books this {currentGoal.period}!
                  </p>
                  <button 
                    className="set-goal-button"
                    onClick={() => setShowGoalModal(true)}
                  >
                    Set New Goal
                  </button>
                </div>
              </div>
            ) : isGoalExpired(currentGoal) ? (
              <div className="goal-expired-container">
                <div className="goal-expired">
                  <div className="goal-expired-icon">📅</div>
                  <h3>Goal Expired</h3>
                  <p className="goal-expired-text">
                    Your {currentGoal.period === 'year' ? 'annual' : currentGoal.period === 'month' ? 'monthly' : 'weekly'} goal from {currentGoal.year} has ended.
                  </p>
                  <button 
                    className="set-goal-button"
                    onClick={() => setShowGoalModal(true)}
                  >
                    Set New Goal
                  </button>
                </div>
              </div>
            ) : (
              <div className="goal-display-container">
                <div className="goal-display">
                  <div className="goal-numbers">
                    <span className="goal-current">{currentGoal.completed || 0}</span>
                    <span className="goal-separator">/</span>
                    <span className="goal-target">{currentGoal.target_count}</span>
                  </div>
                  <p className="goal-label">{currentGoal.year} {currentGoal.period === 'year' ? 'Annual' : currentGoal.period === 'month' ? 'Monthly' : 'Weekly'} Goal</p>
                  <div className="goal-progress-bar">
                    <div 
                      className="goal-progress-fill"
                      style={{ 
                        width: `${Math.min(100, ((currentGoal.completed || 0) / currentGoal.target_count) * 100)}%` 
                      }}
                    />
                  </div>
                  <p className="goal-percentage">
                    {Math.round(((currentGoal.completed || 0) / currentGoal.target_count) * 100)}% Complete
                  </p>
                </div>
                <button 
                  className="goal-menu-button"
                  onClick={() => setShowGoalModal(true)}
                  title="Edit goal"
                >
                  ⋮
                </button>
              </div>
            )
          ) : (
            <button 
              className="set-goal-button"
              onClick={() => setShowGoalModal(true)}
            >
              Set Goal
            </button>
          )}
        </div>

        {/* Stats Section */}
        <div className="sidebar-section">
          <h2>Your Stats</h2>
          <div className="stats-column">
            <div className="stat-item">
              <span className="stat-number">{wantToRead.length}</span>
              <span className="stat-label">Want to Read</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{currentlyReading.length}</span>
              <span className="stat-label">Currently Reading</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{rankedBooks.length}</span>
              <span className="stat-label">Read</span>
            </div>
          </div>
        </div>

        {/* Import Section */}
        <div className="sidebar-section">
          <h2>Import Books</h2>
          <button 
            className="secondary-button"
            onClick={() => setShowImportModal(true)}
          >
            Import from Goodreads
          </button>
        </div>
      </div>

      <div className="home-main">
        <div className="bookshelf-controls">
          <div className="search-filter-section">
            <input
              type="text"
              className="search-input"
              placeholder="Search books by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="filter-select"
              value={shelfFilter}
              onChange={(e) => setShelfFilter(e.target.value)}
            >
              <option value="all">All Shelves</option>
              <option value="currently_reading">Currently Reading</option>
              <option value="want_to_read">Want to Read</option>
              <option value="read">Read</option>
              <option value="recently_read">Recently Read (Last 30 Days)</option>
            </select>
            <select
              className="filter-select"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Two-canvas approach: base + hover overlay for smooth cascade with hover */}
        {(rendering || shelfImage) && (
          <div className="bookshelf-display" style={{ position: 'relative' }}>
            <canvas 
              ref={canvasRef}
              className="bookshelf-canvas"
              style={{ display: 'block' }}
            />
            <canvas 
              ref={hoverCanvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoveredBook(null)}
              className="bookshelf-canvas"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'auto',
                display: 'block'
              }}
            />
          </div>
        )}

        {!shelfImage && !rendering && !loading && (
          <div className="empty-shelf">
            <p>Add some books to see your bookshelf!</p>
          </div>
        )}
      </div>

      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="modal-overlay" onClick={() => setSelectedBook(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedBook(null)}>×</button>
            <h2>{selectedBook.title}</h2>
            <h3>by {selectedBook.author}</h3>
            {selectedBook.cover_image_url && (
              <img src={selectedBook.cover_image_url} alt={selectedBook.title} className="modal-book-cover" />
            )}
            <div className="modal-book-details">
              {selectedBook.pub_date && <p><strong>Published:</strong> {selectedBook.pub_date}</p>}
              {selectedBook.num_pages && <p><strong>Pages:</strong> {selectedBook.num_pages}</p>}
              {selectedBook.genre && <p><strong>Genre:</strong> {selectedBook.genre}</p>}
              {selectedBook.reading_state && (
                <p><strong>Status:</strong> {selectedBook.reading_state.replace('_', ' ')}</p>
              )}
              {selectedBook.initial_stars && (
                <p><strong>Rating:</strong> {'⭐'.repeat(selectedBook.initial_stars)}</p>
              )}
              {selectedBook.rank_position && (
                <p><strong>Rank:</strong> #{selectedBook.rank_position}</p>
              )}
              {selectedBook.notes && <p><strong>Notes:</strong> {selectedBook.notes}</p>}
            </div>
            {selectedBook.reading_state === 'currently_reading' && (
              <button 
                className="finish-book-button"
                onClick={() => handleFinishBook(selectedBook)}
              >
                Finish Book & Rank
              </button>
            )}
            
            <div className="book-actions">
              <button 
                className="edit-book-button"
                onClick={() => handleEditBook(selectedBook)}
              >
                ✏️ Edit Book
              </button>
              <button 
                className="delete-book-button"
                onClick={() => handleDeleteBook(selectedBook.id!)}
              >
                🗑️ Delete Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ranking Wizard */}
      {bookToRank && (
        <RankingWizard
          book={bookToRank}
          onComplete={handleRankingComplete}
          onCancel={() => setBookToRank(null)}
        />
      )}

      {/* Add Book Modal */}
      <AddBookModal
        isOpen={showAddBookModal}
        onClose={() => setShowAddBookModal(false)}
        onSuccess={handleBookAdded}
      />

      {/* Goal Modal */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onSuccess={fetchCurrentGoal}
      />

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content import-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
            <GoodreadsImport />
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {showEditBookModal && selectedBook && (
        <EditBookModal
          book={selectedBook}
          isOpen={showEditBookModal}
          onClose={() => {
            setShowEditBookModal(false);
          }}
          onSuccess={() => {
            setShowEditBookModal(false);
            setSelectedBook(null);
            fetchBooks();
          }}
          onRerank={handleRerankBook}
        />
      )}
    </div>
  );
};

