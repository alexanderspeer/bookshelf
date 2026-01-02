import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import { toast } from 'react-toastify';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (goal?: any) => void;
  currentGoal?: any;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSuccess, currentGoal }) => {
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    target_count: 24,
    period: 'year' as 'year' | 'month' | 'week'
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      console.log('Setting goal with data:', JSON.stringify(formData, null, 2));
      const goalResponse = await apiService.setGoal(formData.year, formData.target_count, formData.period);
      console.log('Goal set successfully!');
      console.log('Response from setGoal:', JSON.stringify(goalResponse, null, 2));
      console.log('Response type:', typeof goalResponse);
      toast.success('Goal set successfully!');
      // Pass the goal response directly to onSuccess
      onSuccess(goalResponse);
      console.log('onSuccess called with response, closing modal');
      onClose();
    } catch (error) {
      toast.error('Failed to set goal');
      console.error('Error setting goal:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentGoal) return;
    
    if (!window.confirm(`Are you sure you want to delete your ${currentGoal.year} goal?`)) {
      return;
    }
    
    setDeleting(true);
    try {
      await apiService.deleteGoal(currentGoal.year);
      toast.success('Goal deleted successfully!');
      onSuccess(null); // Pass null to indicate goal was deleted
      onClose();
    } catch (error) {
      toast.error('Failed to delete goal');
      console.error('Error deleting goal:', error);
    } finally {
      setDeleting(false);
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content goal-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2>Set Reading Goal</h2>
        <p className="modal-subtitle">Challenge yourself to read more books!</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Year</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              min={2020}
              max={2030}
              required
            />
          </div>

          <div className="form-group">
            <label>Target Number of Books</label>
            <input
              type="number"
              value={formData.target_count}
              onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) })}
              min={1}
              max={365}
              required
            />
          </div>

          <div className="form-group">
            <label>Period</label>
            <select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
            >
              <option value="year">Yearly</option>
              <option value="month">Monthly</option>
              <option value="week">Weekly</option>
            </select>
          </div>

          <div className="form-actions">
            {currentGoal && (
              <button 
                type="button" 
                className="btn-delete" 
                onClick={handleDelete}
                disabled={deleting || submitting}
                style={{ 
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  cursor: deleting ? 'not-allowed' : "url('/rpgui/img/cursor/point.png') 10 0, pointer"
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Goal'}
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting || deleting}>
              {submitting ? 'Setting...' : 'Set Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

