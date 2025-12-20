# Bookshelf - Quick Start Guide

Your personal library management system is now ready to use!

## What You Got

A complete locally-hosted application with:
- **Personal Library**: Add books with automatic metadata from Open Library
- **Reading Shelves**: Want to Read, Currently Reading, Read
- **Beli-Style Ranking**: Pairwise comparison system to rank your read books
- **Tags**: Organize books with custom colored tags
- **Reading Goals**: Set and track yearly/monthly/weekly goals with pace calculations
- **Thought Continuations**: Link books that continue intellectual themes
- **Bookshelf Visualization**: Generate beautiful bookshelves from spine images
- **Goodreads Import**: Bootstrap your library from Goodreads CSV export

## Starting the Application

### First Time Setup

Run the setup script:
```bash
./setup.sh
```

This will:
- Create Python virtual environment
- Install all dependencies
- Set up database and directories

### Every Time

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd bookshelf-ts-site
npm start
```

The app will open at `http://localhost:3000`

## How to Use

### 1. Add Your First Book
- Click "Add Book" button
- Search by title (fetches metadata automatically from Open Library)
- Or add manually
- Choose which shelf (Want/Reading/Read)
- Upload spine image if you have one

### 2. Organize with Shelves
- Use "Shelves" tab to see your three shelves
- Move books between shelves
- Start reading books from "Want to Read"
- Finish books from "Currently Reading" → triggers ranking wizard

### 3. Rank Your Read Books
- When you finish a book, you'll set initial stars
- Then answer comparison questions: "Which was better?"
- The system uses binary search insertion (log2(N) comparisons)
- Book is placed in your global ranked list

### 4. Set Reading Goals
- Go to "Goals" tab
- Set target (e.g., 24 books per year)
- Track progress with visual indicators
- See pace needed to meet your goal

### 5. Use Tags
- Create colored tags in "Tags" tab
- Add tags to books for organization
- Filter your library by tags

### 6. Visualize Your Bookshelf
- Go to "Visualize" tab
- Select which shelf to visualize
- Click "Generate Bookshelf"
- Download the image

### 7. Import from Goodreads
- Export your Goodreads library as CSV
- Go to "Import" tab
- Upload CSV file
- All "Read" books will be imported with ratings

## Project Structure

```
bookshelf/
├── backend/               # Flask API server
│   ├── app.py            # Main application
│   ├── database/         # Database and schema
│   ├── services/         # Business logic
│   └── data/             # SQLite DB and spine images
│
├── bookshelf-ts-site/    # React frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Main pages
│   │   ├── services/     # API service
│   │   └── types/        # TypeScript types
│   └── public/
│
└── setup.sh              # Setup script
```

## Key Features Explained

### Beli-Style Ranking
- When you finish a book and rate it, you don't just set stars
- You answer head-to-head questions comparing it to similar books
- The system records these comparisons
- Over time, your ranking becomes more accurate than simple star ratings
- You can see your complete ranked list in "Rankings" tab

### Thought Continuations
- Link books that continue intellectual themes
- Example: "Sapiens" → "Homo Deus" → "21 Lessons"
- Different from series (which is also tracked)
- Visualize your intellectual journey as a graph

### Bookshelf Visualization
- Upload spine images for your books
- Generate a visual bookshelf showing all your books
- Books are arranged on wooden shelves with proper dimensions
- Download as an image to share

### Smart Metadata Fetching
- Type a book title, get author, ISBN, cover image, etc.
- Powered by Open Library API (free, no limits)
- Fallback to manual entry if book not found

## Tips

1. **Upload Spine Images**: Makes the bookshelf visualization amazing
2. **Use Tags**: Great for tracking themes, reading challenges, etc.
3. **Set Realistic Goals**: Start with achievable targets
4. **Rank Honestly**: The pairwise comparisons work best when you're honest
5. **Add "Why Reading"**: For Currently Reading books, note why you're reading it
6. **Use Notes**: Add thoughts, quotes, or reflections to any book

## Troubleshooting

**Backend won't start:**
- Make sure virtual environment is activated
- Check that port 5000 is not in use
- Run `pip install -r requirements.txt` again

**Frontend won't start:**
- Run `npm install` again
- Check that port 3000 is not in use
- Clear node_modules and reinstall

**Can't fetch book metadata:**
- Check internet connection
- Open Library might be temporarily down
- Use manual entry as fallback

**Bookshelf won't generate:**
- Make sure books have spine images uploaded
- Check that dimensions are set correctly
- Try with fewer books first

## Data Location

All your data is stored locally in:
- Database: `backend/data/bookshelf.db`
- Spine Images: `backend/data/spine_images/`

Back these up regularly!

## Next Steps

- Start adding books to your library
- Upload spine images for visualization
- Set your reading goal for the year
- Import your Goodreads history
- Begin ranking your favorite books

Enjoy your personal bookshelf! 📚

