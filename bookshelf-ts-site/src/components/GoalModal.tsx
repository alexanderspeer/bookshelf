import React, { useState } from 'react';
import apiService from '../services/api';
import { toast } from 'react-toastify';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (goal?: any) => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    target_count: 24,
    period: 'year' as 'year' | 'month' | 'week'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      console.log('📤 Setting goal with data:', JSON.stringify(formData, null, 2));
      const goalResponse = await apiService.setGoal(formData.year, formData.target_count, formData.period);
      console.log('✅ Goal set successfully!');
      console.log('📥 Response from setGoal:', JSON.stringify(goalResponse, null, 2));
      console.log('📥 Response type:', typeof goalResponse);
      toast.success('Goal set successfully!');
      // Pass the goal response directly to onSuccess
      onSuccess(goalResponse);
      console.log('✅ onSuccess called with response, closing modal');
      onClose();
    } catch (error) {
      toast.error('Failed to set goal');
      console.error('❌ Error setting goal:', error);
    } finally {
      setSubmitting(false);
    }
  };

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
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Setting...' : 'Set Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

