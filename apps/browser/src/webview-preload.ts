// Preload script for WebContentsView (embedded web content)
// This runs in the context of loaded web pages with limited privileges

import { ipcRenderer } from 'electron';

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
