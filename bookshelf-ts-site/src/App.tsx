import React, { useEffect } from 'react';
import './App.css';
import './styles/library.css';
import './styles/rpgui-integration.css';
import './styles/rpgui-fixes.css';
import './styles/toast.css';
import { Home } from './pages/Home';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { applyRPGUICursorFixes } from './utils/rpguiCursorFix';

function App() {
  useEffect(() => {
    // Apply RPGUI cursor fixes on mount
    applyRPGUICursorFixes();
  }, []);

  return (
    <div className="rpgui-content">
      <div className="app">
        <ToastContainer position="top-right" autoClose={1000} closeButton={false} />
        <Home />
      </div>
    </div>
  );
}

export default App;
