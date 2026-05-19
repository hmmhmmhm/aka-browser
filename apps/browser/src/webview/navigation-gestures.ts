import type { IpcRenderer } from "electron";

export function installNavigationGestures(ipcRenderer: IpcRenderer): void {
  let isGesturing = false;
  let accumulatedDeltaX = 0;
  let accumulatedDeltaY = 0;
  let gestureTimeout: ReturnType<typeof setTimeout> | null = null;
  const gestureThreshold = 100;
  const verticalTolerance = 50;

  window.addEventListener(
    "wheel",
    (event: WheelEvent) => {
      if (Math.abs(event.deltaX) < 1) return;

      if (!isGesturing && Math.abs(event.deltaX) > 4) {
        isGesturing = true;
        accumulatedDeltaX = 0;
        accumulatedDeltaY = 0;
      }

      if (isGesturing) {
        accumulatedDeltaX += event.deltaX;
        accumulatedDeltaY += Math.abs(event.deltaY);

        if (accumulatedDeltaY > verticalTolerance) {
          isGesturing = false;
          return;
        }

        if (accumulatedDeltaX < -gestureThreshold) {
          event.preventDefault();
          ipcRenderer.send("webview-navigate-back");
          isGesturing = false;
          accumulatedDeltaX = 0;
          accumulatedDeltaY = 0;
        } else if (accumulatedDeltaX > gestureThreshold) {
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

  window.addEventListener("wheel", () => {
    if (gestureTimeout) clearTimeout(gestureTimeout);
    gestureTimeout = setTimeout(() => {
      isGesturing = false;
      accumulatedDeltaX = 0;
      accumulatedDeltaY = 0;
    }, 100);
  });
}
