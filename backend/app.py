from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_caching import Cache
from dotenv import load_dotenv
from functools import wraps
import os

# Load environment variables
load_dotenv()

# Import services
from services.book_service import get_book_service
from services.metadata_service import get_metadata_service
from services.ranking_service import get_ranking_service
from services.tag_service import get_tag_service
from services.goal_service import get_goal_service
from services.continuation_service import get_continuation_service
from services.auth_service import get_auth_service

# Determine if we're serving the frontend
# Look for the built frontend in ../bookshelf-ts-site/build
FRONTEND_BUILD_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'bookshelf-ts-site', 'build')
SERVE_FRONTEND = os.path.exists(FRONTEND_BUILD_PATH)

# Don't use static_folder with empty static_url_path as it interferes with SPA routing
# We'll handle static files manually in the catch-all route
app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "supports_credentials": True}})

# Configure caching
cache_config = {
    'CACHE_TYPE': 'SimpleCache',  # In-memory cache
    'CACHE_DEFAULT_TIMEOUT': 300  # 5 minutes default
}
app.config.from_mapping(cache_config)
cache = Cache(app)

# Services
book_service = get_book_service()
metadata_service = get_metadata_service()
ranking_service = get_ranking_service()
tag_service = get_tag_service()
goal_service = get_goal_service()
continuation_service = get_continuation_service()
auth_service = get_auth_service()

# =============================================================================
# AUTHENTICATION MIDDLEWARE
# =============================================================================

def get_session_token():
    """Extract session token from cookie"""
    return request.cookies.get('session_token')

def get_current_user():
    """Get current authenticated user from session token"""
    session_token = get_session_token()
    if not session_token:
        return None
    return auth_service.get_current_user(session_token)

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return decorated_function

# =============================================================================
# AUTHENTICATION ENDPOINTS
# =============================================================================


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    print(f"Login attempt - Email: {email}, Password length: {len(password) if password else 0}")
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    try:
        result = auth_service.login(email, password)
        print(f"Login successful for: {email}")
        
        # Clear cache on login to ensure user sees their own data
        cache.clear()
        
        response = jsonify({
            'user': {
                'id': result['user_id'],
                'email': result['email'],
                'username': result.get('username')
            }
        })
        response.set_cookie(
            'session_token',
            result['session_token'],
            httponly=True,
            secure=bool(os.getenv('DATABASE_URL')),  # Secure in production
            samesite='Lax',
            max_age=30*24*60*60  # 30 days
        )
        return response
    except ValueError as e:
        print(f"Login failed for {email}: {str(e)}")
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        print(f"Login error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user"""
    session_token = get_session_token()
    if session_token:
        auth_service.logout(session_token)
    
    # Clear cache on logout to prevent data leakage
    cache.clear()
    
    response = jsonify({'success': True})
    response.set_cookie('session_token', '', expires=0)
    return response

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_me():
    """Get current user info"""
    user = request.current_user
    return jsonify({
        'user': {
            'id': user['id'],
            'email': user['email'],
            'username': user.get('username')
        }
    })

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.json
    email = data.get('email')
    password = data.get('password')
    username = data.get('username')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    try:
        user = auth_service.create_user(email, password, username)
        # Auto-login after registration
        login_result = auth_service.login(email, password)
        
        # Clear cache on registration to ensure clean state
        cache.clear()
        
        response = jsonify({
            'user': {
                'id': user['id'],
                'email': user['email'],
                'username': user.get('username')
            }
        })
        response.set_cookie(
            'session_token',
            login_result['session_token'],
            httponly=True,
            secure=bool(os.getenv('DATABASE_URL')),  # Secure in production
            samesite='Lax',
            max_age=30*24*60*60  # 30 days
        )
        return response, 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/auth/username/check', methods=['GET'])
def check_username():
    """Check if username is available"""
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Username parameter required'}), 400
    
    is_valid, error_msg = auth_service.validate_username(username)
    if not is_valid:
        return jsonify({'available': False, 'error': error_msg}), 400
    
    available = auth_service.is_username_available(username)
    return jsonify({'available': available})

# =============================================================================
# PUBLIC USER ENDPOINTS (No auth required)
# =============================================================================

@app.route('/api/public/users/<username>/profile', methods=['GET'])
def get_public_profile(username):
    """Get public user profile by username"""
    user = auth_service.get_user_by_username(username)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # All profiles are public now, no need to check is_public
    # Return only public-safe fields
    return jsonify({
        'username': user['username'],
        'created_at': user.get('created_at')
    })

@app.route('/api/public/users/<username>/shelf', methods=['GET'])
def get_public_shelf(username):
    """Get public shelf for a user"""
    user = auth_service.get_user_by_username(username)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # All profiles are public now, no need to check is_public
    
    state = request.args.get('state')  # Optional filter by reading state
    books = book_service.get_public_shelf(user['id'], state)
    
    # Remove private fields from books
    public_books = []
    for book in books:
        public_book = {
            'id': book['id'],
            'title': book['title'],
            'author': book.get('author'),
            'isbn': book.get('isbn'),
            'isbn13': book.get('isbn13'),
            'pub_date': book.get('pub_date'),
            'num_pages': book.get('num_pages'),
            'genre': book.get('genre'),
            'cover_image_url': book.get('cover_image_url'),
            'series': book.get('series'),
            'series_position': book.get('series_position'),
            'reading_state': book.get('reading_state'),
            'rank_position': book.get('rank_position'),
            'initial_stars': book.get('initial_stars'),
            'tags': book.get('tags', [])
        }
        public_books.append(public_book)
    
    return jsonify({'books': public_books})

@app.route('/api/public/users/<username>/stats', methods=['GET'])
def get_public_stats(username):
    """Get public statistics for a user"""
    user = auth_service.get_user_by_username(username)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # All profiles are public now, no need to check is_public
    
    stats = book_service.get_public_stats(user['id'])
    return jsonify(stats)

# =============================================================================
# PRIVATE USER ENDPOINTS (Auth required)
# =============================================================================

@app.route('/api/me/profile', methods=['GET'])
@require_auth
def get_my_profile():
    """Get current user's profile"""
    user = request.current_user
    full_user = auth_service.get_user_by_id(user['id'])
    
    if not full_user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': full_user['id'],
        'email': full_user['email'],
        'username': full_user.get('username'),
        'is_public': full_user.get('is_public', False),
        'created_at': full_user.get('created_at')
    })

@app.route('/api/me/profile', methods=['PATCH'])
@require_auth
def update_my_profile():
    """Update current user's profile"""
    user = request.current_user
    data = request.json
    
    # For now, only allow updating username (can be extended later)
    username = data.get('username')
    if username:
        is_valid, error_msg = auth_service.validate_username(username)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        if not auth_service.is_username_available(username):
            # Check if it's the current user's username
            current_user = auth_service.get_user_by_id(user['id'])
            if current_user.get('username') != username:
                return jsonify({'error': 'Username is already taken'}), 400
        
        # Update username
        db = auth_service.db
        db.execute_update(
            'UPDATE users SET username = ? WHERE id = ?',
            (username.lower().strip(), user['id'])
        )
    
    updated_user = auth_service.get_user_by_id(user['id'])
    return jsonify({
        'id': updated_user['id'],
        'email': updated_user['email'],
        'username': updated_user.get('username'),
        'is_public': updated_user.get('is_public', False),
        'created_at': updated_user.get('created_at')
    })

@app.route('/api/me/settings', methods=['PATCH'])
@require_auth
def update_my_settings():
    """Update current user's settings"""
    user = request.current_user
    data = request.json
    
    is_public = data.get('is_public')
    if is_public is None:
        return jsonify({'error': 'is_public is required'}), 400
    
    updated_user = auth_service.update_user_settings(user['id'], is_public=bool(is_public))
    cache.clear()  # Clear cache when settings change
    
    return jsonify({
        'id': updated_user['id'],
        'email': updated_user['email'],
        'username': updated_user.get('username'),
        'is_public': updated_user.get('is_public', False)
    })

@app.route('/api/me/shelf', methods=['GET'])
@require_auth
def get_my_shelf():
    """Get current user's shelf (private endpoint)"""
    user = request.current_user
    state = request.args.get('state')
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    
    books = book_service.get_books_by_state(state, limit, offset, user['id']) if state else book_service.search_books(None, None, None, None, limit, offset, user['id'])
    total = book_service.get_total_count(state, user['id'])
    
    return jsonify({
        'books': books,
        'total': total,
        'limit': limit,
        'offset': offset
    })

@app.route('/api/me/stats', methods=['GET'])
@require_auth
def get_my_stats():
    """Get current user's statistics (private, includes all data)"""
    user = request.current_user
    
    # Get all stats (not just public books)
    state_query = """
        SELECT rs.state, COUNT(*) as count
        FROM books b
        JOIN reading_states rs ON b.id = rs.book_id
        WHERE b.user_id = ?
        GROUP BY rs.state
    """
    state_counts = book_service.db.execute_query(state_query, (user['id'],))
    
    rating_query = """
        SELECT AVG(r.initial_stars) as avg_rating, COUNT(*) as rated_count
        FROM books b
        JOIN rankings r ON b.id = r.book_id
        WHERE b.user_id = ? AND r.initial_stars IS NOT NULL
    """
    rating_result = book_service.db.execute_query(rating_query, (user['id'],))
    avg_rating = rating_result[0]['avg_rating'] if rating_result and rating_result[0]['avg_rating'] else None
    rated_count = rating_result[0]['rated_count'] if rating_result else 0
    
    state_dict = {}
    for row in state_counts:
        state_dict[row['state']] = row['count']
    
    return jsonify({
        'counts_by_state': {
            'want_to_read': state_dict.get('want_to_read', 0),
            'currently_reading': state_dict.get('currently_reading', 0),
            'read': state_dict.get('read', 0)
        },
        'total_books': sum(state_dict.values()),
        'average_rating': float(avg_rating) if avg_rating else None,
        'rated_count': rated_count
    })

# =============================================================================
# BOOK ENDPOINTS
# =============================================================================

@app.route('/api/books/search', methods=['GET'])
def search_books_metadata():
    """Search for book metadata from Open Library"""
    query = request.args.get('q')
    author = request.args.get('author')
    
    if not query:
        return jsonify({'error': 'Query parameter required'}), 400
    
    results = metadata_service.search_books(query, author)
    return jsonify(results)

@app.route('/api/books', methods=['POST'])
@require_auth
def create_book():
    """Create a new book"""
    user = request.current_user
    data = request.json
    initial_state = data.pop('initial_state', 'want_to_read')
    
    book = book_service.create_book(data, initial_state, user['id'])
    cache.clear()  # Clear cache when books change
    return jsonify(book), 201

@app.route('/api/books/<int:book_id>', methods=['GET'])
@require_auth
def get_book(book_id):
    """Get a single book"""
    user = request.current_user
    book = book_service.get_book(book_id, user['id'])
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    # Add related data
    book['tags'] = tag_service.get_book_tags(book_id)
    book['continues_from'] = continuation_service.get_continuations_to(book_id)
    book['continues_to'] = continuation_service.get_continuations_from(book_id)
    
    return jsonify(book)

@app.route('/api/books/<int:book_id>', methods=['PUT'])
@require_auth
def update_book(book_id):
    """Update a book"""
    user = request.current_user
    data = request.json
    book = book_service.update_book(book_id, data, user['id'])
    cache.clear()  # Clear cache when books change
    return jsonify(book)

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
@require_auth
def delete_book(book_id):
    """Delete a book"""
    user = request.current_user
    book_service.delete_book(book_id, user['id'])
    cache.clear()  # Clear cache when books change
    return jsonify({'success': True})

def make_cache_key(*args, **kwargs):
    """Create cache key from request args"""
    args_str = str(sorted(request.args.items()))
    return f"{request.path}:{args_str}"

@app.route('/api/books', methods=['GET'])
@require_auth
@cache.cached(timeout=60, key_prefix=make_cache_key)  # Cache for 1 minute
def list_books():
    """List books with filters"""
    user = request.current_user
    query = request.args.get('q')
    author = request.args.get('author')
    tag = request.args.get('tag')
    state = request.args.get('state')
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    
    books = book_service.search_books(query, author, tag, state, limit, offset, user['id'])
    total = book_service.get_total_count(state, user['id'])
    
    return jsonify({
        'books': books,
        'total': total,
        'limit': limit,
        'offset': offset
    })

@app.route('/api/books/shelf/<state>', methods=['GET'])
@require_auth
@cache.cached(timeout=60, key_prefix=make_cache_key)  # Cache for 1 minute
def get_shelf(state):
    """Get books by reading state"""
    user = request.current_user
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    
    books = book_service.get_books_by_state(state, limit, offset, user['id'])
    total = book_service.get_total_count(state, user['id'])
    
    return jsonify({
        'books': books,
        'total': total,
        'limit': limit,
        'offset': offset
    })

@app.route('/api/books/<int:book_id>/state', methods=['PUT'])
@require_auth
def set_reading_state(book_id):
    """Set reading state for a book"""
    user = request.current_user
    data = request.json
    state = data.get('state')
    date_started = data.get('date_started')
    date_finished = data.get('date_finished')
    
    if not state:
        return jsonify({'error': 'State required'}), 400
    
    # Verify book ownership
    book = book_service.get_book(book_id, user['id'])
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    book_service.set_reading_state(book_id, state, date_started, date_finished)
    cache.clear()  # Clear cache when reading states change
    return jsonify({'success': True})


# =============================================================================
# PUBLIC ENDPOINTS (No auth required)
# =============================================================================

@app.route('/api/public/books', methods=['GET'])
def get_public_books():
    """Get public books from the owner user"""
    owner_user_id = auth_service.get_owner_user_id()
    if not owner_user_id:
        return jsonify({'error': 'Owner user not configured'}), 500
    
    books = book_service.get_public_books(owner_user_id)
    return jsonify({'books': books})

# =============================================================================
# RANKING ENDPOINTS
# =============================================================================

@app.route('/api/rankings', methods=['GET'])
@require_auth
def get_rankings():
    """Get all ranked books"""
    user = request.current_user
    books = ranking_service.get_ranked_books(user['id'])
    return jsonify(books)

@app.route('/api/rankings/rerank-all', methods=['POST'])
@require_auth
def rerank_all_books():
    """Re-rank all books based on star ratings and alphabetical order"""
    user = request.current_user
    count = ranking_service.rerank_all_books_by_stars(user['id'])
    cache.clear()  # Clear cache after re-ranking
    return jsonify({'success': True, 'books_reranked': count})

@app.route('/api/rankings/wizard/start', methods=['POST'])
@require_auth
def start_ranking_wizard():
    """Start ranking wizard for a book"""
    user = request.current_user
    data = request.json
    book_id = data.get('book_id')
    initial_stars = data.get('initial_stars')
    
    if not book_id or initial_stars is None:
        return jsonify({'error': 'book_id and initial_stars required'}), 400
    
    wizard_data = ranking_service.start_ranking_wizard(book_id, initial_stars, user['id'])
    return jsonify(wizard_data)

@app.route('/api/rankings/wizard/finalize', methods=['POST'])
@require_auth
def finalize_ranking():
    """Finalize ranking after wizard"""
    user = request.current_user
    data = request.json
    book_id = data.get('book_id')
    final_position = data.get('final_position')
    initial_stars = data.get('initial_stars')
    comparisons = data.get('comparisons', [])
    
    books = ranking_service.finalize_ranking(book_id, final_position, initial_stars, comparisons, user['id'])
    return jsonify(books)

@app.route('/api/rankings/<int:book_id>', methods=['GET'])
@require_auth
def get_book_ranking(book_id):
    """Get ranking info for a book"""
    user = request.current_user
    rank = ranking_service.get_book_rank(book_id, user['id'])
    if not rank:
        return jsonify({'error': 'Book not ranked'}), 404
    
    derived = ranking_service.get_derived_rating(book_id, user['id'])
    rank['derived_rating'] = derived
    
    return jsonify(rank)

@app.route('/api/rankings/<int:book_id>', methods=['PUT'])
@require_auth
def update_ranking(book_id):
    """Update book's rank position"""
    user = request.current_user
    data = request.json
    new_position = data.get('position')
    
    if not new_position:
        return jsonify({'error': 'Position required'}), 400
    
    ranking_service.update_rank_position(book_id, new_position, user['id'])
    return jsonify({'success': True})

@app.route('/api/rankings/<int:book_id>/comparisons', methods=['GET'])
@require_auth
def get_comparisons(book_id):
    """Get comparison history for a book"""
    comparisons = ranking_service.get_comparison_history(book_id)
    return jsonify(comparisons)

# =============================================================================
# TAG ENDPOINTS
# =============================================================================

@app.route('/api/tags', methods=['GET'])
@require_auth
def get_tags():
    """Get all tags"""
    user = request.current_user
    tags = tag_service.get_all_tags(user['id'])
    return jsonify(tags)

@app.route('/api/tags/stats', methods=['GET'])
@require_auth
def get_tag_stats():
    """Get tag usage statistics"""
    user = request.current_user
    stats = tag_service.get_tag_stats(user['id'])
    return jsonify(stats)

@app.route('/api/tags', methods=['POST'])
@require_auth
def create_tag():
    """Create a new tag"""
    data = request.json
    name = data.get('name')
    color = data.get('color')
    
    if not name:
        return jsonify({'error': 'Name required'}), 400
    
    tag = tag_service.create_tag(name, color)
    return jsonify(tag), 201

@app.route('/api/tags/<int:tag_id>', methods=['PUT'])
@require_auth
def update_tag(tag_id):
    """Update a tag"""
    data = request.json
    tag = tag_service.update_tag(tag_id, data.get('name'), data.get('color'))
    return jsonify(tag)

@app.route('/api/tags/<int:tag_id>', methods=['DELETE'])
@require_auth
def delete_tag(tag_id):
    """Delete a tag"""
    tag_service.delete_tag(tag_id)
    return jsonify({'success': True})

@app.route('/api/tags/merge', methods=['POST'])
@require_auth
def merge_tags():
    """Merge two tags"""
    data = request.json
    source_id = data.get('source_id')
    target_id = data.get('target_id')
    
    if not source_id or not target_id:
        return jsonify({'error': 'source_id and target_id required'}), 400
    
    tag_service.merge_tags(source_id, target_id)
    return jsonify({'success': True})

@app.route('/api/books/<int:book_id>/tags', methods=['POST'])
@require_auth
def add_tag_to_book(book_id):
    """Add tag to book"""
    data = request.json
    tag_id = data.get('tag_id')
    
    if not tag_id:
        return jsonify({'error': 'tag_id required'}), 400
    
    tag_service.add_tag_to_book(book_id, tag_id)
    return jsonify({'success': True})

@app.route('/api/books/<int:book_id>/tags/<int:tag_id>', methods=['DELETE'])
@require_auth
def remove_tag_from_book(book_id, tag_id):
    """Remove tag from book"""
    tag_service.remove_tag_from_book(book_id, tag_id)
    return jsonify({'success': True})

# =============================================================================
# GOAL ENDPOINTS
# =============================================================================

@app.route('/api/goals', methods=['GET'])
@require_auth
def get_goals():
    """Get all goals"""
    user = request.current_user
    goals = goal_service.get_all_goals(user['id'])
    return jsonify(goals)

@app.route('/api/goals/current', methods=['GET'])
@require_auth
def get_current_goal():
    """Get current year's goal"""
    user = request.current_user
    print(f"[GOALS] get_current_goal called for user_id={user['id']}")
    goal = goal_service.get_current_goal(user['id'])
    print(f"[GOALS] get_current_goal result: {goal}")
    if goal:
        return jsonify(goal)
    else:
        return jsonify({'error': 'No goal set'}), 404

@app.route('/api/goals', methods=['POST'])
@require_auth
def set_goal():
    """Set a reading goal"""
    user = request.current_user
    data = request.json
    year = data.get('year')
    target_count = data.get('target_count')
    period = data.get('period', 'year')
    
    if not year or not target_count:
        return jsonify({'error': 'year and target_count required'}), 400
    
    goal = goal_service.set_goal(year, target_count, period, user['id'])
    return jsonify(goal)

@app.route('/api/goals/<int:year>', methods=['DELETE'])
@require_auth
def delete_goal(year):
    """Delete a goal"""
    user = request.current_user
    goal_service.delete_goal(year, user['id'])
    return jsonify({'success': True})

@app.route('/api/goals/<int:year>/pace', methods=['GET'])
@require_auth
def get_pace_needed(year):
    """Calculate pace needed to meet goal"""
    user = request.current_user
    goal = goal_service.get_goal(year, user['id'])
    if not goal:
        return jsonify({'error': 'Goal not found'}), 404
    
    pace = goal_service.calculate_pace_needed(year, goal['target_count'], goal['period'], user['id'])
    return jsonify(pace)

@app.route('/api/goals/<int:year>/books', methods=['GET'])
@require_auth
def get_goal_books(year):
    """Get books that count towards a goal"""
    user = request.current_user
    books = goal_service.get_goal_books(year, user['id'])
    return jsonify({'books': books})

# =============================================================================
# CONTINUATION ENDPOINTS
# =============================================================================

@app.route('/api/continuations', methods=['GET'])
@require_auth
def get_all_continuations():
    """Get all thought continuations"""
    continuations = continuation_service.get_all_continuations()
    return jsonify(continuations)

@app.route('/api/continuations/graph', methods=['GET'])
@require_auth
def get_continuation_graph():
    """Get continuation graph data"""
    graph = continuation_service.get_continuation_graph()
    return jsonify(graph)

@app.route('/api/continuations', methods=['POST'])
@require_auth
def add_continuation():
    """Add a thought continuation"""
    data = request.json
    from_book_id = data.get('from_book_id')
    to_book_id = data.get('to_book_id')
    
    if not from_book_id or not to_book_id:
        return jsonify({'error': 'from_book_id and to_book_id required'}), 400
    
    continuation_service.add_continuation(from_book_id, to_book_id)
    return jsonify({'success': True})

@app.route('/api/continuations/<int:from_book_id>/<int:to_book_id>', methods=['DELETE'])
@require_auth
def remove_continuation(from_book_id, to_book_id):
    """Remove a continuation"""
    continuation_service.remove_continuation(from_book_id, to_book_id)
    return jsonify({'success': True})

@app.route('/api/books/<int:book_id>/chain', methods=['GET'])
@require_auth
def get_book_chain(book_id):
    """Get the complete chain of books connected to this book"""
    direction = request.args.get('direction', 'both')
    chain = continuation_service.get_chain(book_id, direction)
    return jsonify(chain)

# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

# =============================================================================
# FRONTEND SERVING (React App)
# =============================================================================

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve React frontend or API info if frontend not built"""
    # Don't serve frontend for API routes (should already be handled, but just in case)
    if path.startswith('api/'):
        return jsonify({'error': 'API endpoint not found'}), 404
    
    if not SERVE_FRONTEND:
        # Frontend not built, show API info
        return jsonify({
            'message': 'Bookshelf API is running',
            'version': '1.0.0',
            'endpoints': {
                'health': '/api/health',
                'books': '/api/books',
                'rankings': '/api/rankings',
                'tags': '/api/tags',
                'goals': '/api/goals',
                'continuations': '/api/continuations'
            },
            'documentation': 'See README.md for full API documentation',
            'note': 'Frontend not built. Run `npm run build` in bookshelf-ts-site/'
        })
    
    # Try to serve the requested file (for static assets like JS, CSS, images)
    # Only serve actual files, not routes like /u/username
    if path != "":
        file_path = os.path.join(FRONTEND_BUILD_PATH, path)
        # Check if it's a file (not a directory) and exists
        if os.path.isfile(file_path):
            return send_from_directory(FRONTEND_BUILD_PATH, path)
    
    # Serve index.html for React Router (SPA) - handles all routes like /u/username, /me, etc.
    return send_file(os.path.join(FRONTEND_BUILD_PATH, 'index.html'))

if __name__ == '__main__':
    # On Heroku, bind to 0.0.0.0; locally use localhost
    host = os.getenv('HOST', '0.0.0.0' if os.getenv('DATABASE_URL') else 'localhost')
    port = int(os.getenv('PORT', 5001))  # Changed to 5001 to avoid AirPlay conflicts on macOS
    debug = not bool(os.getenv('DATABASE_URL'))  # Disable debug in production
    
    if SERVE_FRONTEND:
        print(f"Serving React frontend from {FRONTEND_BUILD_PATH}")
    else:
        print("Frontend not built - serving API only")
    
    app.run(host=host, port=port, debug=debug)

