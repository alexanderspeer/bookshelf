import React, { useState, useEffect } from 'react';
import { Goal } from '../types/types';
import apiService from '../services/api';
import { toast } from 'react-toastify';

export const ReadingGoals: React.FC = () => {
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    target_count: 24,
    period: 'year' as 'year' | 'month' | 'week'
  });
  const [pace, setPace] = useState<any>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const [current, all] = await Promise.all([
        apiService.getCurrentGoal().catch(() => null),
        apiService.getGoals()
      ]);
      
      setCurrentGoal(current);
      setAllGoals(all);
      
      if (current) {
        const paceData = await apiService.getPaceNeeded(current.year);
        setPace(paceData);
      }
    } catch (error) {
      console.error('Failed to load goals', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.setGoal(formData.year, formData.target_count, formData.period);
      toast.success('Goal set successfully!');
      setShowForm(false);
      fetchGoals();
    } catch (error) {
      toast.error('Failed to set goal');
      console.error(error);
    }
  };

  const deleteGoal = async (year: number) => {
    if (!window.confirm(`Delete goal for ${year}?`)) return;
    
    try {
      await apiService.deleteGoal(year);
      toast.success('Goal deleted');
      fetchGoals();
    } catch (error) {
      toast.error('Failed to delete goal');
    }
  };

  const getProgressPercentage = (goal: Goal) => {
    if (!goal.completed || !goal.target_count) return 0;
    return Math.min((goal.completed / goal.target_count) * 100, 100);
  };

  return (
    <div className="goals-container">
      <h1>Reading Goals</h1>

      {currentGoal ? (
        <div className="current-goal">
          <h2>{currentGoal.year} Goal</h2>
          <div className="goal-stats">
            <div className="stat-item">
              <span className="stat-value">{currentGoal.completed || 0}</span>
              <span className="stat-label">Books Read</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{currentGoal.target_count}</span>
              <span className="stat-label">Target</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {currentGoal.target_count - (currentGoal.completed || 0)}
              </span>
              <span className="stat-label">Remaining</span>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${getProgressPercentage(currentGoal)}%` }}
              />
            </div>
            <span className="progress-percentage">
              {Math.round(getProgressPercentage(currentGoal))}%
            </span>
          </div>

          {pace && pace.remaining > 0 && (
            <div className="pace-info">
              <h3>Pace Needed</h3>
              <p>To reach your goal, you need to read:</p>
              <ul>
                <li>{pace.books_per_week} books per week</li>
                <li>{pace.books_per_month} books per month</li>
                <li>{pace.books_per_day} books per day</li>
              </ul>
              <p className="days-left">{pace.days_left} days remaining</p>
            </div>
          )}

          {currentGoal.completed && currentGoal.completed >= currentGoal.target_count && (
            <div className="goal-met">
              Congratulations! You've met your goal!
            </div>
          )}
        </div>
      ) : (
        <div className="no-goal">
          <p>No goal set for this year</p>
          <button onClick={() => setShowForm(true)}>Set a Goal</button>
        </div>
      )}

      {!showForm && currentGoal && (
        <button className="set-goal-btn" onClick={() => setShowForm(true)}>
          Update Goal
        </button>
      )}

      {showForm && (
        <div className="goal-form-container">
          <h3>Set Reading Goal</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                min={2000}
                max={2100}
              />
            </div>

            <div className="form-group">
              <label>Target Number of Books</label>
              <input
                type="number"
                value={formData.target_count}
                onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) })}
                min={1}
                max={1000}
              />
            </div>

            <div className="form-group">
              <label>Period</label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
              >
                <option value="year">Per Year</option>
                <option value="month">Per Month</option>
                <option value="week">Per Week</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit">Save Goal</button>
            </div>
          </form>
        </div>
      )}

      {allGoals.length > 1 && (
        <div className="all-goals">
          <h3>All Goals</h3>
          <div className="goals-list">
            {allGoals.map(goal => (
              <div key={goal.id} className="goal-item">
                <div className="goal-year">{goal.year}</div>
                <div className="goal-progress">
                  {goal.completed || 0} / {goal.target_count}
                </div>
                <div className="goal-percentage">
                  {Math.round(getProgressPercentage(goal))}%
                </div>
                <button onClick={() => deleteGoal(goal.year)} className="delete-btn">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

