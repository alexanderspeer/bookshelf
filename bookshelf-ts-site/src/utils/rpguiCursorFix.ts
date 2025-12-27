// RPGUI Cursor Fix for Production and Local
// Injects cursor styles dynamically to avoid webpack path resolution issues
// Applies custom cursor to ALL elements across the entire site

export function applyRPGUICursorFixes() {
  // Base path for RPGUI cursor images (served from public folder)
  const cursorBasePath = '/rpgui/img/cursor';
  
  // Create style element with cursor rules
  const styleId = 'rpgui-cursor-fixes';
  let styleElement = document.getElementById(styleId);
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  // Inject comprehensive cursor CSS with correct paths
  styleElement.textContent = `
    /* GLOBAL DEFAULT CURSOR - apply to everything */
    *,
    *::before,
    *::after,
    html,
    body,
    #root,
    .app,
    .rpgui-content,
    .home-container,
    .home-sidebar,
    .home-main,
    .bookshelf-display,
    .bookshelf-controls,
    .sidebar-section,
    .goal-display,
    .search-filter-section,
    div,
    span,
    p,
    h1, h2, h3, h4, h5, h6,
    label,
    img,
    canvas,
    svg {
      cursor: url("${cursorBasePath}/default.png"), auto !important;
    }
    
    /* POINTER CURSOR for ALL interactive elements */
    a,
    a *,
    button,
    button *,
    select,
    select *,
    input[type="button"],
    input[type="submit"],
    input[type="reset"],
    input[type="checkbox"],
    input[type="radio"],
    [role="button"],
    [role="button"] *,
    [onclick],
    [onclick] *,
    .clickable,
    .clickable *,
    .rpgui-button,
    .rpgui-button *,
    .primary-button,
    .primary-button *,
    .secondary-button,
    .secondary-button *,
    .theme-button,
    .theme-button *,
    .goal-menu-button,
    .goal-menu-button *,
    .set-goal-button,
    .set-goal-button *,
    .finish-book-button,
    .finish-book-button *,
    .edit-book-button,
    .edit-book-button *,
    .delete-book-button,
    .delete-book-button *,
    .add-tag-button,
    .add-tag-button *,
    .reset-color-button,
    .reset-color-button *,
    .reset-font-button,
    .reset-font-button *,
    .modal-close,
    .modal-close *,
    .rpgui-slider-container,
    .rpgui-slider-container *,
    .rpgui-list-imp,
    .rpgui-list-imp *,
    .rpgui-dropdown-imp,
    .rpgui-dropdown-imp *,
    .rpgui-content a,
    .rpgui-content a *,
    .rpgui-content button,
    .rpgui-content button *,
    .rpgui-content input[type=radio].rpgui-radio + label,
    .rpgui-content input[type=checkbox].rpgui-checkbox + label,
    .filter-select,
    .filter-select *,
    option,
    .book-card,
    .book-card *,
    .tag-button,
    .tag-button *,
    .shelf-book-item,
    .shelf-book-item *,
    [data-cursor-element-id],
    [data-cursor-element-id] * {
      cursor: url("${cursorBasePath}/point.png") 10 0, pointer !important;
    }
    
    /* TEXT SELECTION CURSOR for text input fields */
    input[type="text"],
    input[type="number"],
    input[type="email"],
    input[type="password"],
    input[type="date"],
    input[type="search"],
    textarea,
    .search-input,
    .rpgui-content input[type="text"],
    .rpgui-content input[type="number"],
    .rpgui-content input[type="email"],
    .rpgui-content input[type="password"],
    .rpgui-content textarea,
    [contenteditable="true"] {
      cursor: url("${cursorBasePath}/select.png") 10 0, text !important;
    }
    
    /* GRAB CURSORS for draggable elements */
    .draggable,
    .draggable *,
    [draggable="true"],
    [draggable="true"] *,
    .rpgui-cursor-grab-open,
    .rpgui-cursor-grab-open * {
      cursor: url("${cursorBasePath}/grab-open.png") 10 0, grab !important;
    }
    
    .dragging,
    .dragging *,
    .rpgui-cursor-grab-close,
    .rpgui-cursor-grab-close * {
      cursor: url("${cursorBasePath}/grab-close.png") 10 0, grabbing !important;
    }
    
    /* DISABLED ELEMENTS - back to default cursor */
    :disabled,
    :disabled *,
    .disabled,
    .disabled *,
    .rpgui-disabled,
    .rpgui-disabled *,
    .rpgui-content :disabled,
    .rpgui-content :disabled *,
    .rpgui-content input[type=radio]:disabled + label,
    .rpgui-content input[type=checkbox]:disabled + label,
    .rpgui-content input[type=range]:disabled + .rpgui-slider-container,
    .rpgui-content :disabled + .rpgui-dropdown-imp,
    .rpgui-content :disabled + .rpgui-dropdown-imp + .rpgui-dropdown-imp,
    .rpgui-content :disabled + .rpgui-list-imp {
      cursor: url("${cursorBasePath}/default.png"), not-allowed !important;
    }
  `;
  
  // Also set up a MutationObserver to handle dynamically added elements with inline styles
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          const element = node as HTMLElement;
          
          // Mark all elements with a data attribute for tracking
          if (!element.hasAttribute('data-cursor-element-id')) {
            element.setAttribute('data-cursor-element-id', `cursor-el-${Date.now()}-${Math.random()}`);
          }
          
          // Also mark all child elements
          const children = element.querySelectorAll('*');
          children.forEach((child, index) => {
            if (!child.hasAttribute('data-cursor-element-id')) {
              child.setAttribute('data-cursor-element-id', `cursor-el-${Date.now()}-${index}`);
            }
          });
        }
      });
    });
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also mark existing elements on initial load
  setTimeout(() => {
    const allElements = document.querySelectorAll('*');
    allElements.forEach((element, index) => {
      if (!element.hasAttribute('data-cursor-element-id')) {
        element.setAttribute('data-cursor-element-id', `cursor-el-${index}`);
      }
    });
  }, 100);
  
  console.log('RPGUI cursor styles applied globally with dynamic element tracking');
}

