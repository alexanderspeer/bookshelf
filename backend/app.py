from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
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

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})

# Services
book_service = get_book_service()
metadata_service = get_metadata_service()
ranking_service = get_ranking_service()
tag_service = get_tag_service()
goal_service = get_goal_service()
continuation_service = get_continuation_service()

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
def create_book():
    """Create a new book"""
    data = request.json
    initial_state = data.pop('initial_state', 'want_to_read')
    
    book = book_service.create_book(data, initial_state)
    return jsonify(book), 201

@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    """Get a single book"""
    book = book_service.get_book(book_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    # Add related data
    book['tags'] = tag_service.get_book_tags(book_id)
    book['continues_from'] = continuation_service.get_continuations_to(book_id)
    book['continues_to'] = continuation_service.get_continuations_from(book_id)
    
    return jsonify(book)

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """Update a book"""
    data = request.json
    book = book_service.update_book(book_id, data)
    return jsonify(book)

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """Delete a book"""
    book_service.delete_book(book_id)
    return jsonify({'success': True})

@app.route('/api/books', methods=['GET'])
def list_books():
    """List books with filters"""
    query = request.args.get('q')
    author = request.args.get('author')
    tag = request.args.get('tag')
    state = request.args.get('state')
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    
    books = book_service.search_books(query, author, tag, state, limit, offset)
    total = book_service.get_total_count(state)
    
    return jsonify({
        'books': books,
        'total': total,
        'limit': limit,
        'offset': offset
    })

@app.route('/api/books/shelf/<state>', methods=['GET'])
def get_shelf(state):
    """Get books by reading state"""
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    
    books = book_service.get_books_by_state(state, limit, offset)
    total = book_service.get_total_count(state)
    
    return jsonify({
        'books': books,
        'total': total,
        'limit': limit,
        'offset': offset
    })

@app.route('/api/books/<int:book_id>/state', methods=['PUT'])
def set_reading_state(book_id):
    """Set reading state for a book"""
    data = request.json
    state = data.get('state')
    date_started = data.get('date_started')
    date_finished = data.get('date_finished')
    
    if not state:
        return jsonify({'error': 'State required'}), 400
    
    book_service.set_reading_state(book_id, state, date_started, date_finished)
    return jsonify({'success': True})

@app.route('/api/books/<int:book_id>/spine', methods=['POST'])
def upload_spine(book_id):
    """Upload spine image"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    filename = book_service.save_spine_image(book_id, file)
    
    return jsonify({'filename': filename})

@app.route('/api/spine_images/<path:filename>')
def serve_spine_image(filename):
    """Serve spine images"""
    spine_path = os.getenv('SPINE_IMAGES_PATH', 'data/spine_images')
    return send_from_directory(spine_path, filename)

# =============================================================================
# RANKING ENDPOINTS
# =============================================================================

@app.route('/api/rankings', methods=['GET'])
def get_rankings():
    """Get all ranked books"""
    books = ranking_service.get_ranked_books()
    return jsonify(books)

@app.route('/api/rankings/wizard/start', methods=['POST'])
def start_ranking_wizard():
    """Start ranking wizard for a book"""
    data = request.json
    book_id = data.get('book_id')
    initial_stars = data.get('initial_stars')
    
    if not book_id or initial_stars is None:
        return jsonify({'error': 'book_id and initial_stars required'}), 400
    
    wizard_data = ranking_service.start_ranking_wizard(book_id, initial_stars)
    return jsonify(wizard_data)

@app.route('/api/rankings/wizard/finalize', methods=['POST'])
def finalize_ranking():
    """Finalize ranking after wizard"""
    data = request.json
    book_id = data.get('book_id')
    final_position = data.get('final_position')
    initial_stars = data.get('initial_stars')
    comparisons = data.get('comparisons', [])
    
    books = ranking_service.finalize_ranking(book_id, final_position, initial_stars, comparisons)
    return jsonify(books)

@app.route('/api/rankings/<int:book_id>', methods=['GET'])
def get_book_ranking(book_id):
    """Get ranking info for a book"""
    rank = ranking_service.get_book_rank(book_id)
    if not rank:
        return jsonify({'error': 'Book not ranked'}), 404
    
    derived = ranking_service.get_derived_rating(book_id)
    rank['derived_rating'] = derived
    
    return jsonify(rank)

@app.route('/api/rankings/<int:book_id>', methods=['PUT'])
def update_ranking(book_id):
    """Update book's rank position"""
    data = request.json
    new_position = data.get('position')
    
    if not new_position:
        return jsonify({'error': 'Position required'}), 400
    
    ranking_service.update_rank_position(book_id, new_position)
    return jsonify({'success': True})

@app.route('/api/rankings/<int:book_id>/comparisons', methods=['GET'])
def get_comparisons(book_id):
    """Get comparison history for a book"""
    comparisons = ranking_service.get_comparison_history(book_id)
    return jsonify(comparisons)

# =============================================================================
# TAG ENDPOINTS
# =============================================================================

@app.route('/api/tags', methods=['GET'])
def get_tags():
    """Get all tags"""
    tags = tag_service.get_all_tags()
    return jsonify(tags)

@app.route('/api/tags/stats', methods=['GET'])
def get_tag_stats():
    """Get tag usage statistics"""
    stats = tag_service.get_tag_stats()
    return jsonify(stats)

@app.route('/api/tags', methods=['POST'])
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
def update_tag(tag_id):
    """Update a tag"""
    data = request.json
    tag = tag_service.update_tag(tag_id, data.get('name'), data.get('color'))
    return jsonify(tag)

@app.route('/api/tags/<int:tag_id>', methods=['DELETE'])
def delete_tag(tag_id):
    """Delete a tag"""
    tag_service.delete_tag(tag_id)
    return jsonify({'success': True})

@app.route('/api/tags/merge', methods=['POST'])
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
def add_tag_to_book(book_id):
    """Add tag to book"""
    data = request.json
    tag_id = data.get('tag_id')
    
    if not tag_id:
        return jsonify({'error': 'tag_id required'}), 400
    
    tag_service.add_tag_to_book(book_id, tag_id)
    return jsonify({'success': True})

@app.route('/api/books/<int:book_id>/tags/<int:tag_id>', methods=['DELETE'])
def remove_tag_from_book(book_id, tag_id):
    """Remove tag from book"""
    tag_service.remove_tag_from_book(book_id, tag_id)
    return jsonify({'success': True})

# =============================================================================
# GOAL ENDPOINTS
# =============================================================================

@app.route('/api/goals', methods=['GET'])
def get_goals():
    """Get all goals"""
    goals = goal_service.get_all_goals()
    return jsonify(goals)

@app.route('/api/goals/current', methods=['GET'])
def get_current_goal():
    """Get current year's goal"""
    goal = goal_service.get_current_goal()
    return jsonify(goal) if goal else jsonify({'error': 'No goal set'}), 404

@app.route('/api/goals', methods=['POST'])
def set_goal():
    """Set a reading goal"""
    data = request.json
    year = data.get('year')
    target_count = data.get('target_count')
    period = data.get('period', 'year')
    
    if not year or not target_count:
        return jsonify({'error': 'year and target_count required'}), 400
    
    goal = goal_service.set_goal(year, target_count, period)
    return jsonify(goal)

@app.route('/api/goals/<int:year>', methods=['DELETE'])
def delete_goal(year):
    """Delete a goal"""
    goal_service.delete_goal(year)
    return jsonify({'success': True})

@app.route('/api/goals/<int:year>/pace', methods=['GET'])
def get_pace_needed(year):
    """Calculate pace needed to meet goal"""
    goal = goal_service.get_goal(year)
    if not goal:
        return jsonify({'error': 'Goal not found'}), 404
    
    pace = goal_service.calculate_pace_needed(year, goal['target_count'], goal['period'])
    return jsonify(pace)

# =============================================================================
# CONTINUATION ENDPOINTS
# =============================================================================

@app.route('/api/continuations', methods=['GET'])
def get_all_continuations():
    """Get all thought continuations"""
    continuations = continuation_service.get_all_continuations()
    return jsonify(continuations)

@app.route('/api/continuations/graph', methods=['GET'])
def get_continuation_graph():
    """Get continuation graph data"""
    graph = continuation_service.get_continuation_graph()
    return jsonify(graph)

@app.route('/api/continuations', methods=['POST'])
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
def remove_continuation(from_book_id, to_book_id):
    """Remove a continuation"""
    continuation_service.remove_continuation(from_book_id, to_book_id)
    return jsonify({'success': True})

@app.route('/api/books/<int:book_id>/chain', methods=['GET'])
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

if __name__ == '__main__':
    host = os.getenv('HOST', 'localhost')
    port = int(os.getenv('PORT', 5001))  # Changed to 5001 to avoid AirPlay conflicts on macOS
    app.run(host=host, port=port, debug=True)

