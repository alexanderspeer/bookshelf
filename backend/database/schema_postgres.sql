-- PostgreSQL Schema for Bookshelf Application
-- Converted from SQLite schema.sql

-- Books table with all metadata
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    isbn TEXT,
    isbn13 TEXT,
    pub_date TEXT,
    num_pages INTEGER,
    genre TEXT,
    cover_image_url TEXT,
    spine_image_path TEXT,
    dimensions TEXT,
    dom_color TEXT,
    series TEXT,
    series_position TEXT,
    notes TEXT,
    why_reading TEXT,
    date_added TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    date_started TIMESTAMPTZ,
    date_finished TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Reading states/shelves
CREATE TABLE IF NOT EXISTS reading_states (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('want_to_read', 'currently_reading', 'read')),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(book_id)
);

-- Rankings table for pairwise comparisons
CREATE TABLE IF NOT EXISTS rankings (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL,
    rank_position INTEGER NOT NULL,
    initial_stars REAL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(book_id)
);

-- Pairwise comparisons history
CREATE TABLE IF NOT EXISTS comparisons (
    id SERIAL PRIMARY KEY,
    book_a_id INTEGER NOT NULL,
    book_b_id INTEGER NOT NULL,
    winner_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_a_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (book_b_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Book-Tag junction table
CREATE TABLE IF NOT EXISTS book_tags (
    book_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (book_id, tag_id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Thought continuations (book relationships)
CREATE TABLE IF NOT EXISTS thought_continuations (
    id SERIAL PRIMARY KEY,
    from_book_id INTEGER NOT NULL,
    to_book_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (to_book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(from_book_id, to_book_id)
);

-- Reading goals
CREATE TABLE IF NOT EXISTS reading_goals (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    target_count INTEGER NOT NULL,
    period TEXT NOT NULL CHECK(period IN ('year', 'month', 'week')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year)
);

-- Import history (for Goodreads imports)
CREATE TABLE IF NOT EXISTS import_history (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    books_imported INTEGER,
    import_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON books(isbn13);
CREATE INDEX IF NOT EXISTS idx_reading_states_book_id ON reading_states(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_states_state ON reading_states(state);
CREATE INDEX IF NOT EXISTS idx_rankings_book_id ON rankings(book_id);
CREATE INDEX IF NOT EXISTS idx_rankings_rank_position ON rankings(rank_position);
CREATE INDEX IF NOT EXISTS idx_book_tags_book_id ON book_tags(book_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_tag_id ON book_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_book_a ON comparisons(book_a_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_book_b ON comparisons(book_b_id);

