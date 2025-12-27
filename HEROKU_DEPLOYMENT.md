# Heroku Postgres Migration - Deployment Guide

## Overview
This guide covers deploying the bookshelf app to Heroku with PostgreSQL database.

## Prerequisites
1. Heroku CLI installed and logged in
2. Heroku app created: `bookshelf-hermes`
3. Heroku Postgres addon attached: `heroku addons:create heroku-postgresql:essential-0 -a bookshelf-hermes`

## Step 1: Install Dependencies Locally

```bash
cd backend
pip install -r requirements.txt
```

This will install `psycopg2-binary==2.9.9` along with other dependencies.

## Step 2: Apply PostgreSQL Schema to Heroku

```bash
# From project root
heroku pg:psql -a bookshelf-hermes < backend/database/schema_postgres.sql
```

This creates all tables, indexes, and constraints in your Heroku Postgres database.

## Step 3: Verify Schema

```bash
# Connect to the database
heroku pg:psql -a bookshelf-hermes

# List all tables
\dt

# Check books table structure
\d books

# Exit
\q
```

You should see 9 tables: books, reading_states, rankings, comparisons, tags, book_tags, thought_continuations, reading_goals, import_history

## Step 4: Deploy Application

```bash
# From project root
git add .
git commit -m "Add Postgres support for Heroku deployment"
git push heroku main
```

Heroku will automatically:
- Detect Python app
- Install dependencies from requirements.txt
- Set DATABASE_URL environment variable (already set by Postgres addon)
- Start the app using Procfile

## Step 5: Run Smoke Test

```bash
heroku run -a bookshelf-hermes python backend/scripts/db_smoketest.py
```

Expected output:
```
============================================================
Database Smoke Test
============================================================

Using DATABASE_URL: postgresql://...

1. Testing database connection...
   ✓ Database connection initialized

2. Testing basic query (SELECT 1)...
   ✓ Basic query works

[... all 9 tests should pass ...]

============================================================
All smoke tests passed!
============================================================
```

## Step 6: Verify App is Running

```bash
# Check logs
heroku logs --tail -a bookshelf-hermes

# Open app in browser
heroku open -a bookshelf-hermes
```

## Database Management Commands

### View Database Info
```bash
heroku pg:info -a bookshelf-hermes
```

### Connect to Database Console
```bash
heroku pg:psql -a bookshelf-hermes
```

### Run SQL Queries
```bash
# Count books
heroku pg:psql -a bookshelf-hermes -c "SELECT COUNT(*) FROM books;"

# List recent books
heroku pg:psql -a bookshelf-hermes -c "SELECT id, title, author FROM books ORDER BY created_at DESC LIMIT 5;"
```

### Backup Database
```bash
heroku pg:backups:capture -a bookshelf-hermes
heroku pg:backups:download -a bookshelf-hermes
```

### Reset Database (CAUTION: Deletes all data)
```bash
heroku pg:reset -a bookshelf-hermes
heroku pg:psql -a bookshelf-hermes < backend/database/schema_postgres.sql
```

## Local Development

### Using SQLite (Default)
```bash
cd backend
source venv/bin/activate
python app.py
```

The app will use `data/bookshelf.db` automatically.

### Using Local PostgreSQL
```bash
# Create local database
createdb bookshelf_dev

# Apply schema
psql bookshelf_dev < backend/database/schema_postgres.sql

# Set DATABASE_URL and run
export DATABASE_URL="postgresql://localhost/bookshelf_dev"
python backend/app.py

# Run smoke test
python backend/scripts/db_smoketest.py
```

## Troubleshooting

### App Crashes on Startup
```bash
# Check logs
heroku logs --tail -a bookshelf-hermes

# Check if DATABASE_URL is set
heroku config -a bookshelf-hermes | grep DATABASE_URL
```

### Database Connection Issues
```bash
# Test database connectivity
heroku pg:psql -a bookshelf-hermes -c "SELECT 1;"

# Check if psycopg2-binary is installed
heroku run -a bookshelf-hermes python -c "import psycopg2; print('OK')"
```

### Schema Not Applied
```bash
# Re-apply schema
heroku pg:psql -a bookshelf-hermes < backend/database/schema_postgres.sql
```

### Query Placeholder Errors
The db.py layer automatically converts SQLite `?` placeholders to Postgres `%s` placeholders. If you see placeholder errors, check that queries are going through the Database class methods.

## Migration Notes

### What Changed
1. Added `psycopg2-binary==2.9.9` to requirements.txt
2. Created `backend/database/schema_postgres.sql` with Postgres DDL
3. Updated `backend/database/db.py` to support both SQLite and Postgres
4. Created `backend/scripts/db_smoketest.py` for validation
5. Added Procfile and runtime.txt for Heroku
6. Updated app.py to bind to 0.0.0.0 in production

### What Didn't Change
- All service layer code remains unchanged
- All queries still use `?` placeholders (converted automatically)
- SQLite still works for local development
- No changes to frontend
- No changes to API contracts

### Phase 1 Scope
This migration covers structured data only. File storage (spine images) still uses local filesystem and will need S3 integration in Phase 2.

## Next Steps (Future Phases)

Phase 2 could include:
- Migrate spine_images from filesystem to S3
- Add authentication and user accounts
- Implement multi-user support
- Add automated backups

