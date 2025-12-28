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
    
    /* Normalize base font size */
    html {
      font-size: 16px !important;
      -webkit-text-size-adjust: none !important;
    }
    
    body {
      font-size: 16px !important;
      -webkit-text-size-adjust: none !important;
    }
    
    /* Fix button sizing to match local */
    button,
    .rpgui-button,
    .primary-button,
    .secondary-button,
    .theme-button,
    .goal-menu-button,
    .set-goal-button,
    .finish-book-button,
    .edit-book-button,
    .delete-book-button {
      font-size: 0.8em !important;
      line-height: 1.5 !important;
    }
    
    /* Fix input and select sizing */
    input[type="text"],
    input[type="number"],
    input[type="email"],
    input[type="password"],
    select,
    textarea,
    .search-input,
    .filter-select {
      font-size: 0.8em !important;
      line-height: normal !important;
    }
    
    /* Fix label and text sizing */
    label,
    p,
    span {
      font-size: 1em !important;
    }
    
    /* Fix heading sizes */
    .rpgui-content h1 {
      font-size: 1.2em !important;
    }
    
    .rpgui-content h2 {
      font-size: 1.1em !important;
    }
    
    .rpgui-content h3 {
      font-size: 1.0em !important;
    }
    
    .rpgui-content h4 {
      font-size: 0.9em !important;
    }
    
    .rpgui-content p,
    .rpgui-content label {
      font-size: 0.8em !important;
    }
    
    /* Ensure RPGUI button text matches */
    .rpgui-button p,
    .rpgui-button.golden p {
      font-size: 1em !important;
    }
    
    /* Goal menu button specific fix */
    .goal-menu-button {
      min-width: 40px !important;
      min-height: 40px !important;
      padding: 8px !important;
      font-size: 1em !important;
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

