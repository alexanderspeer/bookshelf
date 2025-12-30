import React, { useState } from 'react';
import { toast } from 'react-toastify';
import apiService from '../services/api';
import '../styles/goodreads-import.css';

export const GoodreadsImport: React.FC = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current);
    
    return result;
  };

  const cleanISBN = (isbn: string): string => {
    // Handle Goodreads CSV format: ="1234567890" or just 1234567890
    if (!isbn) return '';
    let cleaned = isbn.trim();
    // Remove Excel formula wrapper: ="..." becomes ...
    cleaned = cleaned.replace(/^="?(.*?)"?$/, '$1');
    // Remove any remaining quotes
    cleaned = cleaned.replace(/"/g, '');
    return cleaned;
  };

  const parseGoodreadsDate = (dateStr: string): string | null => {
    // Goodreads format: YYYY/MM/DD
    if (!dateStr || dateStr.trim() === '') return null;
    
    try {
      // Parse YYYY/MM/DD format
      const parts = dateStr.trim().split('/');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        // Return in ISO format YYYY-MM-DD
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (e) {
      console.warn('Failed to parse date:', dateStr);
    }
    
    return null;
  };

  const parseGoodreadsCSV = (csv: string): any[] => {
    const lines = csv.split('\n');
    if (lines.length < 2) {
      console.error('CSV file is empty or has no data rows');
      return [];
    }
    
    // Parse header line
    const headers = parseCSVLine(lines[0]);
    
    const books = [];
    
    // Parse each data line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      
      // Create object with headers as keys
      const book: any = {};
      headers.forEach((header, index) => {
        book[header] = values[index] || '';
      });
      
      // Only import books from "read" shelf
      const exclusiveShelf = book['Exclusive Shelf'] || '';
      if (exclusiveShelf.toLowerCase() === 'read') {
        const title = book['Title'] || '';
        const author = book['Author'] || '';
        
        // Skip if no title
        if (!title.trim()) {
          console.warn(`Skipping book at line ${i + 1}: no title`);
          continue;
        }
        
        const isbn = cleanISBN(book['ISBN']);
        const isbn13 = cleanISBN(book['ISBN13']);
        const myRating = book['My Rating'] || '0';
        const numPages = book['Number of Pages'] || '';
        const dateRead = book['Date Read'] || '';
        const yearPublished = book['Year Published'] || book['Original Publication Year'] || '';
        const myReview = book['My Review'] || '';
        
        // Parse rating - handle 0 explicitly (0 is valid, means unrated/not yet rated)
        // Default to 0 if no rating is provided
        let parsedRating: number = 0;
        if (myRating && myRating.trim() !== '') {
          const rating = parseFloat(myRating);
          if (!isNaN(rating)) {
            parsedRating = rating;
          }
        }
        
        books.push({
          title: title.trim(),
          author: author.trim(),
          isbn: isbn || null,
          isbn13: isbn13 || null,
          pub_date: yearPublished.trim() || null,
          num_pages: numPages ? parseInt(numPages) : null,
          date_finished: parseGoodreadsDate(dateRead),
          initial_stars: parsedRating, // Always a number, defaults to 0
          notes: myReview.trim() || null
        });
      }
    }
    
    console.log(`Parsed ${books.length} books from CSV`);
    return books;
  };

  const importBooks = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string;
        const books = parseGoodreadsCSV(csv);
        
        if (books.length === 0) {
          toast.info('No books found to import');
          setImporting(false);
          return;
        }

        setProgress({ current: 0, total: books.length });

        // Import books one by one
        let successCount = 0;
        let errorCount = 0;
        let skipCount = 0;

        // First, get existing books to check for duplicates
        const existingBooks = await apiService.listBooks({ limit: 10000 });
        const existingIsbns = new Set();
        const existingTitles = new Set();
        
        existingBooks.books?.forEach((book: any) => {
          if (book.isbn13) existingIsbns.add(book.isbn13);
          if (book.isbn) existingIsbns.add(book.isbn);
          // Also track by normalized title + author for books without ISBN
          const normalizedKey = `${book.title.toLowerCase().trim()}_${book.author?.toLowerCase().trim() || ''}`;
          existingTitles.add(normalizedKey);
        });

        for (let i = 0; i < books.length; i++) {
          try {
            const book = books[i];
            
            // Check for duplicates
            const isDuplicateByIsbn = (book.isbn13 && existingIsbns.has(book.isbn13)) || 
                                     (book.isbn && existingIsbns.has(book.isbn));
            const normalizedKey = `${book.title.toLowerCase().trim()}_${book.author?.toLowerCase().trim() || ''}`;
            const isDuplicateByTitle = existingTitles.has(normalizedKey);
            
            if (isDuplicateByIsbn || isDuplicateByTitle) {
              console.log(`Skipping duplicate: ${book.title}`);
              skipCount++;
              setProgress({ current: i + 1, total: books.length });
              continue;
            }
            
            // All books from Goodreads CSV are from "read" shelf
            await apiService.createBook(book, 'read');
            
            // Add to existing sets to catch duplicates within the import batch
            if (book.isbn13) existingIsbns.add(book.isbn13);
            if (book.isbn) existingIsbns.add(book.isbn);
            existingTitles.add(normalizedKey);
            
            successCount++;
          } catch (error: any) {
            console.error(`Failed to import: ${books[i].title}`, error);
            // Check if it's a duplicate error from backend
            if (error?.message?.toLowerCase().includes('duplicate') || 
                error?.message?.toLowerCase().includes('unique')) {
              skipCount++;
            } else {
              errorCount++;
            }
          }
          setProgress({ current: i + 1, total: books.length });
        }
        
        const message = `Import complete! ${successCount} books imported${skipCount > 0 ? `, ${skipCount} duplicates skipped` : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
        toast.success(message);
        
        // Re-rank all books based on star ratings after import
        if (successCount > 0) {
          try {
            toast.info('Organizing books by star ratings...');
            await apiService.rerankAllBooks();
            toast.success('Books organized successfully!');
          } catch (error) {
            console.error('Failed to re-rank books:', error);
            toast.warning('Books imported but ranking organization failed');
          }
          
          // Reload the page after a short delay to show the new books
          setTimeout(() => {
            window.location.reload();
          }, 2000); // 2 second delay to let user see the success message
        }

      } catch (error) {
        toast.error('Failed to parse CSV file');
        console.error(error);
      } finally {
        setImporting(false);
        setProgress({ current: 0, total: 0 });
      }
    };

    reader.readAsText(csvFile);
  };

  const deleteAllBooks = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setDeleting(true);
    try {
      // Get all books
      const response = await apiService.listBooks({ limit: 10000 });
      const books = response.books || [];
      
      if (books.length === 0) {
        toast.info('No books to delete');
        setDeleting(false);
        setShowDeleteConfirm(false);
        return;
      }

      // Delete each book
      let deletedCount = 0;
      for (const book of books) {
        try {
          await apiService.deleteBook(book.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete book ${book.id}:`, error);
        }
      }

      toast.success(`Deleted ${deletedCount} books`);
      
      // Reload page after deletion
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('Failed to delete books');
      console.error(error);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="goodreads-import-container">
      <div className="import-instructions">
        <h3>Export your Goodreads library as a CSV</h3>
        <ol>
          <li>Go to Goodreads and log in.</li>
          <li>Click <strong>My Books</strong> in the top navigation bar.</li>
          <li>On the left side of the page, scroll to the <strong>Tools</strong> section.</li>
          <li>Under Tools, click <strong>Import and Export</strong>.</li>
          <li>At the top of the page, select <strong>Export Library</strong>.</li>
          <li>Download the generated CSV file when it is ready.</li>
          <li>Upload the CSV file here using the button below.</li>
        </ol>
        
        <div className="import-note">
          <strong>Note:</strong> Only books from your "Read" shelf will be imported.
        </div>
      </div>

      <div className="import-section">
        <div className="file-input-wrapper">
          <label 
            htmlFor="csv-upload" 
            className="file-label"
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            {csvFile ? csvFile.name : 'Choose CSV File'}
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <button
          className="import-btn"
          onClick={importBooks}
          disabled={!csvFile || importing}
          style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
        >
          {importing ? 'Importing...' : 'Import Books'}
        </button>
      </div>

      {importing && (
        <div className="import-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p>Importing {progress.current} of {progress.total} books...</p>
        </div>
      )}

      <div className="import-warnings">
        <h3>Important Notes:</h3>
        <ul>
          <li>Duplicate books (by ISBN) will be skipped</li>
          <li>Star ratings from Goodreads will be saved as initial ratings</li>
          <li>Reading dates from Goodreads will be preserved</li>
          <li>Your reviews/notes from Goodreads will be imported</li>
          <li>You'll need to upload spine images separately for visualization</li>
          <li>You can rank books later using the ranking wizard</li>
        </ul>
      </div>

      <div className="danger-zone">
        <h3>Testing Tools</h3>
        <p className="danger-warning">
          ⚠️ Danger Zone: The following actions cannot be undone!
        </p>
        <button
          className={showDeleteConfirm ? "delete-confirm-btn" : "delete-btn"}
          onClick={deleteAllBooks}
          disabled={deleting || importing}
          style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
        >
          {deleting 
            ? 'Deleting...' 
            : showDeleteConfirm 
            ? 'Click Again to Confirm Delete All' 
            : 'Delete All My Books (Testing Only)'}
        </button>
        {showDeleteConfirm && (
          <button
            className="cancel-btn"
            onClick={() => setShowDeleteConfirm(false)}
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

