#!/usr/bin/env node

/**
 * EVS VMP signing before Apple codesign
 * This runs BEFORE electron-builder's codesign
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

interface EVSConfig {
  account_name?: string;
  Auth?: {
    AccountName?: string;
  };
  Account?: {
    AccountName?: string;
  };
}

interface BuildContext {
  electronPlatformName: string;
  appOutDir: string;
}

/**
 * Verify EVS environment
 */
function verifyEnvironment(): boolean {
  const configPath = path.join(os.homedir(), '.config', 'evs', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error('[EVS] ✗ EVS account not configured');
    return false;
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config: EVSConfig = JSON.parse(configContent);
    const accountName = config.account_name || config.Auth?.AccountName || config.Account?.AccountName;
    if (accountName) {
      console.log('[EVS] ✓ EVS account configured:', accountName);
      return true;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[EVS] ✗ Failed to read EVS config:', errorMessage);
    return false;
  }
  
  return false;
}

/**
 * Sign with EVS VMP
 */
function signWithEVS(appPath: string): boolean {
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[EVS] ✗ VMP signing failed:', errorMessage);
    return false;
  }
}

/**
 * beforeSign hook for electron-builder
 */
export default async function(context: BuildContext): Promise<void> {
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
  let appPath: string;
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
}
