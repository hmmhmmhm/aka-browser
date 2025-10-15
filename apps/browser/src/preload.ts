import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you want to expose to the renderer process here
  platform: process.platform,
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  // Navigation gesture listeners
  onNavigateBack: (callback: () => void) => {
    ipcRenderer.on('navigate-back', callback);
    return () => ipcRenderer.removeListener('navigate-back', callback);
  },
  onNavigateForward: (callback: () => void) => {
    ipcRenderer.on('navigate-forward', callback);
    return () => ipcRenderer.removeListener('navigate-forward', callback);
  },
  // Webview reload listener
  onWebviewReload: (callback: () => void) => {
    ipcRenderer.on('webview-reload', callback);
    return () => ipcRenderer.removeListener('webview-reload', callback);
  },
});
