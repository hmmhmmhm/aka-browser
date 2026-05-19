import type { IpcRenderer } from "electron";

export function installThemeColorMonitoring(ipcRenderer: IpcRenderer): void {
  const setup = () => {
    setupThemeColorMonitoring(ipcRenderer);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }

  window.addEventListener("load", () => {
    setTimeout(() => notifyThemeColor(ipcRenderer), 200);
  });
}

function extractThemeColor(): string | null {
  try {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const content = metaThemeColor?.getAttribute("content");
    if (content) return content;

    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent") {
      return bodyBg;
    }
    return null;
  } catch {
    return null;
  }
}

function notifyThemeColor(ipcRenderer: IpcRenderer): void {
  const themeColor = extractThemeColor();
  if (!themeColor) return;

  let domain = "";
  try {
    domain = window.location.hostname;
  } catch {
    domain = "";
  }

  ipcRenderer.send("webview-theme-color-extracted", {
    themeColor,
    domain,
  });
}

function setupThemeColorMonitoring(ipcRenderer: IpcRenderer): void {
  setTimeout(() => notifyThemeColor(ipcRenderer), 100);

  try {
    if (!document.head) return;

    const observer = new MutationObserver((mutations) => {
      const hasThemeColorChange = mutations.some((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.target.nodeName === "META"
        ) {
          return (mutation.target as HTMLMetaElement).name === "theme-color";
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

      if (hasThemeColorChange) notifyThemeColor(ipcRenderer);
    });

    observer.observe(document.head, {
      childList: true,
      subtree: false,
      attributes: true,
      attributeFilter: ["content"],
    });
  } catch {
    // Ignore pages that block observer setup.
  }
}
