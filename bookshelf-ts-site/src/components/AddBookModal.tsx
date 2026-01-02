import React, { useState, useEffect } from 'react';
import { Book, Tag } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import { Loading } from '../components/Loading';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (book: Book) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'search' | 'details'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({
    initial_state: 'want_to_read'
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  const fetchTags = async () => {
    try {
      const tags = await apiService.getTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a book title');
      return;
    }

    setLoading(true);
    try {
      const results = await apiService.searchBooksMetadata(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        toast.info('No results found. You can add the book manually.');
        setStep('details');
        setSelectedBook({ title: searchQuery });
      }
    } catch (error) {
      toast.error('Failed to search for books');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectBook = (book: any) => {
    setSelectedBook(book);
    setFormData({ ...book, initial_state: 'want_to_read' });
    setStep('details');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    try {
      const newTag = await apiService.createTag(newTagName);
      setAvailableTags([...availableTags, newTag]);
      setSelectedTags([...selectedTags, newTag.id]);
      setNewTagName('');
      setShowNewTagInput(false);
      toast.success('Tag created!');
    } catch (error) {
      toast.error('Failed to create tag');
      console.error(error);
    }
  };

  const toggleTag = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const book = await apiService.createBook(formData, formData.initial_state);
      
      // Add tags to the book
      for (const tagId of selectedTags) {
        await apiService.addTagToBook(book.id, tagId);
      }
      
      toast.success('Book added successfully!');
      onSuccess(book);
      resetModal();
    } catch (error) {
      toast.error('Failed to add book');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedBook(null);
    setFormData({ initial_state: 'want_to_read' });
    setSelectedTags([]);
    setNewTagName('');
    setShowNewTagInput(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={resetModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={resetModal}>×</button>
        
        {step === 'search' && (
          <div className="add-book-search">
            <h2>Add a Book</h2>
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {loading && <Loading />}

            {searchResults.length > 0 && (
              <div className="search-results">
                <h3>Results</h3>
                {searchResults.map((book, index) => (
                  <div key={index} className="search-result-item" onClick={() => selectBook(book)}>
                    {book.cover_image_url && (
                      <img src={book.cover_image_url} alt={book.title} />
                    )}
                    <div className="book-info">
                      <h4>{book.title}</h4>
                      <p>{book.author}</p>
                      {book.pub_date && <p className="year">{book.pub_date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="manual-add">
              <button onClick={() => { setStep('details'); setSelectedBook({}); }}>
                Add Manually
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="add-book-details">
            <h2>{selectedBook?.title ? 'Confirm Details' : 'Add Book Manually'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Author</label>
                <input
                  type="text"
                  name="author"
                  value={formData.author || ''}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>ISBN-13</label>
                  <input
                    type="text"
                    name="isbn13"
                    value={formData.isbn13 || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Publication Date</label>
                  <input
                    type="text"
                    name="pub_date"
                    value={formData.pub_date || ''}
                    onChange={handleInputChange}
                    placeholder="YYYY"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Pages</label>
                  <input
                    type="number"
                    name="num_pages"
                    value={formData.num_pages || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Genre</label>
                  <input
                    type="text"
                    name="genre"
                    value={formData.genre || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Series</label>
                <input
                  type="text"
                  name="series"
                  value={formData.series || ''}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Add to Shelf</label>
                <select
                  name="initial_state"
                  value={formData.initial_state}
                  onChange={handleInputChange}
                >
                  <option value="want_to_read">Want to Read</option>
                  <option value="currently_reading">Currently Reading</option>
                  <option value="read">Read</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Tags</label>
                <div className="tags-section">
                  <div className="tags-list">
                    {availableTags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        className={`tag-button ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                        onClick={() => toggleTag(tag.id)}
                        style={{
                          backgroundColor: selectedTags.includes(tag.id) ? (tag.color || '#3498db') : '#f0f0f0',
                          color: selectedTags.includes(tag.id) ? 'white' : '#666'
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                  {showNewTagInput ? (
                    <div className="new-tag-input">
                      <input
                        type="text"
                        placeholder="New tag name..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                      />
                      <button type="button" onClick={handleCreateTag}>Add</button>
                      <button type="button" onClick={() => setShowNewTagInput(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      className="add-tag-button"
                      onClick={() => setShowNewTagInput(true)}
                    >
                      + Create New Tag
                    </button>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setStep('search')}>
                  Back
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

