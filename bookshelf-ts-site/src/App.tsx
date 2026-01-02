import React, { useEffect, useState } from 'react';
import './App.css';
import './styles/library.css';
import './styles/rpgui-integration.css';
import './styles/rpgui-fixes.css';
import './styles/toast.css';
import { Home } from './pages/Home';
import { Auth } from './pages/Auth';
import { PublicBookshelf } from './pages/PublicBookshelf';
import { PublicUserProfile } from './pages/PublicUserProfile';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { applyRPGUICursorFixes } from './utils/rpguiCursorFix';
import { applyProductionStyleFixes } from './utils/productionStyleFixes';
import apiService from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Apply RPGUI cursor fixes on mount
    applyRPGUICursorFixes();
    
    // Apply production-only style fixes (only on Heroku, not localhost)
    applyProductionStyleFixes();

    // Check authentication status
    checkAuth();

    // Listen for path changes
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const checkAuth = async () => {
    try {
      await apiService.getCurrentUser();
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="rpgui-content">
        <div className="app">
          <ToastContainer position="top-right" autoClose={1000} closeButton={false} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Parse path for routing
  const pathParts = currentPath.split('/').filter(Boolean);
  
  // Public user profile routes: /u/:username or /u/:username/shelf or /u/:username/stats
  if (pathParts[0] === 'u' && pathParts[1]) {
    const username = pathParts[1];
    const subPath = pathParts[2]; // 'shelf' or 'stats'
    return (
      <div className="rpgui-content">
        <div className="app">
          <ToastContainer position="top-right" autoClose={1000} closeButton={false} />
          <PublicUserProfile username={username} subPath={subPath} />
        </div>
      </div>
    );
  }

  // Public bookshelf route (no auth required) - legacy route
  if (currentPath === '/public') {
    return (
      <div className="rpgui-content">
        <div className="app">
          <ToastContainer position="top-right" autoClose={1000} closeButton={false} />
          <PublicBookshelf />
        </div>
      </div>
    );
  }

  // Require authentication for main app
  if (!isAuthenticated) {
    return (
      <div className="app">
        <ToastContainer position="top-right" autoClose={1000} closeButton={false} />
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="rpgui-content">
      <div className="app">
        <ToastContainer position="top-right" autoClose={1000} closeButton={false} />
        <span
          onClick={handleLogout}
          className="logout-link"
          style={{
            position: 'fixed',
            top: '4px',
            right: '16px',
            zIndex: 10000,
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: "'Press Start 2P', cursive",
            userSelect: 'none',
            background: 'none',
            border: 'none',
            padding: '0',
            margin: '0',
            display: 'inline-block'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Logout
        </span>
        <Home />
      </div>
    </div>
  );
}

export default App;
