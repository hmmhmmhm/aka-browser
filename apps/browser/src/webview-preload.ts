// Preload script for WebContentsView (embedded web content)
// This runs in the context of loaded web pages with limited privileges

import { ipcRenderer } from 'electron';

// Trusted Types API declarations
declare global {
  interface Window {
    trustedTypes?: {
      createPolicy: (name: string, policy: { createHTML: (input: string) => string }) => TrustedTypePolicy;
      defaultPolicy?: TrustedTypePolicy;
    };
  }
  interface TrustedTypePolicy {
    createHTML: (input: string) => TrustedHTML;
  }
  interface TrustedHTML {
    toString(): string;
  }
}

// Status bar state
let statusBarContainer: HTMLDivElement | null = null;
let currentOrientation: 'portrait' | 'landscape' = 'portrait';
let currentTime = '9:41';
let currentThemeColor = '#ffffff';
let currentTextColor = '#000000';

// Extract theme color safely when DOM is ready
function extractThemeColor(): string | null {
  try {
    // Check for meta theme-color tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const content = metaThemeColor.getAttribute('content');
      if (content) return content;
    }

    // Fallback to body background color
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') {
      return bodyBg;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Send theme color to main process when available
function notifyThemeColor() {
  const themeColor = extractThemeColor();
  if (themeColor) {
    ipcRenderer.send('webview-theme-color-extracted', themeColor);
  }
}

// Setup observer and notification when DOM is ready
function setupThemeColorMonitoring() {
  // Initial notification
  setTimeout(notifyThemeColor, 100);
  
  // Watch for meta tag changes (some sites update theme-color dynamically)
  try {
    if (document.documentElement) {
      const observer = new MutationObserver(() => {
        notifyThemeColor();
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['content'],
      });
    }
  } catch (error) {
    // Silently ignore if observer setup fails
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupThemeColorMonitoring);
} else {
  // DOM is already ready
  setupThemeColorMonitoring();
}

// Also check when page is fully loaded
window.addEventListener('load', () => {
  setTimeout(notifyThemeColor, 200);
});

// ============================================================================
// STATUS BAR INJECTION
// ============================================================================

// Create status bar HTML template
function createStatusBarHTML(orientation: 'portrait' | 'landscape'): string {
  const isLandscape = orientation === 'landscape';
  
  return `
    <style>
      :host {
        all: initial;
      }
      
      .status-bar-root {
        position: fixed;
        z-index: 2147483647;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        user-select: none;
        -webkit-user-select: none;
        ${isLandscape ? `
          top: 0;
          left: 0;
          bottom: 0;
          width: 58px;
          border-radius: 32px 0 0 32px;
        ` : `
          top: 0;
          left: 0;
          right: 0;
          height: 58px;
          border-radius: 32px 32px 0 0;
        `}
        transition: background-color 0.3s ease;
      }
      
      .status-bar-background {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--theme-color, #ffffff);
        ${isLandscape ? 'border-radius: 32px 0 0 32px;' : 'border-radius: 32px 32px 0 0;'}
      }
      
      .dynamic-island {
        position: absolute;
        background-color: #000000;
        z-index: 20;
        ${isLandscape ? `
          top: 50%;
          left: 11.5px;
          width: 35px;
          height: 120px;
          border-radius: 20px;
          transform: translateY(-50%);
        ` : `
          top: 11.5px;
          left: 50%;
          width: 120px;
          height: 35px;
          border-radius: 20px;
          transform: translateX(-50%);
        `}
      }
      
      .time-display {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: 590;
        letter-spacing: -0.3px;
        color: var(--text-color, #000000);
        z-index: 15;
        ${isLandscape ? `
          top: 0;
          left: 0;
          bottom: 0;
          width: 58px;
        ` : `
          top: 0;
          left: 0;
          right: 0;
          height: 58px;
        `}
      }
      
      .time-text {
        ${isLandscape ? `
          position: absolute;
          bottom: calc((50% - 60px) / 2 - 10px);
          left: 50%;
          transform: translateX(-50%) rotate(-90deg);
          transform-origin: center;
          white-space: nowrap;
        ` : `
          position: absolute;
          left: calc((50% - 60px) / 2 - 35px);
          top: 50%;
          transform: translateY(-50%);
        `}
      }
    </style>
    
    <div class="status-bar-root">
      <div class="status-bar-background"></div>
      <div class="dynamic-island"></div>
      <div class="time-display">
        <div class="time-text">${currentTime}</div>
      </div>
    </div>
  `;
}

// Helper function to safely set innerHTML with Trusted Types support
function safeSetInnerHTML(element: ShadowRoot, html: string) {
  try {
    // Check if Trusted Types is available and required
    if (typeof window.trustedTypes !== 'undefined' && window.trustedTypes.createPolicy) {
      // Create a policy for our status bar HTML
      let policy: TrustedTypePolicy;
      
      try {
        // Try to get existing policy or create new one
        policy = window.trustedTypes.createPolicy('electron-status-bar', {
          createHTML: (input: string) => input,
        });
      } catch (e) {
        // Policy might already exist, try to use default policy
        // If that fails, we'll fall back to direct assignment
        try {
          // @ts-ignore - defaultPolicy might exist
          policy = window.trustedTypes.defaultPolicy;
          if (!policy) throw new Error('No default policy');
        } catch {
          // Last resort: try direct assignment (will fail on strict sites)
          element.innerHTML = html;
          return;
        }
      }
      
      // Use the policy to create trusted HTML
      const trustedHTML = policy.createHTML(html);
      element.innerHTML = trustedHTML as any;
    } else {
      // No Trusted Types, use direct assignment
      element.innerHTML = html;
    }
  } catch (error) {
    // If all else fails, try to build DOM manually
    console.warn('[Status Bar] Failed to set innerHTML, building DOM manually:', error);
    buildStatusBarDOM(element);
  }
}

// Fallback: Build status bar DOM manually without innerHTML
function buildStatusBarDOM(shadow: ShadowRoot) {
  const isLandscape = currentOrientation === 'landscape';
  
  // Create style element
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
    }
    
    .status-bar-root {
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      ${isLandscape ? `
        top: 0;
        left: 0;
        bottom: 0;
        width: 58px;
        border-radius: 32px 0 0 32px;
      ` : `
        top: 0;
        left: 0;
        right: 0;
        height: 58px;
        border-radius: 32px 32px 0 0;
      `}
      transition: background-color 0.3s ease;
    }
    
    .status-bar-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--theme-color, #ffffff);
      ${isLandscape ? 'border-radius: 32px 0 0 32px;' : 'border-radius: 32px 32px 0 0;'}
    }
    
    .dynamic-island {
      position: absolute;
      background-color: #000000;
      z-index: 20;
      ${isLandscape ? `
        top: 50%;
        left: 11.5px;
        width: 35px;
        height: 120px;
        border-radius: 20px;
        transform: translateY(-50%);
      ` : `
        top: 11.5px;
        left: 50%;
        width: 120px;
        height: 35px;
        border-radius: 20px;
        transform: translateX(-50%);
      `}
    }
    
    .time-display {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 590;
      letter-spacing: -0.3px;
      color: var(--text-color, #000000);
      z-index: 15;
      ${isLandscape ? `
        top: 0;
        left: 0;
        bottom: 0;
        width: 58px;
      ` : `
        top: 0;
        left: 0;
        right: 0;
        height: 58px;
      `}
    }
    
    .time-text {
      ${isLandscape ? `
        position: absolute;
        bottom: calc((50% - 60px) / 2 - 10px);
        left: 50%;
        transform: translateX(-50%) rotate(-90deg);
        transform-origin: center;
        white-space: nowrap;
      ` : `
        position: absolute;
        left: calc((50% - 60px) / 2 - 10px);
        top: 50%;
        transform: translateY(-50%);
      `}
    }
  `;
  
  // Create root container
  const root = document.createElement('div');
  root.className = 'status-bar-root';
  root.style.setProperty('--theme-color', currentThemeColor);
  root.style.setProperty('--text-color', currentTextColor);
  
  // Create background
  const background = document.createElement('div');
  background.className = 'status-bar-background';
  
  // Create dynamic island
  const island = document.createElement('div');
  island.className = 'dynamic-island';
  
  // Create time display
  const timeDisplay = document.createElement('div');
  timeDisplay.className = 'time-display';
  
  const timeText = document.createElement('div');
  timeText.className = 'time-text';
  timeText.textContent = currentTime;
  
  timeDisplay.appendChild(timeText);
  
  // Assemble
  root.appendChild(background);
  root.appendChild(island);
  root.appendChild(timeDisplay);
  
  shadow.appendChild(style);
  shadow.appendChild(root);
}

// Inject status bar into the page
function injectStatusBar() {
  // Remove existing status bar if present
  removeStatusBar();
  
  // Create container
  statusBarContainer = document.createElement('div');
  statusBarContainer.id = 'electron-status-bar-container';
  statusBarContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 2147483646;
  `;
  
  // Create shadow DOM for isolation
  const shadow = statusBarContainer.attachShadow({ mode: 'closed' });
  
  // Try to set innerHTML with Trusted Types support
  safeSetInnerHTML(shadow, createStatusBarHTML(currentOrientation));
  
  // Set CSS variables for theme colors
  const root = shadow.querySelector('.status-bar-root') as HTMLElement;
  if (root) {
    root.style.setProperty('--theme-color', currentThemeColor);
    root.style.setProperty('--text-color', currentTextColor);
  }
  
  // Append to document
  if (document.body) {
    document.body.appendChild(statusBarContainer);
  } else if (document.documentElement) {
    document.documentElement.appendChild(statusBarContainer);
  }
}

// Remove status bar
function removeStatusBar() {
  if (statusBarContainer && statusBarContainer.parentNode) {
    statusBarContainer.parentNode.removeChild(statusBarContainer);
    statusBarContainer = null;
  }
}

// Update status bar theme colors
function updateStatusBarTheme(backgroundColor: string, textColor: string) {
  currentThemeColor = backgroundColor;
  currentTextColor = textColor;
  
  if (statusBarContainer && statusBarContainer.shadowRoot) {
    const root = statusBarContainer.shadowRoot.querySelector('.status-bar-root') as HTMLElement;
    if (root) {
      root.style.setProperty('--theme-color', backgroundColor);
      root.style.setProperty('--text-color', textColor);
    }
  }
}

// Update status bar time
function updateStatusBarTime(time: string) {
  currentTime = time;
  
  if (statusBarContainer && statusBarContainer.shadowRoot) {
    const timeText = statusBarContainer.shadowRoot.querySelector('.time-text');
    if (timeText) {
      timeText.textContent = time;
    }
  }
}

// Update status bar orientation
function updateStatusBarOrientation(orientation: 'portrait' | 'landscape') {
  currentOrientation = orientation;
  
  // Re-inject status bar with new orientation
  if (statusBarContainer) {
    injectStatusBar();
  }
  
  // Update safe area CSS
  injectSafeAreaCSS();
}

// Inject safe area CSS variables
function injectSafeAreaCSS() {
  // Calculate safe area insets based on orientation
  const topInset = currentOrientation === 'portrait' ? '58px' : '0px';
  const leftInset = currentOrientation === 'landscape' ? '58px' : '0px';
  const bottomInset = '0px';
  const rightInset = '0px';
  
  // Create or update style element
  let styleElement = document.getElementById('electron-safe-area-style') as HTMLStyleElement;
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'electron-safe-area-style';
    document.head.appendChild(styleElement);
  }
  
  // Simple approach: just add padding to body to avoid status bar overlap
  styleElement.textContent = `
    /* Prevent content from being hidden by status bar */
    body {
      padding-top: ${topInset} !important;
      padding-left: ${leftInset} !important;
    }
  `;
}

// Setup status bar when DOM is ready
function setupStatusBar() {
  // Wait a bit for the page to settle
  setTimeout(() => {
    injectStatusBar();
    injectSafeAreaCSS();
  }, 100);
  
  // Re-inject on navigation within the same page
  const observer = new MutationObserver((mutations) => {
    // Check if body was replaced or major DOM changes
    const hasBodyChange = mutations.some(mutation => 
      mutation.type === 'childList' && 
      (mutation.target === document.documentElement || mutation.target === document.body)
    );
    
    if (hasBodyChange && !statusBarContainer?.parentNode) {
      injectStatusBar();
    }
    
    // Re-inject safe area CSS if head was replaced
    const hasHeadChange = mutations.some(mutation =>
      Array.from(mutation.removedNodes).some(node => 
        node.nodeName === 'STYLE' && (node as HTMLElement).id === 'electron-safe-area-style'
      )
    );
    
    if (hasHeadChange) {
      injectSafeAreaCSS();
    }
  });
  
  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: false,
    });
  }
}

// Listen for IPC messages from main process
ipcRenderer.on('update-status-bar-theme', (_event, { backgroundColor, textColor }) => {
  updateStatusBarTheme(backgroundColor, textColor);
});

ipcRenderer.on('update-status-bar-time', (_event, time: string) => {
  updateStatusBarTime(time);
});

ipcRenderer.on('update-status-bar-orientation', (_event, orientation: 'portrait' | 'landscape') => {
  updateStatusBarOrientation(orientation);
});

// Initialize status bar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupStatusBar);
} else {
  setupStatusBar();
}

// Also setup on full page load
window.addEventListener('load', setupStatusBar);
