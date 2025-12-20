import React, { useContext, useState } from 'react';
import { sendGetRequestToServer, sendPostRequestToServer } from '../utils/utilities';
import { book, defaultProps } from '../types/interfaces';
import { ColorSchemeCtx } from '../ColorSchemeContext';
import { toast } from 'react-toastify';
import { Loading } from './Loading';
import { Upload } from './Upload';
import { Title } from './Title';

interface searchBookResponse {
  statusCode: number,
  body: book
}

/**
 * AddBook Component - Replaces FetchGoodreads
 * Allows users to search for books by title/author and fetch metadata
 */
export function AddBook({ widgetCallback }: defaultProps) {
  const { colorScheme } = useContext(ColorSchemeCtx);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<book[]>([]);
  const [selectedBook, setSelectedBook] = useState<book | null>(null);

  const searchBooks = () => {
    const titleInput = document.getElementById("book_title_input") as HTMLInputElement;
    const authorInput = document.getElementById("book_author_input") as HTMLInputElement;
    
    const title = titleInput?.value.trim();
    const author = authorInput?.value.trim();

    if (!title) {
      toast.error("Please enter a book title");
      return;
    }

    setSearching(true);
    setSearchResults([]);
    
    // Call your backend API to search for books
    const queryString = `title=${encodeURIComponent(title)}${author ? `&author=${encodeURIComponent(author)}` : ''}`;
    
    sendGetRequestToServer("searchbook", queryString, (res: string) => {
      setSearching(false);
      try {
        const response: searchBookResponse = JSON.parse(res);
        
        if (response.statusCode !== 200) {
          toast.error("Failed to search for books. Please try again.");
          return;
        }

        // If single result, use it directly
        if (response.body) {
          setSearchResults([response.body]);
          setSelectedBook(response.body);
        } else {
          toast.info("No books found. You can still add the book manually.");
        }
      } catch (error) {
        toast.error("Error parsing search results");
        console.error(error);
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchBooks();
    }
  };

  const proceedToUpload = () => {
    if (selectedBook) {
      const originCallback = () => {
        widgetCallback(<AddBook widgetCallback={widgetCallback} />);
      };
      widgetCallback(<Upload widgetCallback={widgetCallback} prefill={selectedBook} originCallback={originCallback} />);
    }
  };

  const addManually = () => {
    const originCallback = () => {
      widgetCallback(<AddBook widgetCallback={widgetCallback} />);
    };
    widgetCallback(<Upload widgetCallback={widgetCallback} prefill={undefined} originCallback={originCallback} />);
  };

  return (
    <div className="bs_input_section">
      <Title title="Add Book" backArrowOnClick={() => widgetCallback(<AddBook widgetCallback={widgetCallback} />)} />
      
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Book Title (required)"
          className={`bs_text_input bs_text_input_${colorScheme}`}
          id="book_title_input"
          onKeyPress={handleKeyPress}
        />
        <input
          type="text"
          placeholder="Author Name (optional)"
          className={`bs_text_input bs_text_input_${colorScheme}`}
          id="book_author_input"
          style={{ marginTop: "10px" }}
          onKeyPress={handleKeyPress}
        />
        <button
          id="bs_enter_button"
          className="bs_button"
          onClick={searchBooks}
          disabled={searching}
        >
          {searching ? "Searching..." : "Search for Book"}
        </button>
      </div>

      {searchResults.length > 0 && selectedBook && (
        <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #ccc", borderRadius: "5px" }}>
          <h3>Found Book:</h3>
          <p><strong>Title:</strong> {selectedBook.title}</p>
          {selectedBook.author && <p><strong>Author:</strong> {selectedBook.author}</p>}
          {selectedBook.pubDate && <p><strong>Published:</strong> {selectedBook.pubDate}</p>}
          {selectedBook.isbn13 && <p><strong>ISBN-13:</strong> {selectedBook.isbn13}</p>}
          
          <div style={{ marginTop: "15px" }}>
            <button className="bs_button" onClick={proceedToUpload}>
              Use This Book
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <p>or</p>
        <button className="bs_button bs_gray" onClick={addManually}>
          Add Book Manually
        </button>
      </div>
    </div>
  );
}

