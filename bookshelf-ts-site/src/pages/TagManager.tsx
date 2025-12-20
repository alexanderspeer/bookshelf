import React, { useState, useEffect } from 'react';
import { Tag } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';

export const TagManager: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#3498db' });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const stats = await apiService.getTagStats();
      setTags(stats);
    } catch (error) {
      toast.error('Failed to load tags');
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTag) {
        await apiService.updateTag(editingTag.id, formData.name, formData.color);
        toast.success('Tag updated');
      } else {
        await apiService.createTag(formData.name, formData.color);
        toast.success('Tag created');
      }
      
      resetForm();
      fetchTags();
    } catch (error) {
      toast.error('Failed to save tag');
      console.error(error);
    }
  };

  const deleteTag = async (tagId: number) => {
    if (!window.confirm('Delete this tag? It will be removed from all books.')) return;
    
    try {
      await apiService.deleteTag(tagId);
      toast.success('Tag deleted');
      fetchTags();
    } catch (error) {
      toast.error('Failed to delete tag');
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color || '#3498db' });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingTag(null);
    setFormData({ name: '', color: '#3498db' });
    setShowForm(false);
  };

  return (
    <div className="tag-manager-container">
      <div className="tag-manager-header">
        <h1>Manage Tags</h1>
        <button onClick={() => setShowForm(true)}>Create Tag</button>
      </div>

      {showForm && (
        <div className="tag-form">
          <h3>{editingTag ? 'Edit Tag' : 'Create Tag'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <input
                type="text"
                placeholder="Tag name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="button" onClick={resetForm}>Cancel</button>
              <button type="submit">{editingTag ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="tags-grid">
        {tags.map(tag => (
          <div key={tag.id} className="tag-card">
            <div className="tag-color" style={{ background: tag.color }} />
            <div className="tag-info">
              <h3>{tag.name}</h3>
              <p>{tag.book_count || 0} books</p>
            </div>
            <div className="tag-actions">
              <button onClick={() => startEdit(tag)}>Edit</button>
              <button onClick={() => deleteTag(tag.id)} className="delete">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {tags.length === 0 && (
        <div className="empty-state">
          <p>No tags yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
};

