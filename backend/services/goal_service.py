from database.db import get_db
from datetime import datetime, timedelta

class GoalService:
    """Service for managing reading goals"""
    
    def __init__(self):
        self.db = get_db()
    
    def set_goal(self, year, target_count, period='year'):
        """Set or update reading goal"""
        query = """
            INSERT INTO reading_goals (year, target_count, period)
            VALUES (?, ?, ?)
            ON CONFLICT(year) DO UPDATE SET
                target_count = excluded.target_count,
                period = excluded.period
        """
        self.db.execute_update(query, (year, target_count, period))
        return self.get_goal(year)
    
    def get_goal(self, year):
        """Get reading goal for a year"""
        query = "SELECT * FROM reading_goals WHERE year = ?"
        results = self.db.execute_query(query, (year,))
        
        if not results:
            return None
        
        goal = results[0]
        
        # Calculate progress
        progress = self.get_goal_progress(year, goal['period'])
        goal.update(progress)
        
        return goal
    
    def get_goal_progress(self, year, period='year'):
        """Calculate progress towards goal"""
        # Count books finished in the year
        query = """
            SELECT COUNT(*) as count
            FROM books b
            JOIN reading_states rs ON b.id = rs.book_id
            WHERE rs.state = 'read'
            AND strftime('%Y', b.date_finished) = ?
        """
        result = self.db.execute_query(query, (str(year),))
        completed = result[0]['count'] if result else 0
        
        # Calculate time-based progress
        now = datetime.now()
        current_year = now.year
        
        if period == 'year':
            if year == current_year:
                days_elapsed = now.timetuple().tm_yday
                days_total = 366 if self._is_leap_year(year) else 365
                time_progress = days_elapsed / days_total
            else:
                time_progress = 1.0 if year < current_year else 0.0
        elif period == 'month':
            # Calculate for current month
            if year == current_year:
                days_elapsed = now.day
                days_total = self._days_in_month(now.year, now.month)
                time_progress = days_elapsed / days_total
            else:
                time_progress = 1.0 if year < current_year else 0.0
        elif period == 'week':
            # Calculate for current week
            if year == current_year:
                weekday = now.weekday()
                time_progress = weekday / 7
            else:
                time_progress = 1.0 if year < current_year else 0.0
        else:
            time_progress = 0.0
        
        return {
            'completed': completed,
            'time_progress': round(time_progress, 3)
        }
    
    def get_current_goal(self):
        """Get goal for current year"""
        return self.get_goal(datetime.now().year)
    
    def delete_goal(self, year):
        """Delete reading goal"""
        query = "DELETE FROM reading_goals WHERE year = ?"
        self.db.execute_update(query, (year,))
        return True
    
    def get_all_goals(self):
        """Get all goals"""
        query = "SELECT * FROM reading_goals ORDER BY year DESC"
        goals = self.db.execute_query(query)
        
        for goal in goals:
            progress = self.get_goal_progress(goal['year'], goal['period'])
            goal.update(progress)
        
        return goals
    
    def calculate_pace_needed(self, year, target_count, period):
        """Calculate reading pace needed to meet goal"""
        progress = self.get_goal_progress(year, period)
        completed = progress['completed']
        remaining = target_count - completed
        
        if remaining <= 0:
            return {'message': 'Goal already met!', 'pace': 0}
        
        now = datetime.now()
        
        if period == 'year':
            days_left = (datetime(year, 12, 31) - now).days + 1
            books_per_day = remaining / max(days_left, 1)
            books_per_week = books_per_day * 7
            books_per_month = books_per_day * 30
            
            return {
                'remaining': remaining,
                'days_left': days_left,
                'books_per_day': round(books_per_day, 2),
                'books_per_week': round(books_per_week, 2),
                'books_per_month': round(books_per_month, 2)
            }
        elif period == 'month':
            days_left = self._days_in_month(now.year, now.month) - now.day + 1
            books_per_day = remaining / max(days_left, 1)
            
            return {
                'remaining': remaining,
                'days_left': days_left,
                'books_per_day': round(books_per_day, 2)
            }
        elif period == 'week':
            days_left = 7 - now.weekday()
            books_per_day = remaining / max(days_left, 1)
            
            return {
                'remaining': remaining,
                'days_left': days_left,
                'books_per_day': round(books_per_day, 2)
            }
    
    def _is_leap_year(self, year):
        """Check if year is leap year"""
        return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
    
    def _days_in_month(self, year, month):
        """Get number of days in month"""
        if month == 2:
            return 29 if self._is_leap_year(year) else 28
        elif month in [4, 6, 9, 11]:
            return 30
        else:
            return 31

# Singleton
_goal_service = None

def get_goal_service():
    global _goal_service
    if _goal_service is None:
        _goal_service = GoalService()
    return _goal_service

