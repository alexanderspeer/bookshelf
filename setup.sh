#!/bin/bash

# Setup script for Bookshelf application

echo "Setting up Bookshelf..."

# Create backend environment
echo "Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Create data directories
mkdir -p data/spine_images

# Copy .env.example to .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
fi

echo "Backend setup complete!"

# Setup frontend
echo "Setting up frontend..."
cd ../bookshelf-ts-site

if [ ! -d "node_modules" ]; then
    npm install
fi

echo "Frontend setup complete!"

echo ""
echo "Setup complete! To start the application:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  python app.py"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd bookshelf-ts-site"
echo "  npm start"
echo ""

