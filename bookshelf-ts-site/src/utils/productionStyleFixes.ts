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
  
  // Apply styles with a slight delay to ensure all CSS has loaded
  const applyStyles = () => {
    // Create or update style element
    const styleId = 'production-style-fixes';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      // Add to end of head to ensure it overrides other styles
      document.head.appendChild(styleElement);
    }
  
  // Inject production-specific CSS fixes
  // These match the local sizes exactly using pixel values for consistency
  styleElement.textContent = `
    /* Production-only fixes - match local sizing exactly */
    
    /* Normalize base font size to ensure consistent em calculations */
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
    
    /* Fix button sizing to match local - use pixel values for consistency */
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
    .rpgui-content .add-tag-button {
      font-size: 12.8px !important; /* 0.8em of 16px */
      line-height: 1.5 !important;
      padding: 10px 25px !important;
      min-height: 50px !important;
    }
    
    /* Goal menu button specific fix - matches localhost */
    .goal-menu-button {
      min-width: 40px !important;
      min-height: 40px !important;
      padding: 8px !important;
      font-size: 16px !important; /* 1em of 16px */
      line-height: 1 !important;
    }
    
    /* Fix input and select sizing - use pixel values */
    .rpgui-content input[type="text"],
    .rpgui-content input[type="number"],
    .rpgui-content input[type="email"],
    .rpgui-content input[type="password"],
    input[type="text"].search-input,
    input.search-input,
    .search-input,
    select.filter-select,
    .filter-select,
    .rpgui-content select,
    .rpgui-content textarea,
    .form-group input,
    .form-group select {
      font-size: 12.8px !important; /* 0.8em of 16px */
      line-height: 32px !important;
      min-height: 40px !important;
      padding: 8px 10px !important;
      height: 40px !important;
    }
    
    /* Fix stat items */
    .rpgui-content .stat-item,
    .stat-item {
      font-size: 12.8px !important; /* 0.8em of 16px */
      min-height: 40px !important;
      padding: 12px !important;
    }
    
    .rpgui-content .stat-item-clickable,
    .stat-item.stat-item-clickable,
    .stat-item-clickable {
      font-size: 12.8px !important;
      min-height: 47px !important;
      height: 47px !important;
    }
    
    /* Goal numbers */
    .goal-numbers {
      font-size: 24px !important; /* 1.5em of 16px */
    }
    
    .goal-current {
      font-size: 40px !important; /* 2.5em of 16px */
    }
    
    .goal-target {
      font-size: 32px !important; /* 2em of 16px */
    }
    
    .goal-separator {
      font-size: 28.8px !important; /* 1.8em of 16px */
    }
    
    /* Fix label and text sizing */
    .rpgui-content label,
    .rpgui-content p,
    .rpgui-content span {
      font-size: 12.8px !important; /* 0.8em of 16px */
      line-height: 1.8 !important;
    }
    
    /* Fix heading sizes */
    .rpgui-content h1 {
      font-size: 19.2px !important; /* 1.2em of 16px */
    }
    
    .rpgui-content h2 {
      font-size: 17.6px !important; /* 1.1em of 16px */
    }
    
    .rpgui-content h3 {
      font-size: 16px !important; /* 1.0em of 16px */
    }
    
    .rpgui-content h4 {
      font-size: 14.4px !important; /* 0.9em of 16px */
    }
    
    /* Ensure RPGUI button text matches */
    .rpgui-button p,
    .rpgui-button.golden p {
      font-size: 12.8px !important; /* 0.8em of 16px */
    }
    
    /* Tag buttons */
    .tag-button {
      font-size: 11.2px !important; /* 0.7em of 16px */
      min-height: 35px !important;
      padding: 8px 15px !important;
    }
  `;
  };
  
  // Apply immediately
  applyStyles();
  
  // Also apply after a short delay to ensure all CSS has loaded
  setTimeout(applyStyles, 100);
  
  // Apply again after DOM is fully ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStyles);
  }
}

