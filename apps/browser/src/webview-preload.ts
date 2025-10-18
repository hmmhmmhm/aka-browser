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
    // Extract domain from current URL
    let domain = "";
    try {
      domain = window.location.hostname;
    } catch (error) {
      // Fallback if hostname is not accessible
      domain = "";
    }

    ipcRenderer.send("webview-theme-color-extracted", {
      themeColor,
      domain,
    });
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

// Track current orientation
let currentOrientation: "portrait" | "landscape" = "portrait";

// Shadow DOM container reference for cleanup
let shadowContainer: HTMLElement | null = null;

// MutationObserver reference for cleanup
let maskProtectionObserver: MutationObserver | null = null;

// Inject corner masks using Shadow DOM for complete style isolation
function injectCornerMask() {
  // Disconnect existing observer
  if (maskProtectionObserver) {
    maskProtectionObserver.disconnect();
    maskProtectionObserver = null;
  }

  // Remove existing container if present (check both body and html)
  const existingContainers = document.querySelectorAll("#webview-corner-mask-container");
  existingContainers.forEach(container => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });
  
  shadowContainer = null;

  // Create container element
  const container = document.createElement("div");
  container.id = "webview-corner-mask-container";
  container.setAttribute("data-webview-mask", "true");
  
  // Container styles (applied to light DOM)
  container.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    z-index: 2147483647 !important;
    overflow: hidden !important;
  `;

  // Create Shadow DOM for complete style isolation
  const shadow = container.attachShadow({ mode: "closed" });

  // Create style element inside Shadow DOM
  const style = document.createElement("style");
  
  if (currentOrientation === "portrait") {
    // Portrait mode: bottom-left and bottom-right corners
    style.textContent = `
      :host {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .corner-mask {
        position: absolute;
        width: 48px;
        height: 48px;
        pointer-events: none;
      }

      .corner-mask-bottom-left {
        bottom: -1px;
        left: -1px;
        background:
          radial-gradient(circle at 44px 1px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
          radial-gradient(circle at 41px 0px, transparent 34px, #2b2c2c 30px);
        background-position: -11px 14px;
        background-repeat: no-repeat;
      }

      .corner-mask-bottom-right {
        bottom: -1px;
        right: -1px;
        background:
          radial-gradient(circle at 2px 1px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
          radial-gradient(circle at 0px 1px, transparent 40px, #2b2c2c 40px);
        background-position: 13px 14px;
        background-repeat: no-repeat;
      }
    `;

    // Create mask elements
    const maskLeft = document.createElement("div");
    maskLeft.className = "corner-mask corner-mask-bottom-left";
    
    const maskRight = document.createElement("div");
    maskRight.className = "corner-mask corner-mask-bottom-right";

    shadow.appendChild(style);
    shadow.appendChild(maskLeft);
    shadow.appendChild(maskRight);
  } else {
    // Landscape mode: top-right and bottom-right corners
    style.textContent = `
      :host {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .corner-mask {
        position: absolute;
        width: 48px;
        height: 48px;
        pointer-events: none;
      }

      .corner-mask-top-right {
        top: -1px;
        right: -1px;
        background:
          radial-gradient(circle at 2px 44px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
          radial-gradient(circle at 0px 47px, transparent 34px, #2b2c2c 30px);
        background-position: 13px -11px;
        background-repeat: no-repeat;
      }

      .corner-mask-bottom-right {
        bottom: -1px;
        right: -1px;
        background:
          radial-gradient(circle at 2px 1px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
          radial-gradient(circle at 0px 1px, transparent 40px, #2b2c2c 40px);
        background-position: 13px 14px;
        background-repeat: no-repeat;
      }
    `;

    // Create mask elements
    const maskTopRight = document.createElement("div");
    maskTopRight.className = "corner-mask corner-mask-top-right";
    
    const maskBottomRight = document.createElement("div");
    maskBottomRight.className = "corner-mask corner-mask-bottom-right";

    shadow.appendChild(style);
    shadow.appendChild(maskTopRight);
    shadow.appendChild(maskBottomRight);
  }

  // Store reference for cleanup
  shadowContainer = container;

  // Insert into DOM
  const insertContainer = () => {
    if (document.body) {
      document.body.appendChild(container);
    } else if (document.documentElement) {
      document.documentElement.appendChild(container);
    } else {
      // Wait for document to be ready
      const observer = new MutationObserver(() => {
        if (document.body) {
          document.body.appendChild(container);
          observer.disconnect();
        } else if (document.documentElement) {
          document.documentElement.appendChild(container);
          observer.disconnect();
        }
      });
      observer.observe(document, {
        childList: true,
        subtree: true,
      });
    }
  };

  insertContainer();

  // Setup MutationObserver to restore if removed by page scripts
  setupMaskProtection();
}

// Protect corner mask from being removed by page scripts
function setupMaskProtection() {
  // Don't create duplicate observers
  if (maskProtectionObserver) {
    maskProtectionObserver.disconnect();
  }

  // Debounce restoration to avoid infinite loops
  let restorationTimeout: NodeJS.Timeout | null = null;
  
  maskProtectionObserver = new MutationObserver((mutations) => {
    // Check if our container was removed
    const containerExists = document.getElementById("webview-corner-mask-container");
    
    if (!containerExists && shadowContainer) {
      // Container was removed, schedule restoration
      if (restorationTimeout) {
        clearTimeout(restorationTimeout);
      }
      
      restorationTimeout = setTimeout(() => {
        // Re-inject if still missing
        if (!document.getElementById("webview-corner-mask-container")) {
          injectCornerMask();
        }
      }, 100);
    }
  });

  // Observe both body and documentElement for removals
  if (document.body) {
    maskProtectionObserver.observe(document.body, {
      childList: true,
      subtree: false, // Only watch direct children
    });
  }
  if (document.documentElement) {
    maskProtectionObserver.observe(document.documentElement, {
      childList: true,
      subtree: false, // Only watch direct children
    });
  }
}

// Listen for orientation changes from main process
ipcRenderer.on("orientation-changed", (_event, orientation: "portrait" | "landscape") => {
  currentOrientation = orientation;
  injectCornerMask();
});

// Request initial orientation from main process
ipcRenderer.invoke("get-orientation").then((orientation: "portrait" | "landscape") => {
  currentOrientation = orientation;
  injectCornerMask();
}).catch(() => {
  // Fallback to portrait if request fails
  injectCornerMask();
});

// Inject corner mask immediately with default orientation
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

// Trackpad gesture detection for navigation
function setupNavigationGestures() {
  let isGesturing = false;
  let gestureStartX = 0;
  let gestureStartY = 0;
  let accumulatedDeltaX = 0;
  let accumulatedDeltaY = 0;
  const GESTURE_THRESHOLD = 100; // Pixels to trigger navigation
  const VERTICAL_TOLERANCE = 50; // Allow some vertical movement

  window.addEventListener(
    "wheel",
    (event: WheelEvent) => {
      // Only handle horizontal gestures on macOS trackpad
      // Trackpad gestures have ctrlKey set to false and are smooth
      if (Math.abs(event.deltaX) < 1) return;

      // Detect start of gesture (large initial delta)
      if (!isGesturing && Math.abs(event.deltaX) > 4) {
        isGesturing = true;
        gestureStartX = event.pageX;
        gestureStartY = event.pageY;
        accumulatedDeltaX = 0;
        accumulatedDeltaY = 0;
      }

      if (isGesturing) {
        accumulatedDeltaX += event.deltaX;
        accumulatedDeltaY += Math.abs(event.deltaY);

        // Check if gesture is primarily horizontal
        if (accumulatedDeltaY > VERTICAL_TOLERANCE) {
          // Too much vertical movement, cancel gesture
          isGesturing = false;
          return;
        }

        // Swipe right (negative deltaX) = go back
        if (accumulatedDeltaX < -GESTURE_THRESHOLD) {
          event.preventDefault();
          ipcRenderer.send("webview-navigate-back");
          isGesturing = false;
          accumulatedDeltaX = 0;
          accumulatedDeltaY = 0;
        }
        // Swipe left (positive deltaX) = go forward
        else if (accumulatedDeltaX > GESTURE_THRESHOLD) {
          event.preventDefault();
          ipcRenderer.send("webview-navigate-forward");
          isGesturing = false;
          accumulatedDeltaX = 0;
          accumulatedDeltaY = 0;
        }
      }
    },
    { passive: false }
  );

  // Reset gesture state when wheel event stops
  let gestureTimeout: NodeJS.Timeout | null = null;
  window.addEventListener("wheel", () => {
    if (gestureTimeout) clearTimeout(gestureTimeout);
    gestureTimeout = setTimeout(() => {
      isGesturing = false;
      accumulatedDeltaX = 0;
      accumulatedDeltaY = 0;
    }, 100);
  });
}

// Setup gesture detection immediately
setupNavigationGestures();
