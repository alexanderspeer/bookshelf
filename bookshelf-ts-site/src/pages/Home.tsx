import React, { useState, useEffect } from 'react';
import { Book, Goal, Tag, Theme, BookColorOverride, BookFontOverride } from '../types/types';
import apiService from '../services/api';
import { BookshelfRenderer } from '../utils/BookshelfRenderer';
import { toast } from 'react-toastify';
import { RankingWizard } from '../components/RankingWizard';
import { AddBookModal } from '../components/AddBookModal';
import { GoalModal } from '../components/GoalModal';
import { EditBookModal } from '../components/EditBookModal';
import { GoodreadsImport } from './GoodreadsImport';
import { ThemeManager } from '../components/ThemeManager';
import { RankingsModal } from '../components/RankingsModal';
import { WelcomeModal } from '../components/WelcomeModal';
import { Settings } from './Settings';
import '../styles/home.css';

const DEFAULT_THEME: Theme = {
  id: 'default',
  name: 'Default Theme',
  shelfBgColor: '#8B6F47',
  shelfFgColor: '#5C4033',
  bookColors: [],
  bookFonts: [],
  spineFont: 'serif',
  isDefault: true,
};

// Initialize theme from localStorage before component renders
const getInitialTheme = (): Theme => {
  try {
    const currentThemeStr = localStorage.getItem('bookshelf_current_theme');
    if (currentThemeStr) {
      const theme = JSON.parse(currentThemeStr);
      console.log('Loaded theme from localStorage:', theme);
      return theme;
    }
  } catch (e) {
    console.error('Failed to parse saved theme', e);
  }
  return DEFAULT_THEME;
};

// Initialize saved themes from localStorage before component renders
const getInitialSavedThemes = (): Theme[] => {
  try {
    const savedThemesStr = localStorage.getItem('bookshelf_themes');
    if (savedThemesStr) {
      const themes = JSON.parse(savedThemesStr);
        console.log('Loaded custom themes from localStorage:', themes);
      return [DEFAULT_THEME, ...themes];
    }
  } catch (e) {
    console.error('Failed to parse saved themes', e);
  }
  return [DEFAULT_THEME];
};

// DEBUG MODE - set to true to show book position outlines
// const DEBUG_HOVER = false;

interface HomeProps {
  isPublicView?: boolean;
  publicUsername?: string;
}

export const Home: React.FC<HomeProps> = ({ isPublicView = false, publicUsername }) => {
  const [currentlyReading, setCurrentlyReading] = useState<Book[]>([]);
  const [wantToRead, setWantToRead] = useState<Book[]>([]);
  const [rankedBooks, setRankedBooks] = useState<Book[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shelfFilter, setShelfFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('none');
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
  const [showThemeManager, setShowThemeManager] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [showRankingsModal, setShowRankingsModal] = useState(false);
  const [shelfModalBooks, setShelfModalBooks] = useState<Book[]>([]);
  const [shelfModalTitle, setShelfModalTitle] = useState('');
  const [showGoalBooksModal, setShowGoalBooksModal] = useState(false);
  const [goalBooks, setGoalBooks] = useState<Book[]>([]);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme());
  const [savedThemes, setSavedThemes] = useState<Theme[]>(getInitialSavedThemes());
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [bookshelfTitle, setBookshelfTitle] = useState<string>('My Bookshelf');
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleInputValue, setTitleInputValue] = useState<string>('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const hoverCanvasRef = React.useRef<HTMLCanvasElement>(null); // Separate overlay for hover
  const renderingRef = React.useRef<boolean>(false);
  const currentRenderIdRef = React.useRef<number>(0); // Track render ID to cancel old renders
  const hasInitialized = React.useRef<boolean>(false); // Track if we've initialized

  // Save themes to localStorage whenever they change (but not on initial mount)
  useEffect(() => {
    // Skip the first run (initial mount)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    
    const themesToSave = savedThemes.filter(t => !t.isDefault);
    console.log('Saving themes to localStorage:', themesToSave);
    localStorage.setItem('bookshelf_themes', JSON.stringify(themesToSave));
  }, [savedThemes]);

  // Save current theme to localStorage whenever it changes
  useEffect(() => {
    console.log('Saving theme to localStorage:', currentTheme);
    localStorage.setItem('bookshelf_current_theme', JSON.stringify(currentTheme));
  }, [currentTheme]);

  // Helper function to check and show welcome modal (moved before useEffect that uses it)
  const checkAndShowWelcomeModal = React.useCallback((userEmail: string | null, currentlyReadingBooks: Book[], wantToReadBooks: Book[], rankedBooksList: Book[]) => {
    if (!userEmail) return;
    
    const totalBooks = currentlyReadingBooks.length + wantToReadBooks.length + rankedBooksList.length;
    const welcomeStorageKey = `hasSeenWelcomeModal_${userEmail}`;
    const hasSeenWelcome = localStorage.getItem(welcomeStorageKey);
    
    console.log('Checking welcome modal:', {
      userEmail,
      totalBooks,
      hasSeenWelcome,
      shouldShow: totalBooks === 0 && !hasSeenWelcome
    });
    
    if (totalBooks === 0 && !hasSeenWelcome) {
      setShowWelcomeModal(true);
    }
  }, []);

  useEffect(() => {
    // Fetch current user first to get email for user-specific localStorage
    const fetchUser = async () => {
      try {
        if (isPublicView && publicUsername) {
          // Fetch public profile
          const profile = await apiService.getPublicProfile(publicUsername);
          if (profile && profile.username) {
            // Set title to public user's bookshelf
            setBookshelfTitle(`${profile.username}'s Bookshelf`);
          }
        } else {
          const response = await apiService.getCurrentUser();
          console.log('getCurrentUser response:', response);
          // API returns { user: { id, email } }
          const userEmail = response.user?.email || response.email;
          if (userEmail) {
            setCurrentUserEmail(userEmail);
            // Set bookshelf title with user-specific key
            const titleStorageKey = `bookshelf_title_${userEmail}`;
            const savedTitle = localStorage.getItem(titleStorageKey);
            if (savedTitle && savedTitle.trim()) {
              setBookshelfTitle(savedTitle.trim());
            } else {
              // Clear any old non-user-specific title if it exists
              const oldTitle = localStorage.getItem('bookshelf_title');
              if (oldTitle && oldTitle !== 'My Bookshelf') {
                localStorage.removeItem('bookshelf_title');
              }
              setBookshelfTitle('My Bookshelf');
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user', error);
      }
    };
    
    fetchUser();
    fetchBooks();
    fetchCurrentGoal();
    if (!isPublicView) {
      fetchTags();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicView, publicUsername]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentlyReading, wantToRead, rankedBooks, searchQuery, shelfFilter, tagFilter, sortOrder, currentTheme]);

  const handleBlockedAction = () => {
    toast.error("You can't modify another user's bookshelf", {
      position: "top-right",
      autoClose: 2000,
    });
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      if (isPublicView && publicUsername) {
        // Fetch public user's books
        const publicResponse = await apiService.getPublicShelf(publicUsername);
        const allPublicBooks = publicResponse.books || [];
        
        // Separate books by reading state
        const currentlyReadingBooks = allPublicBooks.filter((b: Book) => b.reading_state === 'currently_reading');
        const wantToReadBooks = allPublicBooks.filter((b: Book) => b.reading_state === 'want_to_read');
        const readBooks = allPublicBooks.filter((b: Book) => b.reading_state === 'read');
        
        setCurrentlyReading(currentlyReadingBooks);
        setWantToRead(wantToReadBooks);
        
        // Sort read books by date_finished (most recent first), then by rank position as secondary sort
        const sorted = [...readBooks].sort((a: Book, b: Book) => {
          const getDateValue = (dateStr: string | undefined): number => {
            if (!dateStr) return 0;
            try {
              const date = new Date(dateStr);
              return date.getTime();
            } catch {
              return 0;
            }
          };
          
          const dateA = getDateValue(a.date_finished);
          const dateB = getDateValue(b.date_finished);
          
          if (dateA > 0 && dateB > 0) {
            if (dateB !== dateA) {
              return dateB - dateA;
            }
          } else if (dateA > 0 && dateB === 0) {
            return -1;
          } else if (dateA === 0 && dateB > 0) {
            return 1;
          }
          return (a.rank_position || 999) - (b.rank_position || 999);
        });
        setRankedBooks(sorted);
      } else {
        // Fetch currently reading books
        const readingResponse = await apiService.getShelf('currently_reading', 1000, 0);
        setCurrentlyReading(readingResponse.books);

        // Fetch want to read books
        const wantResponse = await apiService.getShelf('want_to_read', 1000, 0);
        setWantToRead(wantResponse.books);

        // Fetch all ranked books (read books)
        const rankedResponse = await apiService.getRankings();
        
        // Welcome modal check happens in useEffect when user email and books are available
        // Sort by date_finished (most recent first), then by rank position as secondary sort
        const sorted = [...rankedResponse].sort((a: Book, b: Book) => {
          // Parse date_finished - handles YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, and ISO timestamp formats
          const getDateValue = (dateStr: string | undefined): number => {
            if (!dateStr) return 0;
            try {
              // Try parsing the full string (handles YYYY-MM-DD HH:MM:SS, ISO timestamps, etc.)
              const date = new Date(dateStr);
              return date.getTime();
            } catch {
              return 0;
            }
          };
          
          const dateA = getDateValue(a.date_finished);
          const dateB = getDateValue(b.date_finished);
          
          // First, sort by date_finished (most recent first)
          if (dateA > 0 && dateB > 0) {
            if (dateB !== dateA) {
              return dateB - dateA; // Descending order (newest first)
            }
          } else if (dateA > 0 && dateB === 0) {
            return -1; // Books with date_finished come first
          } else if (dateA === 0 && dateB > 0) {
            return 1;
          }
          // If same date/time or no date, sort by rank position as secondary
          return (a.rank_position || 999) - (b.rank_position || 999);
        });
        console.log('Ranked books sorted by date:', sorted.slice(0, 5).map(b => ({ title: b.title, date: b.date_finished, rank: b.rank_position })));
        setRankedBooks(sorted);
      }
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

  // Check welcome modal when user email and books are both available
  useEffect(() => {
    if (currentUserEmail && !loading) {
      checkAndShowWelcomeModal(currentUserEmail, currentlyReading, wantToRead, rankedBooks);
    }
  }, [currentUserEmail, currentlyReading, wantToRead, rankedBooks, loading, checkAndShowWelcomeModal]);

  const fetchCurrentGoal = async (goalData?: any) => {
    // If goal data is passed directly (from setGoal response), use it
    if (goalData) {
      console.log('Using provided goal data:', JSON.stringify(goalData, null, 2));
      setCurrentGoal(goalData);
      return;
    }
    
    // Otherwise fetch from API
    try {
      console.log('Fetching current goal from API...');
      let goal;
      if (isPublicView && publicUsername) {
        goal = await apiService.getPublicGoal(publicUsername);
      } else {
        goal = await apiService.getCurrentGoal();
      }
      console.log('API Response - goal:', JSON.stringify(goal, null, 2));
      console.log('Goal type:', typeof goal);
      console.log('Goal is null?', goal === null);
      console.log('Goal is undefined?', goal === undefined);
      
      if (goal) {
        console.log('Setting goal to state');
        setCurrentGoal(goal);
      } else {
        console.log('No goal found, setting null');
        setCurrentGoal(null);
      }
    } catch (error) {
      console.error('Error fetching current goal:', error);
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

  const sortBooks = (books: Book[], order: string): Book[] => {
    const sorted = [...books];
    
    if (order === 'title_asc') {
      sorted.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (order === 'author_asc') {
      sorted.sort((a, b) => {
        const authorA = (a.author || '').toLowerCase();
        const authorB = (b.author || '').toLowerCase();
        return authorA.localeCompare(authorB);
      });
    }
    
    return sorted;
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
        let filteredRanked = applySearchAndTagFilters(rankedBooks);
        
        // Sort ranked books by rank_position (ascending) so highest ranked books (1, 2, 3...) appear first
        // Only sort if no custom sortOrder is applied (custom sort will override this)
        if (sortOrder === 'none') {
          filteredRanked = [...filteredRanked].sort((a: Book, b: Book) => {
            return (a.rank_position || 999) - (b.rank_position || 999);
          });
        }
        
        topShelfBooks = [...filteredCurrentlyReading, ...filteredWantToRead];
        
        // Insert bookend separator if we have both top shelf books and ranked books
        if (topShelfBooks.length > 0 && filteredRanked.length > 0) {
          const bookend: Book = {
            title: '__BOOKEND__',
            author: '__BOOKEND__',
            dimensions: '1.5x1x9', // Will be overridden by bookend generator
          } as Book;
          allBooks = [...topShelfBooks, bookend, ...filteredRanked];
        } else {
          allBooks = [...topShelfBooks, ...filteredRanked];
        }
      } else {
        // Specific shelf filter active - use the appropriate shelf
        let filtered: Book[];
        
        if (shelfFilter === 'currently_reading') {
          filtered = applySearchAndTagFilters(currentlyReading);
        } else if (shelfFilter === 'want_to_read') {
          filtered = applySearchAndTagFilters(wantToRead);
        } else if (shelfFilter === 'read') {
          filtered = applySearchAndTagFilters(rankedBooks);
          // Sort ranked books by rank_position (ascending) so highest ranked books appear first
          if (sortOrder === 'none') {
            filtered = [...filtered].sort((a: Book, b: Book) => {
              return (a.rank_position || 999) - (b.rank_position || 999);
            });
          }
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
          // Sort ranked books by rank_position (ascending) so highest ranked books appear first
          if (sortOrder === 'none') {
            filtered = [...filtered].sort((a: Book, b: Book) => {
              return (a.rank_position || 999) - (b.rank_position || 999);
            });
          }
        } else {
          filtered = [];
        }
        
        topShelfBooks = [];
        allBooks = filtered;
      }
      
      // Apply sorting if specified
      if (sortOrder !== 'none') {
        // Separate bookend from other books
        const bookendIndex = allBooks.findIndex(b => b.title === '__BOOKEND__' && b.author === '__BOOKEND__');
        let bookend: Book | null = null;
        
        if (bookendIndex !== -1) {
          bookend = allBooks[bookendIndex];
          // Split into before and after bookend
          const beforeBookend = allBooks.slice(0, bookendIndex);
          const afterBookend = allBooks.slice(bookendIndex + 1);
          
          // Sort both sections
          const sortedBefore = sortBooks(beforeBookend, sortOrder);
          const sortedAfter = sortBooks(afterBookend, sortOrder);
          
          // Recombine with bookend
          allBooks = [...sortedBefore, bookend, ...sortedAfter];
        } else {
          // No bookend, sort all books
          allBooks = sortBooks(allBooks, sortOrder);
        }
      }
      
      if (allBooks.length === 0) {
        setRendering(false);
        renderingRef.current = false;
        setShelfImage(null);
        return;
      }

      const rendererBooks = allBooks.map(book => {
        // Get custom color and font overrides if exist
        const customColor = getBookColor(book.id);
        const customFont = getBookFont(book.id);
        return {
          ...book,
          dimensions: book.dimensions || '6x1x9',
          domColor: customColor || book.dom_color || '#888888',
          spineFont: customFont, // Individual book font override
          book_id: String(book.id || ''),
          title: book.title,
          author: book.author
        } as any;
      });

      // Calculate which shelf labels to show based on book count and filter
      let labels: string[];
      
      if (shelfFilter === 'all') {
        labels = ['', ''];  // No labels
      } else {
        // No labels for filtered view
        labels = [''];
      }
      
      const renderer = new BookshelfRenderer({
        books: rendererBooks,
        shelfWidthInches: 50,  // Wider shelf
        shelfHeightInches: 18,  // Taller to fit more shelves
        borderWidthInches: 1,
        bookScaleFactor: 0.6,  // Zoom out to 60% to see more books
        shelfLabels: labels,
        cascadeDelayMs: 15,  // 15ms delay between each book for fast cascade (adjust: 0-200ms)
        shelfBgColor: currentTheme.shelfBgColor,
        shelfFgColor: currentTheme.shelfFgColor,
        spineFont: currentTheme.spineFont || 'serif',
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
    if (!hoverCanvasRef.current || !canvasRef.current || bookPositions.length === 0) return;
    
    // Use base canvas for coordinate calculation (where books are actually positioned)
    const baseCanvas = canvasRef.current;
    const baseRect = baseCanvas.getBoundingClientRect();
    
    // Calculate scale factors (internal canvas size / displayed size)
    const scaleX = baseCanvas.width / baseRect.width;
    const scaleY = baseCanvas.height / baseRect.height;
    
    // Transform mouse coords from display space to internal canvas space
    const x = (event.clientX - baseRect.left) * scaleX;
    const y = (event.clientY - baseRect.top) * scaleY;

    // Find all books that contain the click point
    const overlappingBooks = bookPositions.filter(pos => 
      x >= pos.x && x <= pos.x + pos.width &&
      y >= pos.y && y <= pos.y + pos.height
    );

    if (overlappingBooks.length === 0) return;

    // If multiple books overlap, find the one whose center is closest to the click point
    let clickedBook = overlappingBooks[0];
    if (overlappingBooks.length > 1) {
      let minDistance = Infinity;
      for (const book of overlappingBooks) {
        const centerX = book.x + book.width / 2;
        const centerY = book.y + book.height / 2;
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          clickedBook = book;
        }
      }
    }

    if (clickedBook) {
      const fullBook = [...currentlyReading, ...wantToRead, ...rankedBooks].find(
        b => b.title === clickedBook.book.title && b.author === clickedBook.book.author
      );
      // In public view, books already have tags from the public shelf API
      // In private view, fetch full book data to ensure we have tags
      if (fullBook?.id && !isPublicView) {
        apiService.getBook(fullBook.id).then(bookWithTags => {
          setSelectedBook(bookWithTags);
        }).catch(error => {
          console.error('Failed to fetch book details:', error);
          setSelectedBook(fullBook);
        });
      } else {
        // For public view, use the book data as-is (it already has tags)
        setSelectedBook(fullBook || null);
      }
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hoverCanvasRef.current || !canvasRef.current || bookPositions.length === 0) return;
    
    const hoverCanvas = hoverCanvasRef.current;
    const baseCanvas = canvasRef.current;
    
    // Get positions of both canvases
    const baseRect = baseCanvas.getBoundingClientRect();
    
    // Calculate scale factors using BASE canvas (where books are actually positioned)
    const scaleX = baseCanvas.width / baseRect.width;
    const scaleY = baseCanvas.height / baseRect.height;
    
    // Transform mouse coords to base canvas coordinate system
    const mouseOnBaseDisplayX = event.clientX - baseRect.left;
    const mouseOnBaseDisplayY = event.clientY - baseRect.top;
    
    // Scale to internal canvas coordinates
    const x = mouseOnBaseDisplayX * scaleX;
    const y = mouseOnBaseDisplayY * scaleY;

    // Find hovered book
    const hovered = bookPositions.find(pos => 
      x >= pos.x && x <= pos.x + pos.width &&
      y >= pos.y && y <= pos.y + pos.height
    );

    // Ignore bookends for hover effect
    if (hovered && hovered.book.title === '__BOOKEND__' && hovered.book.author === '__BOOKEND__') {
      setHoveredBook(null);
      hoverCanvas.style.cursor = '';
    } else {
      setHoveredBook(hovered || null);
      // Use RPGUI pointer cursor for hovering books
      hoverCanvas.style.cursor = hovered ? "url('/rpgui/img/cursor/point.png') 10 0, auto" : '';
    }
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

  const handleGoalClick = async () => {
    if (!currentGoal) return;
    
    try {
      let response;
      if (isPublicView && publicUsername) {
        response = await apiService.getPublicGoalBooks(publicUsername, currentGoal.year);
      } else {
        response = await apiService.getGoalBooks(currentGoal.year);
      }
      setGoalBooks(response.books || []);
      setShowGoalBooksModal(true);
    } catch (error) {
      toast.error('Failed to load goal books');
      console.error(error);
    }
  };

  const handleShelfClick = (books: Book[], title: string) => {
    let sortedBooks = [...books];
    
    // Sort Read books by date_finished (most recent first)
    if (title === 'Read') {
      sortedBooks.sort((a, b) => {
        // Parse date_finished - handles YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, and ISO timestamp formats
        const getDateValue = (dateStr: string | undefined): number => {
          if (!dateStr) return 0;
          try {
            // Try parsing the full string (handles YYYY-MM-DD HH:MM:SS, ISO timestamps, etc.)
            const date = new Date(dateStr);
            return date.getTime();
          } catch {
            return 0;
          }
        };
        
        const dateA = getDateValue(a.date_finished);
        const dateB = getDateValue(b.date_finished);
        
        // Books with date_finished come first
        if (dateA > 0 && dateB === 0) return -1;
        if (dateA === 0 && dateB > 0) return 1;
        
        // If both have date_finished, sort by date/time (most recent first)
        if (dateA > 0 && dateB > 0) {
          return dateB - dateA; // Descending order (newest first)
        }
        
        // If neither has date_finished, maintain original order
        return 0;
      });
    }
    
    setShelfModalBooks(sortedBooks);
    setShelfModalTitle(title);
    setShowShelfModal(true);
  };

  const handleBookAdded = () => {
    setShowAddBookModal(false);
    fetchBooks();
    fetchTags(); // Refresh tags list to include any newly created tags
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

  const handleReadingStateChange = async (bookId: number, newState: string) => {
    try {
      await apiService.setReadingState(bookId, newState, {
        date_started: newState === 'currently_reading' ? new Date().toISOString() : undefined,
        date_finished: newState === 'read' ? new Date().toISOString() : undefined
      });
      
      // Update the selected book's reading state
      if (selectedBook && selectedBook.id === bookId) {
        const updatedBook = await apiService.getBook(bookId);
        setSelectedBook(updatedBook);
      }
      
      // Refresh all books to update the shelves
      fetchBooks();
      
      // Refresh goal if book was moved to/from read state (affects goal progress)
      if (newState === 'read' || selectedBook?.reading_state === 'read') {
        fetchCurrentGoal();
      }
      
      toast.success('Book status updated!');
    } catch (error) {
      toast.error('Failed to update book status');
      console.error(error);
    }
  };

  // Theme management functions
  const handleApplyTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    toast.success(`Applied theme: ${theme.name}`);
  };

  const handleSaveTheme = (theme: Theme) => {
    setSavedThemes(prev => [...prev, theme]);
    toast.success(`Theme "${theme.name}" saved!`);
  };

  const handleDeleteTheme = (themeId: string) => {
    setSavedThemes(prev => prev.filter(t => t.id !== themeId));
    if (currentTheme.id === themeId) {
      setCurrentTheme(DEFAULT_THEME);
    }
    toast.success('Theme deleted');
  };

  const handleUpdateShelfColors = (bgColor: string, fgColor: string) => {
    setCurrentTheme(prev => ({
      ...prev,
      shelfBgColor: bgColor,
      shelfFgColor: fgColor,
    }));
    toast.success('Shelf colors updated!');
  };

  const handleBookColorChange = (bookId: number, color: string) => {
    setCurrentTheme(prev => {
      const existingColorIndex = prev.bookColors.findIndex(bc => bc.bookId === bookId);
      let newBookColors: BookColorOverride[];
      
      if (existingColorIndex >= 0) {
        // Update existing color
        newBookColors = [...prev.bookColors];
        newBookColors[existingColorIndex] = { bookId, color };
      } else {
        // Add new color override
        newBookColors = [...prev.bookColors, { bookId, color }];
      }
      
      return {
        ...prev,
        bookColors: newBookColors,
      };
    });
    
    toast.success('Book color updated!');
  };

  const getBookColor = (bookId: number | undefined): string | undefined => {
    if (!bookId) return undefined;
    const override = currentTheme.bookColors.find(bc => bc.bookId === bookId);
    return override?.color;
  };

  const getBookFont = (bookId: number | undefined): string | undefined => {
    if (!bookId) return undefined;
    const override = currentTheme.bookFonts?.find(bf => bf.bookId === bookId);
    return override?.font;
  };

  const handleBookFontChange = (bookId: number, font: string) => {
    setCurrentTheme(prev => {
      const existingFontIndex = (prev.bookFonts || []).findIndex(bf => bf.bookId === bookId);
      let newBookFonts: BookFontOverride[];
      
      if (existingFontIndex >= 0) {
        // Update existing font
        newBookFonts = [...(prev.bookFonts || [])];
        newBookFonts[existingFontIndex] = { bookId, font };
      } else {
        // Add new font override
        newBookFonts = [...(prev.bookFonts || []), { bookId, font }];
      }
      
      return {
        ...prev,
        bookFonts: newBookFonts,
      };
    });
    // Regenerate bookshelf to apply the font change
    generateBookshelf();
    
    // Trigger re-render
    generateBookshelf();
  };

  const handleApplyBulkBookColors = (colorScheme: string) => {
    // Color schemes mapping
    const schemes: Record<string, string[]> = {
      pastels: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FFD8E4', '#C9E4DE', '#E4C9E4', '#C9D8E4'],
      vibrant: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#C7CEEA', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'],
      blues: ['#A8DADC', '#457B9D', '#1D3557', '#F1FAEE', '#2A9D8F', '#264653', '#3A86FF', '#8AC4D0', '#5A7D9A', '#ADEFD1'],
      reds: ['#C1666B', '#D4A5A5', '#9A031E', '#FFB3B3', '#D6536D', '#EFB0A1', '#FF6B6B', '#C84B31', '#FF9AA2', '#D96C6C'],
      earth: ['#8B7355', '#A0826D', '#C9B8A8', '#E8DCC4', '#B8A898', '#D4C5B9', '#A89F91', '#C2A878', '#D2B48C', '#E6D5B8'],
      purples: ['#B794F4', '#9F7AEA', '#805AD5', '#6B46C1', '#D6BCFA', '#E9D8FD', '#A78BFA', '#C084FC', '#DDD6FE', '#8B5CF6'],
      greens: ['#2F4F4F', '#556B2F', '#6B8E23', '#8FBC8F', '#90EE90', '#98FB98', '#66CDAA', '#48D1CC', '#7FFFD4', '#40E0D0'],
      monochrome: ['#F8F9FA', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD', '#6C757D', '#495057', '#343A40', '#212529', '#FFFFFF'],
    };

    const colors = schemes[colorScheme] || [];
    const allBooks = [...currentlyReading, ...wantToRead, ...rankedBooks];
    
    // Apply colors in rotation to all books
    const newBookColors = allBooks.map((book, index) => ({
      bookId: book.id!,
      color: colors[index % colors.length]
    })).filter(bc => bc.bookId !== undefined);

    setCurrentTheme(prev => ({
      ...prev,
      bookColors: newBookColors,
    }));

    toast.success(`Applied ${colorScheme} color scheme to all books!`);
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

    // Calculate the offset between the two canvases to adjust drawing
    const baseRect = baseCanvas.getBoundingClientRect();
    const hoverRect = hoverCanvas.getBoundingClientRect();
    const canvasOffsetX = baseRect.left - hoverRect.left;
    const canvasOffsetY = baseRect.top - hoverRect.top;
    
    // Calculate scale factor to convert from canvas internal coords to displayed coords
    const scaleX = baseRect.width / baseCanvas.width;
    const scaleY = baseRect.height / baseCanvas.height;
    
    // Scale the offset back to internal canvas coordinates
    const offsetInCanvasX = canvasOffsetX / scaleX;
    const offsetInCanvasY = canvasOffsetY / scaleY;

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
    
    // Adjust drawing position for canvas offset
    const drawX = hoveredBook.x + offsetInCanvasX;
    const drawY = hoveredBook.y + offsetInCanvasY;
    
    // Step 2: Fill original position completely with shelf color (hide original book)
    hoverCtx.fillStyle = '#8B6F47';
    hoverCtx.fillRect(drawX, drawY, hoveredBook.width, hoveredBook.height);
    
    // Step 3: Draw extracted book at lifted position (same size, just moved up)
    hoverCtx.drawImage(
      tempCanvas,
      drawX - 5,
      drawY - LIFT_DISTANCE - 5
    );
    
    // Step 4: Gold border around lifted book (no padding on border)
    hoverCtx.strokeStyle = '#FFD700';
    hoverCtx.lineWidth = 3;
    hoverCtx.strokeRect(
      drawX,
      drawY - LIFT_DISTANCE,
      hoveredBook.width,
      hoveredBook.height
    );
  }, [hoveredBook]);

  // Handle ESC key to close modals
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedBook) {
          setSelectedBook(null);
        } else if (showImportModal) {
          setShowImportModal(false);
        } else if (showShelfModal) {
          setShowShelfModal(false);
        } else if (showGoalBooksModal) {
          setShowGoalBooksModal(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedBook, showImportModal, showShelfModal, showGoalBooksModal]);

  // Trigger hover effect redraw when hoveredBook changes or canvas updates
  React.useEffect(() => {
    drawHoverEffect();
  }, [drawHoverEffect, bookPositions]); // Redraw on position updates (which happen during cascade)

  // Ensure hover canvas matches base canvas size and position EXACTLY
  React.useEffect(() => {
    if (!hoverCanvasRef.current || !canvasRef.current) return;
    
    const hoverCanvas = hoverCanvasRef.current;
    const baseCanvas = canvasRef.current;
    
    // Sync internal canvas dimensions
    if (hoverCanvas.width !== baseCanvas.width || hoverCanvas.height !== baseCanvas.height) {
      hoverCanvas.width = baseCanvas.width;
      hoverCanvas.height = baseCanvas.height;
    }
    
    // Get base canvas position and size
    const baseRect = baseCanvas.getBoundingClientRect();
    const parentRect = hoverCanvas.parentElement?.getBoundingClientRect();
    
    if (parentRect) {
      // Calculate where the base canvas is relative to the parent
      const offsetLeft = baseRect.left - parentRect.left;
      const offsetTop = baseRect.top - parentRect.top;
      
      // Force hover canvas to exact same position and size as base canvas
      hoverCanvas.style.left = `${offsetLeft}px`;
      hoverCanvas.style.top = `${offsetTop}px`;
      hoverCanvas.style.width = `${baseRect.width}px`;
      hoverCanvas.style.height = `${baseRect.height}px`;
    }
    
    // Keep hover canvas clear when not hovering
    const ctx = hoverCanvas.getContext('2d');
    if (ctx && !hoveredBook) {
      ctx.clearRect(0, 0, hoverCanvas.width, hoverCanvas.height);
    }
    
    // If we're hovering, schedule hover redraw
    if (hoveredBook && ctx) {
      requestAnimationFrame(() => drawHoverEffect());
    }
  }, [shelfImage, rendering, bookPositions, hoveredBook, drawHoverEffect]);

  return (
    <div className="home-container">
      <div className="home-sidebar" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
        {isEditingTitle ? (
          <div 
            className="title-edit-container"
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            <input
              type="text"
              className="title-edit-input"
              value={titleInputValue}
              onChange={(e) => setTitleInputValue(e.target.value)}
              onBlur={() => {
                if (titleInputValue.trim()) {
                  const newTitle = titleInputValue.trim();
                  setBookshelfTitle(newTitle);
                  // Save with user-specific key if available
                  if (currentUserEmail) {
                    localStorage.setItem(`bookshelf_title_${currentUserEmail}`, newTitle);
                  } else {
                    // Fallback to non-user-specific key (shouldn't happen normally)
                    localStorage.setItem('bookshelf_title', newTitle);
                  }
                } else {
                  setTitleInputValue(bookshelfTitle);
                }
                setIsEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                  setTitleInputValue(bookshelfTitle);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
            />
          </div>
        ) : (
          <h1 
            className="home-title"
            onDoubleClick={() => {
              if (isPublicView) {
                handleBlockedAction();
              } else {
                setTitleInputValue(bookshelfTitle);
                setIsEditingTitle(true);
              }
            }}
            style={{ cursor: isPublicView ? "url('/rpgui/img/cursor/default.png'), auto" : "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
            title={isPublicView ? undefined : "Double-click to edit"}
          >
            {bookshelfTitle}
          </h1>
        )}
        
        {/* Add Book Section */}
        <div className="sidebar-section">
          <button 
            className="primary-button"
            onClick={() => {
              console.log('Add Book button clicked. isPublicView:', isPublicView);
              if (isPublicView) {
                console.log('Blocking action - public view');
                handleBlockedAction();
              } else {
                console.log('Opening Add Book modal');
                setShowAddBookModal(true);
              }
            }}
          >
            + Add New Book
          </button>
        </div>

        {/* Reading Goal Section */}
        <div className="sidebar-section">
          {currentGoal ? (
            isGoalCompleted(currentGoal) ? (
              <div className="goal-completed-container">
                <div className="goal-completed">
                  <div className="goal-completed-icon"></div>
                  <h3>Goal Completed!</h3>
                  <p className="goal-completed-text">
                    You've read <strong>{currentGoal.completed}</strong> books this {currentGoal.period}!
                  </p>
                  <button 
                    className="set-goal-button"
                    onClick={() => {
                      if (isPublicView) {
                        handleBlockedAction();
                      } else {
                        setShowGoalModal(true);
                      }
                    }}
                  >
                    Set New Goal
                  </button>
                </div>
              </div>
            ) : isGoalExpired(currentGoal) ? (
              <div className="goal-expired-container">
                <div className="goal-expired">
                  <div className="goal-expired-icon"></div>
                  <h3>Goal Expired</h3>
                  <p className="goal-expired-text">
                    Your {currentGoal.period === 'year' ? 'annual' : currentGoal.period === 'month' ? 'monthly' : 'weekly'} goal from {currentGoal.year} has ended.
                  </p>
                  <button 
                    className="set-goal-button"
                    onClick={() => {
                      if (isPublicView) {
                        handleBlockedAction();
                      } else {
                        setShowGoalModal(true);
                      }
                    }}
                  >
                    Set New Goal
                  </button>
                </div>
              </div>
            ) : (
              <div className="goal-display-container">
                <div 
                  className="goal-display"
                  onClick={handleGoalClick}
                  style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                  title="Click to view books contributing to this goal"
                >
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
                  onClick={() => {
                    if (isPublicView) {
                      handleBlockedAction();
                    } else {
                      setShowGoalModal(true);
                    }
                  }}
                  title={isPublicView ? undefined : "Edit goal"}
                >
                  ⋮
                </button>
              </div>
            )
          ) : (
            <button 
              className="set-goal-button"
              onClick={() => {
                if (isPublicView) {
                  handleBlockedAction();
                } else {
                  setShowGoalModal(true);
                }
              }}
            >
              Set Goal
            </button>
          )}
        </div>

        {/* Stats Section */}
        <div className="sidebar-section">
          <div className="stats-column">
            <div 
              className="stat-item stat-item-clickable"
              onClick={() => handleShelfClick(wantToRead, 'Want to Read')}
              title="Click to view all Want to Read books"
              style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
            >
              <span className="stat-number">{wantToRead.length}</span>
              <span className="stat-label">Want to Read</span>
            </div>
            <div 
              className="stat-item stat-item-clickable"
              onClick={() => handleShelfClick(currentlyReading, 'Currently Reading')}
              title="Click to view all Currently Reading books"
              style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
            >
              <span className="stat-number">{currentlyReading.length}</span>
              <span className="stat-label">Currently Reading</span>
            </div>
            <div 
              className="stat-item stat-item-clickable"
              onClick={() => handleShelfClick(rankedBooks, 'Read')}
              title="Click to view all Read books"
              style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
            >
              <span className="stat-number">{rankedBooks.length}</span>
              <span className="stat-label">Read</span>
            </div>
          </div>
        </div>

        {/* Rankings Section */}
        <div className="sidebar-section">
          <button 
            className="primary-button"
            onClick={() => setShowRankingsModal(true)}
          >
            Rankings
          </button>
        </div>

        {/* Import Section */}
        <div className="sidebar-section">
          <button 
            className="secondary-button"
            onClick={() => {
              if (isPublicView) {
                handleBlockedAction();
              } else {
                setShowImportModal(true);
              }
            }}
          >
            Import from Goodreads
          </button>
        </div>

        {/* Settings Section */}
        <div className="sidebar-section">
          <button 
            className="secondary-button"
            onClick={() => {
              if (isPublicView) {
                handleBlockedAction();
              } else {
                setShowSettingsModal(true);
              }
            }}
          >
            Settings
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
              style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
            />
            <select
              className="filter-select"
              value={shelfFilter}
              onChange={(e) => setShelfFilter(e.target.value)}
              style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
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
              style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
            <select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
            >
              <option value="none">No Sort</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="author_asc">Author (A-Z)</option>
            </select>
            <button 
              className="theme-button"
              onClick={() => {
                if (isPublicView) {
                  handleBlockedAction();
                } else {
                  setShowThemeManager(true);
                }
              }}
              title={isPublicView ? undefined : "Customize bookshelf theme"}
            >
              Colors
            </button>
          </div>
        </div>

        {/* Two-canvas approach: base + hover overlay for smooth cascade with hover */}
        {(rendering || shelfImage) && (
          <div 
            className="bookshelf-display" 
            style={{ 
              position: 'relative',
              cursor: "url('/rpgui/img/cursor/default.png'), auto"
            }}
          >
            <canvas 
              ref={canvasRef}
              className="bookshelf-canvas"
              style={{ 
                display: 'block',
                cursor: "url('/rpgui/img/cursor/default.png'), auto"
              }}
            />
            <canvas 
              ref={hoverCanvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoveredBook(null)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'auto',
                borderRadius: '8px',
                cursor: "url('/rpgui/img/cursor/default.png'), auto"
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
            <h3 style={{ textAlign: 'center' }}>by {selectedBook.author}</h3>
            {selectedBook.cover_image_url && (
              <img src={selectedBook.cover_image_url} alt={selectedBook.title} className="modal-book-cover" />
            )}
            <div className="modal-book-details">
              {selectedBook.pub_date && <p><strong>Published:</strong> {selectedBook.pub_date}</p>}
              {selectedBook.num_pages && <p><strong>Pages:</strong> {selectedBook.num_pages}</p>}
              {selectedBook.genre && <p><strong>Genre:</strong> {selectedBook.genre}</p>}
              {!(selectedBook.reading_state === 'read' || selectedBook.rank_position) && (
                <p>
                  <strong>Status:</strong>{' '}
                  <select
                    value={selectedBook.reading_state || 'want_to_read'}
                    onChange={(e) => {
                      if (selectedBook.id) {
                        handleReadingStateChange(selectedBook.id, e.target.value);
                      }
                    }}
                    style={{ 
                      cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer",
                      marginLeft: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      fontSize: '1rem',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value="want_to_read">Want to Read</option>
                    <option value="currently_reading">Currently Reading</option>
                    <option value="read">Read</option>
                  </select>
                </p>
              )}
              {selectedBook.initial_stars !== null && selectedBook.initial_stars !== undefined && (
                <p>
                  <strong>Rating:</strong>{' '}
                  {selectedBook.initial_stars > 0 
                    ? '⭐'.repeat(selectedBook.initial_stars)
                    : 'Unrated'}
                </p>
              )}
              {selectedBook.rank_position && (
                <p><strong>Rank:</strong> #{selectedBook.rank_position}</p>
              )}
              {selectedBook.notes && <p><strong>Notes:</strong> {selectedBook.notes}</p>}
              {selectedBook.tags && selectedBook.tags.length > 0 && (
                <p>
                  <strong>Tags:</strong>{' '}
                  {selectedBook.tags.map((tag, index) => (
                    <span
                      key={tag.id}
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        margin: '2px',
                        backgroundColor: tag.color || '#3498db',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </p>
              )}
            </div>

            {/* Book Color Customization */}
            <div className="book-color-section">
              <h4>Customize Book Spine Color</h4>
              <div className="book-color-picker-full">
                {/* Preset Colors */}
                <div className="book-preset-colors">
                  {[
                    '#E8DCC4', '#D4C5B9', '#C9B8A8', '#C8B6A6', '#B8A898', // Browns
                    '#A8B8C8', '#B5C4D8', '#9EAEC0', '#C5D3E0', '#8B9DAF', // Blues
                    '#C89B9B', '#B89090', '#D4A8A8', '#C08080', '#B8A0A0', // Reds
                    '#A8B8A0', '#9BAA92', '#B5C4B0', '#8FA088', '#A0AFA0', // Greens
                    '#E6B8D0', '#D8A8C8', '#C898B8', '#B888A8', '#A87898', // Purples/Pinks
                    '#F0D8A8', '#E8C898', '#D8B888', '#C8A878', '#B89868', // Golds/Yellows
                  ].map(color => (
                    <button
                      key={color}
                      className="book-color-swatch"
                      style={{ 
                        backgroundColor: color,
                        '--book-swatch-color': color
                      } as React.CSSProperties}
                      onClick={() => {
                        if (selectedBook.id) {
                          handleBookColorChange(selectedBook.id, color);
                        }
                      }}
                      title={color}
                    />
                  ))}
                </div>
                {/* Custom Color Picker */}
                <div 
                  className="book-color-custom"
                  style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                >
                  <label style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}>Custom Color:</label>
                  <input
                    type="color"
                    value={getBookColor(selectedBook.id) || selectedBook.dom_color || '#888888'}
                    onChange={(e) => {
                      if (selectedBook.id) {
                        handleBookColorChange(selectedBook.id, e.target.value);
                      }
                    }}
                    style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                  />
                  <span className="current-color-label">
                    {getBookColor(selectedBook.id) || selectedBook.dom_color || '#888888'}
                  </span>
                  {getBookColor(selectedBook.id) && (
                    <button
                      className="reset-color-button"
                      onClick={() => {
                        if (selectedBook.id) {
                          setCurrentTheme(prev => ({
                            ...prev,
                            bookColors: prev.bookColors.filter(bc => bc.bookId !== selectedBook.id),
                          }));
                          toast.success('Book color reset to default');
                        }
                      }}
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Book Font Customization */}
            <div className="book-font-section">
              <h4>Customize Book Spine Font</h4>
              <div className="book-font-picker">
                <select 
                  className="book-font-selector"
                  value={getBookFont(selectedBook.id) || currentTheme.spineFont || 'serif'}
                  onChange={(e) => {
                    if (selectedBook.id) {
                      handleBookFontChange(selectedBook.id, e.target.value);
                    }
                  }}
                  style={{ 
                    fontFamily: getBookFont(selectedBook.id) || currentTheme.spineFont || 'serif',
                    '--select-font-family': getBookFont(selectedBook.id) || currentTheme.spineFont || 'serif'
                  } as React.CSSProperties}
                >
                  <option value="serif" style={{ '--option-font-family': 'serif' } as React.CSSProperties}>Serif (Classic)</option>
                  <option value="sans-serif" style={{ '--option-font-family': 'sans-serif' } as React.CSSProperties}>Sans-Serif (Modern)</option>
                  <option value="monospace" style={{ '--option-font-family': 'monospace' } as React.CSSProperties}>Monospace (Typewriter)</option>
                  <option value="cursive" style={{ '--option-font-family': 'cursive' } as React.CSSProperties}>Cursive (Elegant)</option>
                  <option value="fantasy" style={{ '--option-font-family': 'fantasy' } as React.CSSProperties}>Fantasy (Decorative)</option>
                  <option value="Georgia, serif" style={{ '--option-font-family': 'Georgia, serif' } as React.CSSProperties}>Georgia (Traditional)</option>
                  <option value='"Times New Roman", Times, serif' style={{ '--option-font-family': '"Times New Roman", Times, serif' } as React.CSSProperties}>Times New Roman (Formal)</option>
                  <option value='"Palatino Linotype", Palatino, serif' style={{ '--option-font-family': '"Palatino Linotype", Palatino, serif' } as React.CSSProperties}>Palatino (Literary)</option>
                  <option value="Garamond, serif" style={{ '--option-font-family': 'Garamond, serif' } as React.CSSProperties}>Garamond (Classic)</option>
                  <option value='"Bookman Old Style", serif' style={{ '--option-font-family': '"Bookman Old Style", serif' } as React.CSSProperties}>Bookman (Sturdy)</option>
                  <option value="Arial, sans-serif" style={{ '--option-font-family': 'Arial, sans-serif' } as React.CSSProperties}>Arial (Clean)</option>
                  <option value="Helvetica, Arial, sans-serif" style={{ '--option-font-family': 'Helvetica, Arial, sans-serif' } as React.CSSProperties}>Helvetica (Swiss)</option>
                  <option value="Verdana, sans-serif" style={{ '--option-font-family': 'Verdana, sans-serif' } as React.CSSProperties}>Verdana (Readable)</option>
                  <option value="Tahoma, Geneva, sans-serif" style={{ '--option-font-family': 'Tahoma, Geneva, sans-serif' } as React.CSSProperties}>Tahoma (Compact)</option>
                  <option value='"Trebuchet MS", sans-serif' style={{ '--option-font-family': '"Trebuchet MS", sans-serif' } as React.CSSProperties}>Trebuchet MS (Modern)</option>
                  <option value='"Century Gothic", sans-serif' style={{ '--option-font-family': '"Century Gothic", sans-serif' } as React.CSSProperties}>Century Gothic (Geometric)</option>
                  <option value='"Courier New", Courier, monospace' style={{ '--option-font-family': '"Courier New", Courier, monospace' } as React.CSSProperties}>Courier New (Fixed)</option>
                  <option value='"Lucida Console", Monaco, monospace' style={{ '--option-font-family': '"Lucida Console", Monaco, monospace' } as React.CSSProperties}>Lucida Console (Tech)</option>
                  <option value='"Comic Sans MS", cursive' style={{ '--option-font-family': '"Comic Sans MS", cursive' } as React.CSSProperties}>Comic Sans MS (Playful)</option>
                  <option value='"Brush Script MT", cursive' style={{ '--option-font-family': '"Brush Script MT", cursive' } as React.CSSProperties}>Brush Script (Handwritten)</option>
                  <option value="Papyrus, fantasy" style={{ '--option-font-family': 'Papyrus, fantasy' } as React.CSSProperties}>Papyrus (Ancient)</option>
                  <option value="Impact, fantasy" style={{ '--option-font-family': 'Impact, fantasy' } as React.CSSProperties}>Impact (Bold)</option>
                  <option value="Copperplate, fantasy" style={{ '--option-font-family': 'Copperplate, fantasy' } as React.CSSProperties}>Copperplate (Engraved)</option>
                </select>
                {getBookFont(selectedBook.id) && (
                  <button
                    className="reset-font-button"
                    onClick={() => {
                      if (selectedBook.id) {
                        setCurrentTheme(prev => ({
                          ...prev,
                          bookFonts: (prev.bookFonts || []).filter(bf => bf.bookId !== selectedBook.id),
                        }));
                        toast.success('Book font reset to theme default');
                        generateBookshelf();
                      }
                    }}
                  >
                    Reset to Theme Default
                  </button>
                )}
              </div>
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
                Edit Book
              </button>
              <button 
                className="delete-book-button"
                onClick={() => handleDeleteBook(selectedBook.id!)}
              >
                Delete Book
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
        onTagCreated={fetchTags}
      />

      {/* Goal Modal */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onSuccess={fetchCurrentGoal}
        currentGoal={currentGoal}
      />

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onImportClick={() => {
          if (currentUserEmail) {
            localStorage.setItem(`hasSeenWelcomeModal_${currentUserEmail}`, 'true');
          }
          setShowWelcomeModal(false);
          setShowImportModal(true);
        }}
        onSkipClick={() => {
          if (currentUserEmail) {
            localStorage.setItem(`hasSeenWelcomeModal_${currentUserEmail}`, 'true');
          }
          setShowWelcomeModal(false);
        }}
      />

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content import-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import from Goodreads</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowImportModal(false)}
                style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <GoodreadsImport />
            </div>
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
          onSuccess={async () => {
            setShowEditBookModal(false);
            // Fetch the updated book data to ensure we have the latest tags and notes
            if (selectedBook.id) {
              try {
                const updatedBook = await apiService.getBook(selectedBook.id);
                setSelectedBook(updatedBook);
                // Also refresh all books to update state arrays
                fetchBooks();
                // Refresh tags list in case new tags were created
                fetchTags();
              } catch (error) {
                console.error('Failed to fetch updated book:', error);
                // Fallback to refreshing all books
                fetchBooks();
                fetchTags();
                setSelectedBook(null);
              }
            } else {
              fetchBooks();
              fetchTags();
              setSelectedBook(null);
            }
          }}
          onRerank={handleRerankBook}
          onTagCreated={fetchTags}
        />
      )}

      {/* Theme Manager */}
      {showThemeManager && (
        <ThemeManager
          currentTheme={currentTheme}
          savedThemes={savedThemes}
          allBooks={[...currentlyReading, ...wantToRead, ...rankedBooks]}
          onApplyTheme={handleApplyTheme}
          onSaveTheme={handleSaveTheme}
          onDeleteTheme={handleDeleteTheme}
          onUpdateShelfColors={handleUpdateShelfColors}
          onApplyBulkBookColors={handleApplyBulkBookColors}
          onClose={() => setShowThemeManager(false)}
        />
      )}

      {/* Rankings Modal */}
      <RankingsModal
        isOpen={showRankingsModal}
        onClose={() => setShowRankingsModal(false)}
        onBookClick={(book) => setSelectedBook(book)}
      />

      {/* Settings Modal */}
      <Settings
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Shelf Books Modal */}
      {showShelfModal && (
        <div className="modal-overlay" onClick={() => setShowShelfModal(false)}>
          <div 
            className="modal-content rpgui-container framed-golden" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '700px', width: 'auto', minWidth: '500px' }}
          >
            <div className="modal-header">
              <h2>{shelfModalTitle}</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowShelfModal(false)}
                style={{ 
                  cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer",
                  position: 'absolute',
                  zIndex: 1000,         // Keep button on top of everything
                  // Adjust these values to position the close button from the edges
                  right: '1rem',        // Distance from right edge (decrease to move closer to edge)
                  top: '1rem'           // Distance from top edge (decrease to move closer to edge)
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden' }}>
              {shelfModalBooks.length === 0 ? (
                <p>No books in this shelf yet.</p>
              ) : (
                <div className="shelf-books-list">
                  {shelfModalBooks.map((book) => (
                    <div 
                      key={book.id} 
                      className="shelf-book-item"
                      onClick={() => {
                        setSelectedBook(book);
                        setShowShelfModal(false);
                      }}
                      style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                    >
                      <div className="shelf-book-info">
                        <h3>{book.title}</h3>
                        <p>{book.author}</p>
                        {book.rank_position && <span className="book-rank">Rank: {book.rank_position}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showGoalBooksModal && currentGoal && (
        <div className="modal-overlay" onClick={() => setShowGoalBooksModal(false)}>
          <div 
            className="modal-content rpgui-container framed-golden" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '700px', width: 'auto', minWidth: '500px' }}
          >
            <div className="modal-header">
              <h2>{currentGoal.year} Goal - {currentGoal.completed || 0} / {currentGoal.target_count} Books</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowGoalBooksModal(false)}
                style={{ 
                  cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer",
                  position: 'absolute',
                  zIndex: 1000,
                  right: '1rem',
                  top: '1rem'
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden' }}>
              {goalBooks.length === 0 ? (
                <p>No books have contributed to this goal yet.</p>
              ) : (
                <div className="shelf-books-list">
                  {goalBooks.map((book) => (
                    <div 
                      key={book.id} 
                      className="shelf-book-item"
                      onClick={() => {
                        setSelectedBook(book);
                        setShowGoalBooksModal(false);
                      }}
                      style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                    >
                      <div className="shelf-book-info">
                        <h3>{book.title}</h3>
                        <p>{book.author}</p>
                        {book.rank_position && <span className="book-rank">Rank: {book.rank_position}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

