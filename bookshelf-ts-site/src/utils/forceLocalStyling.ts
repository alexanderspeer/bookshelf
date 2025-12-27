// Force Local Styling - Aggressive approach to match production to local
// This directly manipulates elements to override any CSS specificity issues

export function forceLocalStyling() {
  console.log('Forcing local styling on all elements...');
  
  // Run immediately and on DOM changes
  const applyStyles = () => {
    // Force all buttons to exact local sizes
    const buttons = document.querySelectorAll<HTMLElement>(
      'button, .rpgui-button, .primary-button, .secondary-button, ' +
      '.set-goal-button, .finish-book-button, .edit-book-button, ' +
      '.delete-book-button, .reset-color-button, .reset-font-button, ' +
      '.add-tag-button, .theme-button'
    );
    
    buttons.forEach((button) => {
      // Skip if it's a special small button
      if (button.classList.contains('goal-menu-button') || 
          button.classList.contains('modal-close')) {
        button.style.fontSize = '16px';
        button.style.minWidth = '40px';
        button.style.minHeight = '40px';
        button.style.maxHeight = '40px';
        button.style.height = '40px';
        button.style.padding = '8px';
        button.style.lineHeight = '1';
      } else if (button.classList.contains('theme-button')) {
        button.style.fontSize = '16px';
        button.style.height = '40px';
        button.style.minHeight = '40px';
        button.style.maxHeight = '40px';
        button.style.padding = '8px';
        button.style.lineHeight = '1';
      } else {
        // Regular buttons
        button.style.fontSize = '12.8px';
        button.style.minHeight = '50px';
        button.style.maxHeight = '50px';
        button.style.height = '50px';
        button.style.padding = '10px 25px';
        button.style.lineHeight = '1.5';
        button.style.boxSizing = 'border-box';
      }
    });
    
    // Force all inputs and selects
    const inputs = document.querySelectorAll<HTMLElement>(
      'input[type="text"], input[type="number"], input[type="email"], ' +
      'input[type="password"], input[type="date"], input[type="search"], ' +
      'textarea, select, .search-input, .filter-select'
    );
    
    inputs.forEach((input) => {
      input.style.fontSize = '12.8px';
      input.style.height = '40px';
      input.style.minHeight = '40px';
      input.style.maxHeight = '40px';
      input.style.lineHeight = '32px';
      input.style.boxSizing = 'border-box';
    });
    
    // Force all labels and paragraphs in rpgui-content
    const textElements = document.querySelectorAll<HTMLElement>(
      '.rpgui-content p, .rpgui-content label'
    );
    
    textElements.forEach((elem) => {
      elem.style.fontSize = '12.8px';
      elem.style.lineHeight = '1.8';
    });
    
    // Force goal-display elements
    const goalDisplays = document.querySelectorAll<HTMLElement>('.goal-display');
    goalDisplays.forEach((elem) => {
      elem.style.fontSize = '16px';
    });
    
    const goalNumbers = document.querySelectorAll<HTMLElement>('.goal-numbers');
    goalNumbers.forEach((elem) => {
      elem.style.fontSize = '24px';
    });
    
    // Force headings
    const h1s = document.querySelectorAll<HTMLElement>('.rpgui-content h1');
    h1s.forEach((elem) => { elem.style.fontSize = '19.2px'; });
    
    const h2s = document.querySelectorAll<HTMLElement>('.rpgui-content h2');
    h2s.forEach((elem) => { elem.style.fontSize = '17.6px'; });
    
    const h3s = document.querySelectorAll<HTMLElement>('.rpgui-content h3');
    h3s.forEach((elem) => { elem.style.fontSize = '16px'; });
    
    const h4s = document.querySelectorAll<HTMLElement>('.rpgui-content h4');
    h4s.forEach((elem) => { elem.style.fontSize = '14.4px'; });
    
    // Force tag buttons
    const tagButtons = document.querySelectorAll<HTMLElement>('.tag-button');
    tagButtons.forEach((elem) => {
      elem.style.fontSize = '11.2px';
    });
  };
  
  // Apply immediately
  applyStyles();
  
  // Apply after a short delay (after React hydration)
  setTimeout(applyStyles, 100);
  setTimeout(applyStyles, 500);
  setTimeout(applyStyles, 1000);
  
  // Set up MutationObserver to reapply on DOM changes
  const observer = new MutationObserver(() => {
    applyStyles();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('Local styling enforcement active');
}

