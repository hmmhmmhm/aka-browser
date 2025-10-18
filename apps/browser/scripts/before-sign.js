#!/usr/bin/env node

/**
 * EVS VMP signing before Apple codesign
 * This runs BEFORE electron-builder's codesign
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Verify EVS environment
 */
function verifyEnvironment() {
  const configPath = path.join(os.homedir(), '.config', 'evs', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error('[EVS] ✗ EVS account not configured');
    return false;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const accountName = config.account_name || (config.Auth && config.Auth.AccountName) || (config.Account && config.Account.AccountName);
    if (accountName) {
      console.log('[EVS] ✓ EVS account configured:', accountName);
      return true;
    }
  } catch (error) {
    console.error('[EVS] ✗ Failed to read EVS config:', error.message);
    return false;
  }
  
  return false;
}

/**
 * Sign with EVS VMP
 */
function signWithEVS(appPath) {
  console.log('[EVS] Signing with VMP before Apple codesign...');
  console.log('[EVS] App path:', appPath);
  
  const command = `python3 -m castlabs_evs.vmp sign-pkg "${appPath}"`;
  
  try {
    execSync(command, {
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    console.log('[EVS] ✓ VMP signing completed successfully\n');
    return true;
  } catch (error) {
    console.error('[EVS] ✗ VMP signing failed:', error.message);
    return false;
  }
}

/**
 * beforeSign hook for electron-builder
 */
exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  console.log('\n[EVS] beforeSign hook triggered');
  console.log('[EVS] Platform:', electronPlatformName);
  console.log('[EVS] App directory:', appOutDir);
  
  // Only sign macOS and Windows builds
  if (electronPlatformName !== 'darwin' && electronPlatformName !== 'win32') {
    console.log('[EVS] Skipping VMP signing for', electronPlatformName);
    return;
  }
  
  // Verify environment
  if (!verifyEnvironment()) {
    console.warn('[EVS] ⚠ EVS not configured, skipping VMP signing');
    return;
  }
  
  // Determine app path
  let appPath;
  if (electronPlatformName === 'darwin') {
    // Find .app bundle
    const files = fs.readdirSync(appOutDir);
    const appFile = files.find(f => f.endsWith('.app'));
    if (!appFile) {
      console.error('[EVS] ✗ Could not find .app bundle');
      return;
    }
    appPath = path.join(appOutDir, appFile);
  } else {
    appPath = appOutDir;
  }
  
  // Sign with EVS
  const success = signWithEVS(appPath);
  
  if (!success) {
    console.warn('[EVS] ⚠ VMP signing failed, but continuing with Apple codesign...');
  }
};
