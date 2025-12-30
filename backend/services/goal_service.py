from database.db import get_db
from datetime import datetime, timedelta

class GoalService:
    """Service for managing reading goals"""
    
    def __init__(self):
        self.db = get_db()
    
    def set_goal(self, year, target_count, period='year', user_id=None):
        """Set or update reading goal"""
        if user_id is None:
            raise ValueError('user_id is required')
        
        print(f"🎯 SET_GOAL called: year={year}, target_count={target_count}, period={period}, user_id={user_id}")
        query = """
            INSERT INTO reading_goals (user_id, year, target_count, period)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, year) DO UPDATE SET
                target_count = excluded.target_count,
                period = excluded.period
        """
        print(f"📝 Executing update query...")
        result = self.db.execute_update(query, (user_id, year, target_count, period))
        print(f"✅ Update executed, lastrowid={result}")
        
        print(f"📖 Fetching goal back...")
        goal = self.get_goal(year, user_id)
        print(f"📦 Returning goal: {goal}")
        return goal
    
    def get_goal(self, year, user_id=None):
        """Get reading goal for a year"""
        if user_id is None:
            raise ValueError('user_id is required')
        
        print(f"🔍 GET_GOAL called: year={year}, user_id={user_id}")
        query = "SELECT * FROM reading_goals WHERE year = ? AND user_id = ?"
        results = self.db.execute_query(query, (year, user_id))
        print(f"📊 Query results: {results}")
        
        if not results:
            print(f"❌ No goal found for year {year}, user_id={user_id}")
            return None
        
        goal = results[0]
        print(f"✅ Found goal: {dict(goal)}")
        
        # Calculate progress
        progress = self.get_goal_progress(year, goal['period'], user_id)
        goal.update(progress)
        
        print(f"📦 Returning goal with progress: {dict(goal)}")
        return goal
    
    def get_goal_progress(self, year, period='year', user_id=None):
        """Calculate progress towards goal"""
        if user_id is None:
            raise ValueError('user_id is required')
        
        # Count books finished in the year for this user
        # Only count books with a non-null date_finished that is not in the future
        now = datetime.now()
        current_date = now.strftime('%Y-%m-%d')
        
        # For SQLite, use date comparison
        # For PostgreSQL, the _convert_query will handle strftime and DATE() conversion
        query = """
            SELECT COUNT(*) as count
            FROM books b
            JOIN reading_states rs ON b.id = rs.book_id
            WHERE rs.state = 'read'
            AND b.user_id = ?
            AND b.date_finished IS NOT NULL
            AND strftime('%Y', b.date_finished) = ?
            AND DATE(b.date_finished) <= DATE(?)
        """
        result = self.db.execute_query(query, (user_id, str(year), current_date))
        completed = result[0]['count'] if result else 0
        
        # Calculate time-based progress
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
    
    def get_current_goal(self, user_id=None):
        """Get goal for current year"""
        if user_id is None:
            raise ValueError('user_id is required')
        
        current_year = datetime.now().year
        print(f"📅 GET_CURRENT_GOAL called: current_year={current_year}, user_id={user_id}")
        return self.get_goal(current_year, user_id)
    
    def delete_goal(self, year, user_id=None):
        """Delete reading goal"""
        if user_id is None:
            raise ValueError('user_id is required')
        
        query = "DELETE FROM reading_goals WHERE year = ? AND user_id = ?"
        self.db.execute_update(query, (year, user_id))
        return True
    
    def get_all_goals(self, user_id=None):
        """Get all goals"""
        if user_id is None:
            raise ValueError('user_id is required')
        
        query = "SELECT * FROM reading_goals WHERE user_id = ? ORDER BY year DESC"
        goals = self.db.execute_query(query, (user_id,))
        
        for goal in goals:
            progress = self.get_goal_progress(goal['year'], goal['period'], user_id)
            goal.update(progress)
        
        return goals
    
    def calculate_pace_needed(self, year, target_count, period, user_id=None):
        """Calculate reading pace needed to meet goal"""
        if user_id is None:
            raise ValueError('user_id is required')
        
        progress = self.get_goal_progress(year, period, user_id)
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
    
    def get_goal_books(self, year, user_id=None):
        """Get list of books that count towards the goal"""
        if user_id is None:
            raise ValueError('user_id is required')
        
        # Get books finished in the year for this user
        # Exclude books with future dates
        now = datetime.now()
        current_date = now.strftime('%Y-%m-%d')
        
        query = """
            SELECT b.*, rs.state as reading_state, r.rank_position, r.initial_stars
            FROM books b
            JOIN reading_states rs ON b.id = rs.book_id
            LEFT JOIN rankings r ON b.id = r.book_id
            WHERE rs.state = 'read'
            AND b.user_id = ?
            AND b.date_finished IS NOT NULL
            AND strftime('%Y', b.date_finished) = ?
            AND DATE(b.date_finished) <= DATE(?)
            ORDER BY b.date_finished DESC
        """
        books = self.db.execute_query(query, (user_id, str(year), current_date))
        
        # Fetch tags for all books in one query (avoid N+1 problem)
        if books:
            book_ids = [book['id'] for book in books]
            placeholders = ','.join(['?'] * len(book_ids))
            tags_query = f"""
                SELECT bt.book_id, t.id, t.name, t.color
                FROM book_tags bt
                JOIN tags t ON bt.tag_id = t.id
                WHERE bt.book_id IN ({placeholders})
            """
            tags_results = self.db.execute_query(tags_query, book_ids)
            
            # Group tags by book_id
            tags_by_book = {}
            for tag_row in tags_results:
                book_id = tag_row['book_id']
                if book_id not in tags_by_book:
                    tags_by_book[book_id] = []
                tags_by_book[book_id].append({
                    'id': tag_row['id'],
                    'name': tag_row['name'],
                    'color': tag_row['color']
                })
            
            # Add tags to each book
            for book in books:
                book['tags'] = tags_by_book.get(book['id'], [])
        
        return books
    
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

