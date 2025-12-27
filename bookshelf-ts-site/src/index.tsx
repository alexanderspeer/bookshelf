import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { applyProductionStyleFixes } from './utils/productionStyleFixes';
import { forceRPGUICursor } from './utils/forceRPGUICursor';

// Apply production fixes BEFORE React renders (Heroku only)
applyProductionStyleFixes();

// Apply cursor fixes everywhere (local AND production)
forceRPGUICursor();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
