import type { IpcRenderer } from "electron";

let currentOrientation: "portrait" | "landscape" = "portrait";
let shadowContainer: HTMLElement | null = null;
let maskProtectionObserver: MutationObserver | null = null;

export function installCornerMask(ipcRenderer: IpcRenderer): void {
  ipcRenderer.on(
    "orientation-changed",
    (_event, orientation: "portrait" | "landscape") => {
      currentOrientation = orientation;
      injectCornerMask();
    }
  );

  ipcRenderer
    .invoke("get-orientation")
    .then((orientation: "portrait" | "landscape") => {
      currentOrientation = orientation;
      injectCornerMask();
    })
    .catch(injectCornerMask);

  injectCornerMask();

  const reinject = () => injectCornerMask();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reinject);
  } else {
    reinject();
  }
  window.addEventListener("load", reinject);
}

function injectCornerMask(): void {
  maskProtectionObserver?.disconnect();
  maskProtectionObserver = null;

  document
    .querySelectorAll("#webview-corner-mask-container")
    .forEach((container) => container.parentNode?.removeChild(container));

  const container = document.createElement("div");
  container.id = "webview-corner-mask-container";
  container.setAttribute("data-webview-mask", "true");
  container.style.cssText = [
    "position: fixed !important",
    "top: 0 !important",
    "left: 0 !important",
    "width: 100% !important",
    "height: 100% !important",
    "pointer-events: none !important",
    "z-index: 2147483647 !important",
    "overflow: hidden !important",
  ].join(";");

  const shadow = container.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent =
    currentOrientation === "portrait"
      ? portraitMaskStyles()
      : landscapeMaskStyles();
  shadow.appendChild(style);
  createMaskElements(shadow);
  shadowContainer = container;
  insertContainer(container);
  setupMaskProtection();
}

function createMaskElements(shadow: ShadowRoot): void {
  const classes =
    currentOrientation === "portrait"
      ? ["bottom-left", "bottom-right"]
      : ["top-right", "bottom-right"];

  classes.forEach((position) => {
    const mask = document.createElement("div");
    mask.className = `corner-mask corner-mask-${position}`;
    shadow.appendChild(mask);
  });
}

function insertContainer(container: HTMLElement): void {
  if (document.body) {
    document.body.appendChild(container);
    return;
  }

  if (document.documentElement) {
    document.documentElement.appendChild(container);
    return;
  }

  const observer = new MutationObserver(() => {
    const parent = document.body || document.documentElement;
    if (!parent) return;
    parent.appendChild(container);
    observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true });
}

function setupMaskProtection(): void {
  maskProtectionObserver?.disconnect();
  let restorationTimeout: ReturnType<typeof setTimeout> | null = null;

  maskProtectionObserver = new MutationObserver(() => {
    const containerExists = document.getElementById(
      "webview-corner-mask-container"
    );
    if (containerExists || !shadowContainer) return;

    if (restorationTimeout) clearTimeout(restorationTimeout);
    restorationTimeout = setTimeout(() => {
      if (!document.getElementById("webview-corner-mask-container")) {
        injectCornerMask();
      }
    }, 100);
  });

  [document.body, document.documentElement].forEach((target) => {
    if (target) {
      maskProtectionObserver?.observe(target, {
        childList: true,
        subtree: false,
      });
    }
  });
}

function baseMaskStyles(): string {
  return `
    :host { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
    .corner-mask { position: absolute; width: 48px; height: 48px; pointer-events: none; }
  `;
}

function portraitMaskStyles(): string {
  return `${baseMaskStyles()}
    .corner-mask-bottom-left {
      bottom: -1px; left: -1px;
      background:
        radial-gradient(circle at 44px 1px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
        radial-gradient(circle at 41px 0px, transparent 34px, #2b2c2c 30px);
      background-position: -11px 14px;
      background-repeat: no-repeat;
    }
    .corner-mask-bottom-right {
      bottom: -1px; right: -1px;
      background:
        radial-gradient(circle at 2px 1px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
        radial-gradient(circle at 0px 1px, transparent 40px, #2b2c2c 40px);
      background-position: 13px 14px;
      background-repeat: no-repeat;
    }
  `;
}

function landscapeMaskStyles(): string {
  return `${baseMaskStyles()}
    .corner-mask-top-right {
      top: -1px; right: -1px;
      background:
        radial-gradient(circle at 2px 44px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
        radial-gradient(circle at 0px 47px, transparent 34px, #2b2c2c 30px);
      background-position: 13px -11px;
      background-repeat: no-repeat;
    }
    .corner-mask-bottom-right {
      bottom: -1px; right: -1px;
      background:
        radial-gradient(circle at 2px 1px, transparent 32px, #000100 32px, #000100 38px, transparent 40px),
        radial-gradient(circle at 0px 1px, transparent 40px, #2b2c2c 40px);
      background-position: 13px 14px;
      background-repeat: no-repeat;
    }
  `;
}
