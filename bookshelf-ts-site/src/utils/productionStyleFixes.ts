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
  // These match the local sizes exactly
  styleElement.textContent = `
    /* Production-only fixes - match local sizing exactly */
    
    /* Normalize base font size to exactly match localhost */
    html {
      font-size: 16px !important;
      -webkit-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
    }
    
    body {
      font-size: 16px !important;
      -webkit-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
    }
    
    /* Fix button sizing to match local - use exact pixel values with MAXIMUM specificity */
    .rpgui-content button,
    button.rpgui-button,
    button.primary-button,
    button.secondary-button,
    button.theme-button,
    button.set-goal-button,
    button.finish-book-button,
    button.edit-book-button,
    button.delete-book-button,
    button.reset-color-button,
    button.reset-font-button,
    button.add-tag-button,
    .rpgui-content .primary-button,
    .rpgui-content .secondary-button,
    .rpgui-content .theme-button,
    .rpgui-content .set-goal-button,
    .rpgui-content .finish-book-button,
    .rpgui-content .edit-book-button,
    .rpgui-content .delete-book-button,
    .rpgui-content .reset-color-button,
    .rpgui-content .reset-font-button,
    .rpgui-content .add-tag-button,
    .home-sidebar .primary-button,
    .home-sidebar .secondary-button,
    .sidebar-section .primary-button,
    .sidebar-section .secondary-button {
      font-size: 12.8px !important; /* 0.8em of 16px = exact match to localhost */
      line-height: 1.5 !important;
    }
    
    /* Force button font size with even more specificity */
    div.home-sidebar button.primary-button,
    div.home-sidebar button.secondary-button,
    div.sidebar-section button.primary-button,
    div.sidebar-section button.secondary-button,
    div.rpgui-content button.primary-button,
    div.rpgui-content button.secondary-button {
      font-size: 12.8px !important;
    }
    
    /* Fix input and select sizing - use exact pixel values with MAXIMUM specificity */
    .rpgui-content input[type="text"],
    .rpgui-content input[type="number"],
    .rpgui-content input[type="email"],
    .rpgui-content input[type="password"],
    .rpgui-content .search-input,
    input[type="text"].search-input,
    input.search-input,
    .search-filter-section .search-input,
    .bookshelf-controls .search-input,
    .home-main .search-input,
    .rpgui-content .filter-select,
    select.filter-select,
    .filter-select,
    .search-filter-section .filter-select,
    .bookshelf-controls .filter-select,
    .home-main .filter-select,
    .rpgui-content select,
    .rpgui-content textarea,
    .form-group input,
    .form-group select {
      font-size: 12.8px !important; /* 0.8em of 16px = exact match to localhost */
      line-height: 32px !important;
    }
    
    /* Force filter-select font size with even more specificity */
    div.search-filter-section select.filter-select,
    div.bookshelf-controls select.filter-select,
    div.home-main select.filter-select {
      font-size: 12.8px !important;
    }
    
    /* Force search-input font size with even more specificity */
    div.search-filter-section input.search-input,
    div.bookshelf-controls input.search-input,
    div.home-main input.search-input {
      font-size: 12.8px !important;
    }
    
    /* Fix label and text sizing - use exact pixel values */
    .rpgui-content label,
    .rpgui-content p,
    .rpgui-content span {
      font-size: 12.8px !important; /* 0.8em of 16px = exact match to localhost */
      line-height: 1.8 !important;
    }
    
    /* Empty shelf message should use 1em (16px) - override the above */
    .empty-shelf p,
    .rpgui-content .empty-shelf p {
      font-size: 16px !important; /* 1em of 16px = exact match to localhost */
    }
    
    /* Fix heading sizes - use exact pixel values */
    .rpgui-content h1 {
      font-size: 19.2px !important; /* 1.2em of 16px = exact match to localhost */
    }
    
    .rpgui-content h2 {
      font-size: 17.6px !important; /* 1.1em of 16px = exact match to localhost */
    }
    
    .rpgui-content h3 {
      font-size: 16px !important; /* 1.0em of 16px = exact match to localhost */
    }
    
    .rpgui-content h4 {
      font-size: 14.4px !important; /* 0.9em of 16px = exact match to localhost */
    }
    
    /* Ensure RPGUI button text matches - use exact pixel values */
    .rpgui-button p,
    .rpgui-button.golden p {
      font-size: 12.8px !important; /* 0.8em of 16px = exact match to localhost */
    }
    
    /* Goal menu button specific fix - use exact pixel values */
    .goal-menu-button {
      min-width: 40px !important;
      min-height: 40px !important;
      padding: 8px !important;
      font-size: 16px !important; /* 1em of 16px = exact match to localhost */
      line-height: 1 !important;
    }
    
    /* Theme button - use exact pixel values */
    .theme-button {
      font-size: 16px !important; /* 1em of 16px = exact match to localhost */
    }
    
    /* Fix stat items - use exact pixel values */
    .rpgui-content .stat-item,
    .stat-item {
      font-size: 12.8px !important; /* 0.8em of 16px = exact match to localhost */
    }
    
    .stat-item-clickable {
      font-size: 12.8px !important; /* 0.8em of 16px = exact match to localhost */
    }
    
    /* Fix goal numbers - use exact pixel values */
    .goal-numbers {
      font-size: 24px !important; /* 1.5em of 16px = exact match to localhost */
    }
    
    .goal-current {
      font-size: 40px !important; /* 2.5em of 16px = exact match to localhost */
    }
    
    .goal-target {
      font-size: 32px !important; /* 2em of 16px = exact match to localhost */
    }
    
    .goal-separator {
      font-size: 28.8px !important; /* 1.8em of 16px = exact match to localhost */
    }
    
    /* Fix dropdown truncation - increase width for "All Shelves" dropdown */
    .filter-select:first-of-type {
      max-width: 200px !important;
      min-width: 180px !important;
      width: auto !important;
      flex-shrink: 0 !important;
    }
    
    /* Ensure dropdown text isn't truncated - allow text to display fully */
    .filter-select {
      text-overflow: ellipsis !important;
      overflow: hidden !important;
      white-space: nowrap !important;
      padding-right: 25px !important;
    }
    
    /* Make sure the selected option text displays fully */
    .filter-select option {
      white-space: normal !important;
    }
    
    /* Fix search input to prevent placeholder truncation */
    .search-filter-section {
      gap: 10px !important;
    }
    
    .search-input {
      min-width: 320px !important;
      width: auto !important;
      flex: 2 1 320px !important;
      flex-shrink: 1 !important;
      max-width: none !important;
    }
    
    /* Ensure placeholder text can display fully - no truncation */
    .search-input::placeholder {
      opacity: 1 !important;
      white-space: nowrap !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }
    
    /* Remove default focus/active state from dropdowns on page load */
    .filter-select:not(:focus):not(:active) {
      border-color: #8B6F47 !important;
      box-shadow: none !important;
      background-color: #4e4a4e !important;
    }
    
    /* Ensure dropdowns don't appear focused by default */
    .filter-select {
      outline: none !important;
    }
    
    .filter-select:focus {
      border-color: #DAA520 !important;
      box-shadow: 0 0 5px #DAA520 !important;
    }
  `;
}

