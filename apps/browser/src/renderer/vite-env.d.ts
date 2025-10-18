/// <reference types="vite/client" />

import type { ElectronAPI } from '../types/electron-api';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
