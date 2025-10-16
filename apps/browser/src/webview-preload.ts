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
  // Check if already injected to avoid duplicates
  if (document.getElementById("webview-corner-mask")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "webview-corner-mask";
  style.textContent = `
    /* Bottom corner masks with inset curve to match device frame */
    body::before,
    body::after {
      content: '' !important;
      position: fixed !important;
      bottom: -1px !important;
      width: 48px !important;
      height: 48px !important;
      pointer-events: none !important;
      z-index: 2147483647 !important; /* Maximum z-index */
    }

    body::before {
      left: -1px !important;
      background:
        radial-gradient(circle at 44px 1px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
        radial-gradient(circle at 41px 0px, transparent 34px, #2b2c2c 30px) !important;
      background-position: -11px 14px !important;
      background-repeat: no-repeat !important;
    }

    body::after {
      right: -1px !important;
      background:
        radial-gradient(circle at 2px 1px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
        radial-gradient(circle at 0px 1px, transparent 40px, #2b2c2c 40px) !important;
      background-position: 13px 14px !important;
      background-repeat: no-repeat !important;
    }
  `;

  // Try to insert immediately if head exists
  if (document.head) {
    document.head.appendChild(style);
  } else if (document.documentElement) {
    // If head doesn't exist, insert directly into documentElement
    document.documentElement.appendChild(style);
  } else {
    // Last resort: wait for documentElement
    const observer = new MutationObserver(() => {
      if (document.documentElement) {
        if (document.head) {
          document.head.appendChild(style);
        } else {
          document.documentElement.appendChild(style);
        }
        observer.disconnect();
      }
    });
    observer.observe(document, {
      childList: true,
      subtree: true,
    });
  }
}

// Inject corner mask immediately - this runs synchronously as soon as preload loads
injectCornerMask();

// Wait for DOM to be ready for theme monitoring
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupThemeColorMonitoring();
    // Re-inject to ensure it's still there after DOM is ready
    injectCornerMask();
  });
} else {
  // DOM is already ready
  setupThemeColorMonitoring();
  // Re-inject to ensure it's still there
  injectCornerMask();
}

// Also check when page is fully loaded
window.addEventListener("load", () => {
  setTimeout(notifyThemeColor, 200);
  // Re-inject one more time to ensure persistence
  injectCornerMask();
});

// Status bar is now a React component in the main renderer
// This preload script handles theme color extraction and corner masking
