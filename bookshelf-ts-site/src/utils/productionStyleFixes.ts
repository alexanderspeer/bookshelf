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
  // Note: Font sizes are now in CSS files as pixel values, so we only need production-specific overrides
  styleElement.textContent = `
    /* Production-only fixes - ensure base font size is correct */
    
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

