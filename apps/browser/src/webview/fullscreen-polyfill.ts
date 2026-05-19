import type { IpcRenderer } from "electron";

let isFullscreenActive = false;
let fullscreenElement: Element | null = null;
let videoObserver: MutationObserver | null = null;

export function installFullscreenPolyfill(ipcRenderer: IpcRenderer): void {
  ipcRenderer.on("set-fullscreen-state", (_event, state: boolean) => {
    const wasFullscreen = isFullscreenActive;
    isFullscreenActive = state;

    if (state && !wasFullscreen) {
      fullscreenElement = document.documentElement;
      applyVideoFitStyle("contain");
      dispatchFullscreenEvents();
    } else if (!state && wasFullscreen) {
      fullscreenElement = null;
      applyVideoFitStyle("");
      dispatchFullscreenEvents();
    }
  });

  Object.defineProperty(Document.prototype, "fullscreenElement", {
    get: () => fullscreenElement,
    configurable: true,
  });
  Object.defineProperty(Document.prototype, "webkitFullscreenElement", {
    get: () => fullscreenElement,
    configurable: true,
  });

  overrideScreenDimensions();
}

function applyVideoFitStyle(fitValue: string): void {
  document.querySelectorAll("video").forEach((video) => {
    video.style.objectFit = fitValue;
  });

  if (fitValue === "contain") {
    startVideoObserver();
  } else {
    stopVideoObserver();
  }
}

function startVideoObserver(): void {
  if (videoObserver) return;

  videoObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLVideoElement) {
          node.style.objectFit = "contain";
        } else if (node instanceof Element) {
          node.querySelectorAll("video").forEach((video) => {
            video.style.objectFit = "contain";
          });
        }
      });
    });
  });

  videoObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function stopVideoObserver(): void {
  if (!videoObserver) return;
  videoObserver.disconnect();
  videoObserver = null;
}

function dispatchFullscreenEvents(): void {
  window.dispatchEvent(new Event("resize"));
  document.dispatchEvent(new Event("fullscreenchange", { bubbles: true }));
}

function overrideScreenDimensions(): void {
  const originalScreenWidth = window.screen.width;
  const originalScreenHeight = window.screen.height;
  const readWidth = () =>
    isFullscreenActive ? window.innerWidth : originalScreenWidth;
  const readHeight = () =>
    isFullscreenActive ? window.innerHeight : originalScreenHeight;

  Object.defineProperty(window.screen, "width", {
    get: readWidth,
    configurable: true,
  });
  Object.defineProperty(window.screen, "height", {
    get: readHeight,
    configurable: true,
  });
  Object.defineProperty(window.screen, "availWidth", {
    get: readWidth,
    configurable: true,
  });
  Object.defineProperty(window.screen, "availHeight", {
    get: readHeight,
    configurable: true,
  });
}
