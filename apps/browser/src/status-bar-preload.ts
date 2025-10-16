// Preload script for status bar WebContentsView
import { contextBridge, ipcRenderer } from 'electron';

// Expose API for status bar updates
contextBridge.exposeInMainWorld('electronStatusBarAPI', {
  onUpdateTheme: (callback: (backgroundColor: string, textColor: string) => void) => {
    ipcRenderer.on('status-bar-update-theme', (_event, backgroundColor, textColor) => {
      callback(backgroundColor, textColor);
    });
  },
  onUpdateTime: (callback: (time: string) => void) => {
    ipcRenderer.on('status-bar-update-time', (_event, time) => {
      callback(time);
    });
  },
  onUpdateOrientation: (callback: (orientation: 'portrait' | 'landscape') => void) => {
    ipcRenderer.on('status-bar-update-orientation', (_event, orientation) => {
      callback(orientation);
    });
  },
});
