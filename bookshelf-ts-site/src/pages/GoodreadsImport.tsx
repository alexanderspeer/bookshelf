import React, { useState } from 'react';
import { toast } from 'react-toastify';
import apiService from '../services/api';

export const GoodreadsImport: React.FC = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const parseGoodreadsCSV = (csv: string): any[] => {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const books = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Simple CSV parsing (for more complex CSV, use a library)
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const book: any = {};
      
      headers.forEach((header, index) => {
        book[header] = values[index];
      });
      
      // Only import books from "read" shelf
      if (book['Exclusive Shelf'] === 'read') {
        books.push({
          title: book['Title'],
          author: book['Author'],
          isbn: book['ISBN'],
          isbn13: book['ISBN13'],
          pub_date: book['Year Published'],
          num_pages: parseInt(book['Number of Pages']) || null,
          date_finished: book['Date Read'],
          initial_stars: parseFloat(book['My Rating']) || null,
          notes: book['My Review']
        });
      }
    }
    
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

        for (let i = 0; i < books.length; i++) {
          try {
            await apiService.createBook(books[i], 'read');
            successCount++;
          } catch (error) {
            console.error(`Failed to import: ${books[i].title}`, error);
            errorCount++;
          }
          setProgress({ current: i + 1, total: books.length });
        }

        toast.success(`Import complete! ${successCount} books imported${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
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

  return (
    <div className="goodreads-import-container">
      <h1>Import from Goodreads</h1>
      
      <div className="import-instructions">
        <h3>How to export your Goodreads library:</h3>
        <ol>
          <li>Go to <a href="https://www.goodreads.com/review/import" target="_blank" rel="noopener noreferrer">Goodreads Import/Export</a></li>
          <li>Click "Export Library"</li>
          <li>Download the CSV file</li>
          <li>Upload it here</li>
        </ol>
        
        <div className="import-note">
          <strong>Note:</strong> Only books from your "Read" shelf will be imported.
        </div>
      </div>

      <div className="import-section">
        <div className="file-input-wrapper">
          <label htmlFor="csv-upload" className="file-label">
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
          <li>You'll need to upload spine images separately for visualization</li>
          <li>Books will be added to your "Read" shelf</li>
          <li>You can rank them later using the ranking wizard</li>
        </ul>
      </div>
    </div>
  );
};

