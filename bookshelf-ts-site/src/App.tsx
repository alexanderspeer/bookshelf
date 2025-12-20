import React, { useState } from 'react';
import './App.css';
import './styles/library.css';
import { Library } from './pages/Library';
import { Shelves } from './pages/Shelves';
import { Rankings } from './pages/Rankings';
import { VisualizeShelf } from './pages/VisualizeShelf';
import { ReadingGoals } from './pages/ReadingGoals';
import { TagManager } from './pages/TagManager';
import { GoodreadsImport } from './pages/GoodreadsImport';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [activePage, setActivePage] = useState<string>('library');

  const renderPage = () => {
    switch (activePage) {
      case 'library':
        return <Library />;
      case 'shelves':
        return <Shelves />;
      case 'rankings':
        return <Rankings />;
      case 'visualize':
        return <VisualizeShelf />;
      case 'goals':
        return <ReadingGoals />;
      case 'tags':
        return <TagManager />;
      case 'import':
        return <GoodreadsImport />;
      default:
        return <Library />;
    }
  };

  return (
    <div className="app">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <nav className="main-nav">
        <div className="nav-brand">
          <h1>📚 Bookshelf</h1>
          </div>
        <div className="nav-links">
          <button
            className={activePage === 'library' ? 'active' : ''}
            onClick={() => setActivePage('library')}
          >
            Library
          </button>
          <button
            className={activePage === 'shelves' ? 'active' : ''}
            onClick={() => setActivePage('shelves')}
          >
            Shelves
          </button>
          <button
            className={activePage === 'rankings' ? 'active' : ''}
            onClick={() => setActivePage('rankings')}
          >
            Rankings
          </button>
          <button
            className={activePage === 'visualize' ? 'active' : ''}
            onClick={() => setActivePage('visualize')}
          >
            Visualize
          </button>
          <button
            className={activePage === 'goals' ? 'active' : ''}
            onClick={() => setActivePage('goals')}
          >
            Goals
          </button>
          <button
            className={activePage === 'tags' ? 'active' : ''}
            onClick={() => setActivePage('tags')}
          >
            Tags
          </button>
          <button
            className={activePage === 'import' ? 'active' : ''}
            onClick={() => setActivePage('import')}
          >
            Import
          </button>
        </div>
      </nav>

      <main className="main-content">
        {renderPage()}
      </main>
      </div>
  );
}

export default App;
