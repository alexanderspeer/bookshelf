import React, { useState, useEffect } from 'react';
import { Book, Tag } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';

interface EditBookModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onRerank?: (book: Book) => void;
}

export const EditBookModal: React.FC<EditBookModalProps> = ({ book, isOpen, onClose, onSuccess, onRerank }) => {
  const [formData, setFormData] = useState({
    title: book.title || '',
    author: book.author || '',
    notes: book.notes || '',
    date_finished: book.date_finished ? new Date(book.date_finished).toISOString().split('T')[0] : '',
    initial_stars: book.initial_stars || 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      // Initialize selected tags from book
      setSelectedTags(book.tags?.map(tag => tag.id) || []);
    }
  }, [isOpen, book.tags]);

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

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty');
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
    setSubmitting(true);
    
    try {
      // Prepare update data - only include fields that should be updated
      const updateData: any = {
        title: formData.title,
        author: formData.author,
        notes: formData.notes || '', // Ensure notes is always included, even if empty
      };
      
      // Only include date_finished and initial_stars if book is read
      if (book.reading_state === 'read') {
        if (formData.date_finished) {
          updateData.date_finished = formData.date_finished;
        }
        if (formData.initial_stars !== undefined) {
          updateData.initial_stars = formData.initial_stars;
        }
      }
      
      // Update the book
      await apiService.updateBook(book.id!, updateData);
      
      // Update tags - remove old tags and add new ones
      const currentTagIds = book.tags?.map(tag => tag.id) || [];
      const tagsToRemove = currentTagIds.filter(id => !selectedTags.includes(id));
      const tagsToAdd = selectedTags.filter(id => !currentTagIds.includes(id));
      
      // Remove tags that were deselected
      for (const tagId of tagsToRemove) {
        await apiService.removeTagFromBook(book.id!, tagId);
      }
      
      // Add new tags
      for (const tagId of tagsToAdd) {
        await apiService.addTagToBook(book.id!, tagId);
      }
      
      toast.success('Book updated successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to update book');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-book-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2>Edit Book</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Author</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            />
          </div>

          {book.reading_state === 'read' && (
            <>
              <div className="form-group">
                <label>Date Finished</label>
                <input
                  type="date"
                  value={formData.date_finished}
                  onChange={(e) => setFormData({ ...formData, date_finished: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Rating</label>
                <select
                  value={formData.initial_stars}
                  onChange={(e) => setFormData({ ...formData, initial_stars: parseInt(e.target.value) })}
                >
                  <option value="0">No rating</option>
                  <option value="1">1 star</option>
                  <option value="2">2 stars</option>
                  <option value="3">3 stars</option>
                  <option value="4">4 stars</option>
                  <option value="5">5 stars</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Your thoughts on this book..."
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
                    placeholder="New tag name"
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
                  className="btn-create-tag"
                  onClick={() => setShowNewTagInput(true)}
                >
                  + Create New Tag
                </button>
              )}
            </div>
          </div>

          {book.reading_state === 'read' && onRerank && (
            <div className="form-group rerank-section">
              <button 
                type="button" 
                className="rerank-button"
                onClick={() => {
                  onClose();
                  onRerank(book);
                }}
              >
                🔄 Re-rank This Book
              </button>
              <p className="hint-text">Start the ranking process over for this book</p>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

