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
  // These match the local sizes exactly using pixel values
  styleElement.textContent = `
    /* Production-only fixes - match local sizing exactly */
    
    /* Normalize base font size to prevent scaling */
    html {
      font-size: 16px !important;
      -webkit-text-size-adjust: 100% !important;
    }
    
    body {
      font-size: 16px !important;
      -webkit-text-size-adjust: 100% !important;
    }
    
    /* Fix search input - should be smaller */
    .search-input {
      font-size: 13px !important;
      height: 32px !important;
      padding: 6px 12px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix filter select dropdowns - should be smaller */
    .filter-select {
      font-size: 13px !important;
      height: 32px !important;
      padding: 4px 8px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix theme/color button */
    .theme-button {
      font-size: 13px !important;
      height: 32px !important;
      padding: 4px 12px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix primary buttons (like Add New Book) */
    .primary-button {
      font-size: 13px !important;
      height: auto !important;
      min-height: 38px !important;
      padding: 8px 16px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix secondary buttons */
    .secondary-button {
      font-size: 13px !important;
      height: auto !important;
      min-height: 36px !important;
      padding: 6px 14px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix goal menu button (the ⋮ button) */
    .goal-menu-button {
      font-size: 18px !important;
      width: 32px !important;
      height: 32px !important;
      min-width: 32px !important;
      min-height: 32px !important;
      padding: 4px !important;
      line-height: 1 !important;
    }
    
    /* Fix goal display container */
    .goal-display {
      font-size: 14px !important;
      padding: 12px !important;
      line-height: 1.4 !important;
    }
    
    .goal-display h3 {
      font-size: 16px !important;
      margin-bottom: 8px !important;
    }
    
    .goal-display p {
      font-size: 14px !important;
      margin: 4px 0 !important;
    }
    
    /* Fix sidebar sections spacing */
    .sidebar-section {
      margin-bottom: 16px !important;
      padding: 12px !important;
    }
    
    .sidebar-section h2 {
      font-size: 15px !important;
      margin-bottom: 8px !important;
    }
    
    /* Fix bookshelf controls section */
    .bookshelf-controls {
      padding: 12px !important;
      gap: 8px !important;
    }
    
    .search-filter-section {
      gap: 8px !important;
    }
    
    /* Fix all generic buttons */
    button {
      font-size: 13px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix RPGUI buttons */
    .rpgui-button,
    .rpgui-button p {
      font-size: 13px !important;
      line-height: 1.4 !important;
    }
    
    .rpgui-button.golden,
    .rpgui-button.golden p {
      font-size: 13px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix input fields in general */
    input[type="text"],
    input[type="number"],
    input[type="email"],
    input[type="password"],
    input[type="date"] {
      font-size: 13px !important;
      height: 32px !important;
      padding: 6px 12px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix textareas */
    textarea {
      font-size: 13px !important;
      padding: 8px 12px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix labels */
    label {
      font-size: 13px !important;
      line-height: 1.4 !important;
      margin-bottom: 4px !important;
    }
    
    /* Fix select elements */
    select {
      font-size: 13px !important;
      height: 32px !important;
      padding: 4px 8px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix general paragraphs and text */
    p {
      font-size: 14px !important;
      line-height: 1.4 !important;
    }
    
    /* Fix headings */
    h1 {
      font-size: 20px !important;
      line-height: 1.3 !important;
    }
    
    h2 {
      font-size: 18px !important;
      line-height: 1.3 !important;
    }
    
    h3 {
      font-size: 16px !important;
      line-height: 1.3 !important;
    }
    
    h4 {
      font-size: 14px !important;
      line-height: 1.3 !important;
    }
    
    /* Fix book action buttons */
    .finish-book-button,
    .edit-book-button,
    .delete-book-button,
    .set-goal-button {
      font-size: 12px !important;
      height: auto !important;
      min-height: 28px !important;
      padding: 4px 10px !important;
      line-height: 1.4 !important;
    }
  `;
}

