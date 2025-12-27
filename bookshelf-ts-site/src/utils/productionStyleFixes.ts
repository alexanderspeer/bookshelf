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
  
  // Create or update style element with maximum priority
  const styleId = 'production-style-fixes';
  let styleElement = document.getElementById(styleId);
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    // Insert at the END of head to override everything
    document.head.appendChild(styleElement);
  }
  
  // Force exact pixel sizes to match local environment
  // Local CSS uses 0.8em which computes to 12.8px when base is 16px
  styleElement.textContent = `
    /* Production override - force local rendering exactly */
    
    /* CRITICAL: Lock base font-size */
    html {
      font-size: 16px !important;
    }
    
    body {
      font-size: 16px !important;
    }
    
    /* Force ALL containers to use 16px base */
    #root,
    .rpgui-content,
    .app,
    .home-container,
    .home-main,
    .home-sidebar,
    .bookshelf-controls {
      font-size: 16px !important;
    }
    
    /* Override RPGUI and all button styles with exact pixel values */
    body button,
    body .rpgui-button,
    body .primary-button,
    body .secondary-button,
    body .set-goal-button,
    body .finish-book-button,
    body .edit-book-button,
    body .delete-book-button,
    body .reset-color-button,
    body .reset-font-button,
    body .add-tag-button,
    .rpgui-content button,
    .rpgui-content .rpgui-button,
    .rpgui-content .primary-button,
    .rpgui-content .secondary-button {
      font-size: 12.8px !important;
      line-height: 1.5 !important;
      min-height: 50px !important;
      max-height: 50px !important;
      padding: 10px 25px !important;
      box-sizing: border-box !important;
      margin: 0 !important;
    }
    
    /* Override ALL input and select styles */
    body .search-input,
    body .filter-select,
    body input[type="text"],
    body input[type="number"],
    body input[type="email"],
    body input[type="password"],
    body select,
    body textarea,
    .rpgui-content input[type="text"],
    .rpgui-content input[type="number"],
    .rpgui-content input[type="email"],
    .rpgui-content input[type="password"],
    .rpgui-content textarea,
    .rpgui-content select,
    .rpgui-content .search-input,
    .rpgui-content .filter-select {
      font-size: 12.8px !important;
      line-height: 32px !important;
      height: 40px !important;
      min-height: 40px !important;
      max-height: 40px !important;
      box-sizing: border-box !important;
    }
    
    /* Goal menu button - smaller button */
    body .goal-menu-button,
    .rpgui-content .goal-menu-button {
      font-size: 16px !important;
      min-width: 40px !important;
      min-height: 40px !important;
      max-width: 40px !important;
      max-height: 40px !important;
      padding: 8px !important;
      line-height: 1 !important;
    }
    
    /* Theme button */
    body .theme-button,
    .rpgui-content .theme-button {
      font-size: 16px !important;
      height: 40px !important;
      min-width: 100px !important;
      padding: 8px !important;
    }
    
    /* Text and labels */
    .rpgui-content p,
    .rpgui-content label,
    body .rpgui-content p,
    body .rpgui-content label {
      font-size: 12.8px !important;
      line-height: 1.8 !important;
    }
    
    /* Headings */
    .rpgui-content h1,
    body .rpgui-content h1 {
      font-size: 19.2px !important;
    }
    
    .rpgui-content h2,
    body .rpgui-content h2 {
      font-size: 17.6px !important;
    }
    
    .rpgui-content h3,
    body .rpgui-content h3 {
      font-size: 16px !important;
    }
    
    .rpgui-content h4,
    body .rpgui-content h4 {
      font-size: 14.4px !important;
    }
    
    /* Goal numbers */
    .goal-numbers,
    body .goal-numbers,
    .rpgui-content .goal-numbers {
      font-size: 24px !important;
    }
    
    /* Tag buttons */
    .tag-button,
    body .tag-button,
    .rpgui-content .tag-button {
      font-size: 11.2px !important;
    }
    
    /* Sidebar sections */
    .sidebar-section,
    body .sidebar-section {
      font-size: 16px !important;
    }
    
    /* Goal display */
    .goal-display,
    body .goal-display {
      font-size: 16px !important;
    }
    
    .goal-display p,
    body .goal-display p {
      font-size: 12.8px !important;
    }
  `;
}


