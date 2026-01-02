# Database Architecture Documentation

## Overview

The bookshelf application uses a database abstraction layer that supports both SQLite (for local development) and PostgreSQL (for production deployment on Heroku). The system automatically detects which database to use based on the `DATABASE_URL` environment variable.

## Database Abstraction Layer

### Location
- **File**: `backend/database/db.py`
- **Class**: `Database`
- **Singleton Access**: `get_db()` function

### How It Works

1. **Database Selection Logic** (`Database.__init__`):
   - If `DATABASE_URL` environment variable is set → uses PostgreSQL
   - If `DATABASE_URL` is not set → uses SQLite at `data/bookshelf.db`
   - SQLite database is automatically created with schema if it doesn't exist

2. **Query Conversion** (`Database._convert_query`):
   The system converts SQLite-style queries to PostgreSQL when needed:
   - **Placeholders**: `?` → `%s` (for PostgreSQL)
   - **Date functions**: `strftime('%Y', column)` → `EXTRACT(YEAR FROM column)::TEXT`
   - **Date casting**: `DATE(column)` → `column::DATE`

3. **Connection Management**:
   - Uses context managers for safe connection handling
   - Automatic transaction management (commit/rollback)
   - Returns rows as dictionaries for consistent API

4. **Return Value Handling**:
   - `execute_query()`: Returns list of dictionaries (SELECT queries)
   - `execute_update()`: Returns lastrowid (INSERT) or None (UPDATE/DELETE)
   - For PostgreSQL INSERTs, automatically adds `RETURNING id` clause to get the new ID

## Schema Files

### SQLite Schema
- **File**: `backend/database/schema.sql`
- **Auto-applied**: Yes, when SQLite database is first created
- **Key differences from PostgreSQL**:
  - Uses `INTEGER PRIMARY KEY AUTOINCREMENT`
  - Uses `TIMESTAMP` (not `TIMESTAMPTZ`)
  - Uses `BOOLEAN DEFAULT 0` (integer)
  - Uses `INTEGER` for IDs

### PostgreSQL Schema
- **File**: `backend/database/schema_postgres.sql`
- **Auto-applied**: No, must be manually applied before first use
- **Key differences from SQLite**:
  - Uses `SERIAL PRIMARY KEY` (auto-increment)
  - Uses `TIMESTAMPTZ` (timezone-aware timestamps)
  - Uses `BOOLEAN DEFAULT FALSE` (true boolean)
  - Same table structure, different syntax

### Tables

1. **users** - User accounts (email, password hash)
2. **books** - Book metadata (title, author, ISBN, dates, etc.)
3. **reading_states** - Reading status (want_to_read, currently_reading, read)
4. **rankings** - Book ranking/rating system
5. **comparisons** - Pairwise comparison history for ranking
6. **tags** - Tag definitions
7. **book_tags** - Many-to-many relationship (books ↔ tags)
8. **thought_continuations** - Book relationship links
9. **reading_goals** - User reading goals per year
10. **import_history** - Goodreads import tracking

## Service Layer Usage

All services use the database abstraction layer consistently:

```python
from database.db import get_db

class SomeService:
    def __init__(self):
        self.db = get_db()  # Gets singleton Database instance
    
    def some_method(self):
        # All queries use ? placeholders (converted automatically for PostgreSQL)
        results = self.db.execute_query("SELECT * FROM books WHERE id = ?", (book_id,))
        book_id = self.db.execute_update("INSERT INTO books (...) VALUES (?, ?)", (title, author))
```

### Services Using Database
- `backend/services/auth_service.py` - User authentication
- `backend/services/book_service.py` - Book CRUD operations
- `backend/services/continuation_service.py` - Thought continuations
- `backend/services/goal_service.py` - Reading goals
- `backend/services/ranking_service.py` - Book rankings
- `backend/services/tag_service.py` - Tags management

## SQLite-Specific Patterns That Need Conversion

### Currently NOT Handled by Conversion Layer

1. **INSERT OR IGNORE** (found in):
   - `continuation_service.py` line 12
   - `tag_service.py` line 92
   
   **SQLite**: `INSERT OR IGNORE INTO table (col) VALUES (?)`
   **PostgreSQL**: `INSERT INTO table (col) VALUES (?) ON CONFLICT DO NOTHING`

2. **SUBSTR() function** (found in):
   - `goal_service.py` lines 76, 77, 215, 216
   
   **SQLite**: `SUBSTR(column, 1, 10)`
   **PostgreSQL**: `SUBSTRING(column FROM 1 FOR 10)` or `column[1:10]` (string slicing)

3. **ON CONFLICT syntax** (found in):
   - `book_service.py` line 292
   - `goal_service.py` line 19
   
   **Status**: Actually compatible! Both SQLite and PostgreSQL support `ON CONFLICT ... DO UPDATE SET`, but:
   - SQLite: `ON CONFLICT(column) DO UPDATE SET ...`
   - PostgreSQL: Same syntax, but may need unique constraint/index specified differently
   
   Currently works because the unique constraints exist in both schemas.

### Currently Handled by Conversion Layer

1. ✅ Placeholder conversion: `?` → `%s`
2. ✅ `strftime('%Y', column)` → `EXTRACT(YEAR FROM column)::TEXT`
3. ✅ `DATE(column)` → `column::DATE`
4. ✅ `RETURNING id` clause automatically added for INSERTs in PostgreSQL

## Heroku Postgres Integration

### Environment Variable
- **Name**: `DATABASE_URL`
- **Format**: `postgresql://user:password@host:port/database`
- **Auto-set by**: Heroku Postgres addon
- **Detection**: If set, app uses PostgreSQL; otherwise SQLite

### Initialization Steps

1. **Create Postgres addon**:
   ```bash
   heroku addons:create heroku-postgresql:essential-0 -a bookshelf-hermes
   ```

2. **Apply schema** (one-time):
   ```bash
   heroku pg:psql -a bookshelf-hermes < backend/database/schema_postgres.sql
   ```

3. **Verify schema**:
   ```bash
   heroku pg:psql -a bookshelf-hermes
   \dt  # List tables
   \q   # Exit
   ```

4. **Deploy application**:
   - Heroku automatically sets `DATABASE_URL`
   - App detects it and uses PostgreSQL

### Migration Scripts

Located in `backend/scripts/`:

1. **migrate_data.py** - Full data migration from SQLite to PostgreSQL
2. **migrate_quick.py** - Quick migration script
3. **migrate_finish.py** - Complete migration (imports remaining relationships)
4. **db_smoketest.py** - Test database connectivity and operations

## Current State Analysis

### What Works for Heroku Deployment

✅ Database abstraction layer exists and detects `DATABASE_URL`  
✅ PostgreSQL schema file exists (`schema_postgres.sql`)  
✅ Query conversion handles most common patterns  
✅ All services use the abstraction layer  
✅ Migration scripts exist for data transfer  
✅ `psycopg[binary]>=3.1.0` package is in requirements.txt (psycopg3, not psycopg2)

### What Needs Attention Before Heroku Deployment

⚠️ **INSERT OR IGNORE** statements need conversion:
- `continuation_service.py:12` - `INSERT OR IGNORE INTO thought_continuations`
- `tag_service.py:92` - `INSERT OR IGNORE INTO book_tags`

⚠️ **SUBSTR() function** needs conversion:
- `goal_service.py:76,77,215,216` - `SUBSTR(b.date_finished, 1, 10)`

⚠️ **Schema initialization**: PostgreSQL schema must be manually applied (SQLite auto-creates, Postgres doesn't)

⚠️ **Testing**: Need to verify all query conversions work correctly with real PostgreSQL database

## Recommended Actions for Heroku Deployment

1. **Enhance query conversion** in `db.py` to handle:
   - `INSERT OR IGNORE` → `INSERT ... ON CONFLICT DO NOTHING`
   - `SUBSTR()` → `SUBSTRING()` or string slicing

2. **Add schema initialization** for PostgreSQL (optional enhancement):
   - Could add logic to check if tables exist and create them if not
   - Or add a one-time initialization script

3. **Test query conversion**:
   - Run test suite against PostgreSQL database
   - Verify all service methods work with PostgreSQL

4. **Apply schema** to Heroku database before first deployment

5. **Migrate existing data** (if any) using migration scripts

## Summary

### Database Detection Flow

```
App Starts
    ↓
Check for DATABASE_URL environment variable
    ↓
┌─────────────────┬─────────────────┐
│   DATABASE_URL  │  No DATABASE_URL │
│      SET        │                  │
└─────────────────┴─────────────────┘
    ↓                     ↓
PostgreSQL              SQLite
(Heroku Production)    (Local Development)
    ↓                     ↓
Use psycopg3          Use sqlite3
Connect via URL       Connect to file
                      Auto-create schema
```

### Key Files Summary

| File | Purpose |
|------|---------|
| `backend/database/db.py` | Database abstraction layer - handles both SQLite and PostgreSQL |
| `backend/database/schema.sql` | SQLite schema (auto-applied) |
| `backend/database/schema_postgres.sql` | PostgreSQL schema (manual application required) |
| `backend/services/*.py` | Service layer - uses `get_db()` to access database |
| `backend/scripts/migrate_*.py` | Data migration scripts |
| `backend/scripts/db_smoketest.py` | Database connectivity tests |

### Transition Checklist

When ready to deploy to Heroku:

- [ ] Apply PostgreSQL schema to Heroku database
- [ ] Fix `INSERT OR IGNORE` statements (2 locations)
- [ ] Fix `SUBSTR()` function calls (4 locations)
- [ ] Test all queries with PostgreSQL locally
- [ ] Run smoke tests on Heroku
- [ ] Migrate existing data (if needed)
- [ ] Update file storage (spine images) to use S3 or Heroku's ephemeral filesystem

### Current Compatibility Status

**Fully Compatible:**
- ✅ Basic CRUD operations
- ✅ JOIN queries
- ✅ Date functions (with conversion)
- ✅ Placeholder conversion (? → %s)
- ✅ Transaction management
- ✅ Foreign key constraints
- ✅ ON CONFLICT ... DO UPDATE (works but syntax differs slightly)

**Needs Conversion:**
- ⚠️ `INSERT OR IGNORE` → `INSERT ... ON CONFLICT DO NOTHING`
- ⚠️ `SUBSTR()` → `SUBSTRING()` or string slicing
- ⚠️ Schema initialization (manual for PostgreSQL)

**File System Dependencies:**
- ⚠️ Spine images stored in `data/spine_images/` (local filesystem)
- ⚠️ Will reset on Heroku dyno restart (ephemeral filesystem)
- ⚠️ Consider migrating to S3 or another persistent storage solution

