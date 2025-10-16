// Preload script for WebContentsView (embedded web content)
// This runs in the context of loaded web pages with limited privileges

import { ipcRenderer } from "electron";

// Extract theme color safely when DOM is ready
function extractThemeColor(): string | null {
  try {
    // Check for meta theme-color tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const content = metaThemeColor.getAttribute("content");
      if (content) return content;
    }

    // Fallback to body background color
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent") {
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
    ipcRenderer.send("webview-theme-color-extracted", themeColor);
  }
}

// Setup observer and notification when DOM is ready
function setupThemeColorMonitoring() {
  // Initial notification
  setTimeout(notifyThemeColor, 100);

  // Watch for meta tag changes (some sites update theme-color dynamically)
  // Only observe <head> to avoid excessive body re-renders
  try {
    if (document.head) {
      const observer = new MutationObserver((mutations) => {
        // Only notify if meta tag with name="theme-color" was actually changed
        const hasThemeColorChange = mutations.some((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.target.nodeName === "META"
          ) {
            const meta = mutation.target as HTMLMetaElement;
            return meta.name === "theme-color";
          }
          if (mutation.type === "childList") {
            return Array.from(mutation.addedNodes).some(
              (node) =>
                node.nodeName === "META" &&
                (node as HTMLMetaElement).name === "theme-color"
            );
          }
          return false;
        });

        if (hasThemeColorChange) {
          notifyThemeColor();
        }
      });

      // Only observe <head>, not the entire document
      observer.observe(document.head, {
        childList: true,
        subtree: false,
        attributes: true,
        attributeFilter: ["content"],
      });
    }
  } catch (error) {
    // Silently ignore if observer setup fails
  }
}

// Inject CSS to mask bottom corners (concave/inset curve)
function injectCornerMask() {
  const style = document.createElement("style");
  style.id = "webview-corner-mask";
  style.textContent = `
    /* Bottom corner masks with inset curve to match device frame */
    body::before,
    body::after {
      content: '';
      position: fixed;
      bottom: -1px;
      width: 48px;
      height: 48px;
      pointer-events: none;
      z-index: 2147483647; /* Maximum z-index */
    }

    body::before {
      left: -1px;
      background:
        radial-gradient(circle at 44px 1px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
        radial-gradient(circle at 41px 0px, transparent 34px, #2b2c2c 30px);
      background-position: -11px 14px;
      background-repeat: no-repeat;
    }

    body::after {
      right: -1px;
      background:
        radial-gradient(circle at 2px 1px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
        radial-gradient(circle at 0px 1px, transparent 40px, #2b2c2c 40px);
      background-position: 13px 14px;
      background-repeat: no-repeat;
    }
  `;

  // Insert at the end of head to ensure it has high priority
  if (document.head) {
    document.head.appendChild(style);
  } else {
    // If head doesn't exist yet, wait for it
    const observer = new MutationObserver(() => {
      if (document.head) {
        document.head.appendChild(style);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupThemeColorMonitoring();
    injectCornerMask();
  });
} else {
  // DOM is already ready
  setupThemeColorMonitoring();
  injectCornerMask();
}

// Also check when page is fully loaded
window.addEventListener("load", () => {
  setTimeout(notifyThemeColor, 200);
});

// Status bar is now a React component in the main renderer
// This preload script handles theme color extraction and corner masking
