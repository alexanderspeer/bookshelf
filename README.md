# Bookshelf - Personal Library Management

A personal library management system with bookshelf visualization.

## Features

- **Library Management**: Add, edit, and organize your books
- **Reading Shelves**: Want to Read, Currently Reading, Read
- **Beli-Style Ranking**: Rank books using pairwise comparisons
- **Tags**: Organize books with custom tags
- **Reading Goals**: Track yearly/monthly/weekly reading goals
- **Thought Continuations**: Link books that continue intellectual themes
- **Bookshelf Visualization**: Generate visual bookshelves with spine images
- **Open Library Integration**: Automatic book metadata fetching

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5000`

### Frontend

```bash
cd bookshelf-ts-site
npm install
npm start
```

Frontend runs on `http://localhost:3000`

## Quick Start

1. Start the backend server
2. Start the frontend development server
3. Navigate to `http://localhost:3000`
4. Add your first book using the "Add Book" button
5. Search by title to fetch metadata automatically
6. Organize books into shelves
7. When you finish a book, use the ranking wizard to place it in your ranked list

## Project Structure

```
backend/
  ├── database/         # Database schema and connection
  ├── services/         # Business logic services
  ├── data/            # SQLite database and spine images
  └── app.py           # Flask application

bookshelf-ts-site/
  ├── src/
  │   ├── components/  # React components
  │   ├── pages/       # Page components
  │   ├── services/    # API service
  │   ├── types/       # TypeScript types
  │   └── styles/      # CSS styles
  └── public/          # Static assets
```

## API Endpoints

- `GET /api/books` - List books
- `POST /api/books` - Create book
- `GET /api/books/:id` - Get book details
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book
- `GET /api/books/shelf/:state` - Get books by shelf
- `PUT /api/books/:id/state` - Set reading state
- `GET /api/rankings` - Get ranked books
- `POST /api/rankings/wizard/start` - Start ranking wizard
- `POST /api/rankings/wizard/finalize` - Finalize ranking
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag
- `GET /api/goals` - Get goals
- `POST /api/goals` - Set goal
- `GET /api/continuations/graph` - Get thought continuation graph

