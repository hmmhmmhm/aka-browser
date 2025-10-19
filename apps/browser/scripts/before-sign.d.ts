#!/usr/bin/env node
/**
 * EVS VMP signing before Apple codesign
 * This runs BEFORE electron-builder's codesign
 */
interface BuildContext {
    electronPlatformName: string;
    appOutDir: string;
}
/**
 * beforeSign hook for electron-builder
 */
export default function (context: BuildContext): Promise<void>;
export {};
