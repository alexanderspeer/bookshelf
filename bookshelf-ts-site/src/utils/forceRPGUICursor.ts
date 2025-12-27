// Simple, comprehensive cursor fix using inline styles
// Forces RPGUI cursor on ALL elements

export function forceRPGUICursor() {
  const cursorBasePath = '/rpgui/img/cursor';
  
  const applyCursors = () => {
    // Get ALL elements
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      
      // Check if it's an interactive element (button, link, etc.)
      const isInteractive = 
        element.tagName === 'BUTTON' ||
        element.tagName === 'A' ||
        element.tagName === 'SELECT' ||
        element.getAttribute('onclick') !== null ||
        element.getAttribute('role') === 'button' ||
        htmlElement.style.cursor === 'pointer' ||
        window.getComputedStyle(element).cursor === 'pointer';
      
      // Check if it's a text input
      const isTextInput =
        element.tagName === 'INPUT' &&
        (['text', 'number', 'email', 'password', 'date', 'search'].includes(
          (element as HTMLInputElement).type
        )) ||
        element.tagName === 'TEXTAREA';
      
      // Apply appropriate cursor
      if (isTextInput) {
        htmlElement.style.cursor = `url("${cursorBasePath}/select.png") 10 0, text`;
      } else if (isInteractive) {
        htmlElement.style.cursor = `url("${cursorBasePath}/point.png") 10 0, pointer`;
      } else {
        htmlElement.style.cursor = `url("${cursorBasePath}/default.png"), auto`;
      }
    });
  };
  
  // Apply immediately
  applyCursors();
  
  // Reapply after delays
  setTimeout(applyCursors, 100);
  setTimeout(applyCursors, 500);
  setTimeout(applyCursors, 1000);
  
  // Watch for DOM changes
  const observer = new MutationObserver(applyCursors);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  console.log('RPGUI cursor applied to all elements');
}

