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

## Database Configuration

The application supports both SQLite (local development) and PostgreSQL (production).

### Local Development (SQLite)

By default, the app uses SQLite with the database stored at `backend/data/bookshelf.db`.

```bash
cd backend
source venv/bin/activate
python app.py
```

### Production with PostgreSQL

Set the `DATABASE_URL` environment variable to use PostgreSQL:

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
python app.py
```

## Heroku Deployment

This application is configured for deployment on Heroku with Postgres.

### Prerequisites

- Heroku CLI installed
- Heroku app created: `bookshelf-hermes`
- Heroku Postgres addon attached: `Essential-0`

### Initial Schema Setup

Apply the PostgreSQL schema to your Heroku database:

```bash
heroku pg:psql -a bookshelf-hermes < backend/database/schema_postgres.sql
```

### Deploy Application

```bash
# From project root
git push heroku main
```

### Verify Deployment

Run the database smoke test on Heroku:

```bash
heroku run -a bookshelf-hermes python backend/scripts/db_smoketest.py
```

This will verify:
- Database connectivity
- All tables exist
- CRUD operations work correctly
- Foreign key constraints are active

### Check Database Status

```bash
# Connect to Heroku Postgres console
heroku pg:psql -a bookshelf-hermes

# View tables
\dt

# Check books count
SELECT COUNT(*) FROM books;

# Exit
\q
```

### Local Testing with Postgres

To test locally with a PostgreSQL database:

```bash
# Set DATABASE_URL for local Postgres
export DATABASE_URL="postgresql://localhost/bookshelf_dev"

# Apply schema
psql bookshelf_dev < backend/database/schema_postgres.sql

# Run app
python backend/app.py

# Run smoke test
python backend/scripts/db_smoketest.py
```

### Environment Variables

Required for production:
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Heroku Postgres)
- `PORT` - Port for Flask app (auto-set by Heroku)

Optional:
- `SPINE_IMAGES_PATH` - Path for spine image storage (default: `data/spine_images`)
- `HOST` - Host for Flask app (default: `localhost`)

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

