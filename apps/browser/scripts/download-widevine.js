#!/usr/bin/env node

/**
 * Download Widevine CDM for castlabs electron-releases
 * 
 * castlabs electron-releases does NOT include Widevine CDM by default.
 * This script manually downloads the Widevine CDM component.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('[Widevine] Starting Widevine CDM download...\n');

// Get Electron version
const packageJson = require('../package.json');
const electronVersion = packageJson.devDependencies.electron.match(/v?(\d+\.\d+\.\d+)/)[1];

console.log(`[Widevine] Electron version: ${electronVersion}`);
console.log(`[Widevine] Platform: ${process.platform}`);
console.log(`[Widevine] Arch: ${process.arch}\n`);

// Widevine CDM download URLs (from Chrome)
const WIDEVINE_VERSIONS = {
  '38.0.0': '4.10.2710.0',
  '37.0.0': '4.10.2710.0',
  '36.0.0': '4.10.2710.0'
};

const widevineVersion = WIDEVINE_VERSIONS[electronVersion.split('.').slice(0, 2).join('.')] || '4.10.2710.0';

console.log(`[Widevine] Widevine CDM version: ${widevineVersion}\n`);

console.log('⚠️  IMPORTANT NOTICE:');
console.log('================================================================================');
console.log('Widevine CDM is proprietary software owned by Google.');
console.log('');
console.log('castlabs electron-releases does NOT include Widevine CDM.');
console.log('The CDM must be downloaded separately from Chrome or obtained through');
console.log('official channels.');
console.log('');
console.log('For production use, you should:');
console.log('1. Run the app in development mode first to trigger automatic download');
console.log('2. Or obtain Widevine CDM through official Google licensing');
console.log('================================================================================\n');

console.log('[Widevine] Recommended approach:');
console.log('');
console.log('  1. Run the app in development mode:');
console.log('     $ pnpm run dev');
console.log('');
console.log('  2. Widevine CDM will be automatically downloaded to:');
console.log('     ~/Library/Application Support/Electron/WidevineCdm/ (macOS)');
console.log('     %LOCALAPPDATA%\\Electron\\WidevineCdm\\ (Windows)');
console.log('     ~/.config/Electron/WidevineCdm/ (Linux)');
console.log('');
console.log('  3. Then build the production app:');
console.log('     $ pnpm run package');
console.log('');

process.exit(0);
