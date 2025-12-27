// Production-only style fixes for Heroku deployment
// This only applies size fixes when NOT running on localhost

export function applyProductionStyleFixes() {
  // Only apply if we're NOT on localhost (i.e., we're in production)
  const isProduction = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('127.0.0.1');
  
  if (!isProduction) {
    console.log('Running locally - skipping production style fixes');
    return;
  }
  
  console.log('Production environment detected - applying style fixes');
  
  // Create or update style element
  const styleId = 'production-style-fixes';
  let styleElement = document.getElementById(styleId);
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  // Inject production-specific CSS fixes
  // Force the exact computed pixel values that work locally
  styleElement.textContent = `
    /* Production-only fixes - force exact local sizes */
    
    /* Normalize base font size to 16px (standard) */
    html, body {
      font-size: 16px !important;
      -webkit-text-size-adjust: 100% !important;
      -moz-text-size-adjust: 100% !important;
    }
    
    /* Force computed pixel values for all RPGUI text elements */
    /* Local: 0.8em of 16px = 12.8px */
    .rpgui-content input[type="text"],
    .rpgui-content input[type="number"],
    .rpgui-content input[type="email"],
    .rpgui-content input[type="password"],
    .rpgui-content textarea,
    .search-input,
    .form-group input,
    .rpgui-content select,
    .filter-select,
    .book-font-selector,
    .form-group select,
    button,
    .rpgui-button,
    .primary-button,
    .secondary-button,
    .set-goal-button,
    .finish-book-button,
    .edit-book-button,
    .delete-book-button,
    .reset-color-button,
    .reset-font-button,
    .goal-menu-button,
    .add-tag-button,
    .rpgui-content p,
    .rpgui-content label {
      font-size: 12.8px !important;
    }
    
    /* Goal menu button and modal close - local: 1em = 16px */
    .goal-menu-button,
    .modal-close {
      font-size: 16px !important;
      min-width: 40px !important;
      min-height: 40px !important;
      padding: 8px !important;
    }
    
    /* Headings - maintain relative sizes */
    .rpgui-content h1 {
      font-size: 19.2px !important; /* 1.2em of 16px */
    }
    
    .rpgui-content h2 {
      font-size: 17.6px !important; /* 1.1em of 16px */
    }
    
    .rpgui-content h3 {
      font-size: 16px !important; /* 1.0em */
    }
    
    .rpgui-content h4 {
      font-size: 14.4px !important; /* 0.9em of 16px */
    }
    
    /* Tag buttons and small text */
    .tag-button {
      font-size: 11.2px !important; /* 0.7em of 16px */
    }
    
    /* Goal numbers display */
    .goal-numbers {
      font-size: 24px !important; /* 1.5em of 16px */
    }
    
    /* Theme button specific */
    .theme-button {
      font-size: 16px !important; /* 1em of 16px */
    }
    
    /* Ensure line heights match local */
    .search-input,
    .filter-select {
      line-height: 32px !important;
    }
    
    button,
    .rpgui-button,
    .primary-button,
    .secondary-button {
      line-height: 1.5 !important;
    }
    
    /* Force exact heights */
    .search-input,
    .filter-select,
    .theme-button {
      height: 40px !important;
      box-sizing: border-box !important;
    }
    
    button,
    .primary-button,
    .secondary-button,
    .set-goal-button,
    .finish-book-button,
    .edit-book-button,
    .delete-book-button {
      min-height: 50px !important;
      box-sizing: border-box !important;
    }
  `;
}

