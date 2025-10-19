#!/usr/bin/env node
/**
 * EVS (Electron for Content Security VMP signing) hook for electron-builder
 * This script:
 * 1. Copies Widevine CDM to the app bundle
 * 2. Signs the application with Widevine VMP signature after packaging
 */
interface BuildContext {
    electronPlatformName: string;
    appOutDir: string;
}
/**
 * Main electron-builder hook
 */
export default function (context: BuildContext): Promise<void>;
export {};
