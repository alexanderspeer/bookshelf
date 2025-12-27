// RPGUI Cursor Fix for Production
// Injects cursor styles dynamically to avoid webpack path resolution issues

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
  
  // Inject cursor CSS with correct paths
  styleElement.textContent = `
    /* Default cursor - apply globally */
    body,
    html {
      cursor: url("${cursorBasePath}/default.png"), auto !important;
    }
    
    .rpgui-cursor-default,
    .rpgui-content,
    .rpgui-content *,
    label {
      cursor: url("${cursorBasePath}/default.png"), auto !important;
    }
    
    /* Pointer cursor for interactive elements */
    .rpgui-cursor-point,
    .rpgui-cursor-point *,
    .rpgui-content a,
    .rpgui-content button,
    .rpgui-button,
    .rpgui-slider-container,
    .rpgui-content input[type=radio].rpgui-radio + label,
    .rpgui-list-imp,
    .rpgui-dropdown-imp,
    .rpgui-content input[type=checkbox].rpgui-checkbox + label,
    a,
    button,
    [role="button"],
    [onclick],
    input[type="button"],
    input[type="submit"],
    input[type="reset"],
    select,
    .rpgui-content *[style*="cursor: pointer"] {
      cursor: url("${cursorBasePath}/point.png") 10 0, auto !important;
    }
    
    /* Text selection cursor */
    .rpgui-cursor-select,
    .rpgui-cursor-select *,
    .rpgui-content input,
    .rpgui-content textarea,
    input[type="text"],
    input[type="number"],
    input[type="email"],
    input[type="password"],
    textarea {
      cursor: url("${cursorBasePath}/select.png") 10 0, auto !important;
    }
    
    /* Grab cursors */
    .rpgui-cursor-grab-open,
    .rpgui-cursor-grab-open * {
      cursor: url("${cursorBasePath}/grab-open.png") 10 0, auto !important;
    }
    
    .rpgui-cursor-grab-close,
    .rpgui-cursor-grab-close * {
      cursor: url("${cursorBasePath}/grab-close.png") 10 0, auto !important;
    }
    
    /* Disabled elements */
    .rpgui-disabled,
    .rpgui-content :disabled,
    .rpgui-content input[type=radio]:disabled + label,
    .rpgui-content input[type=checkbox]:disabled + label,
    .rpgui-content input[type=range]:disabled + .rpgui-slider-container,
    .rpgui-content :disabled + .rpgui-dropdown-imp,
    .rpgui-content :disabled + .rpgui-dropdown-imp + .rpgui-dropdown-imp,
    .rpgui-content :disabled + .rpgui-list-imp {
      cursor: url("${cursorBasePath}/default.png"), auto !important;
    }
  `;
}

