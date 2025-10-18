#!/usr/bin/env node

/**
 * EVS (Electron for Content Security VMP signing) hook for electron-builder
 * This script:
 * 1. Copies Widevine CDM to the app bundle
 * 2. Signs the application with Widevine VMP signature after packaging
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Check if Python 3 is available
 */
function checkPython() {
  try {
    const result = spawnSync('python3', ['--version'], { encoding: 'utf8' });
    if (result.status === 0) {
      console.log('[EVS] Python 3 found:', result.stdout.trim());
      return true;
    }
  } catch (error) {
    console.error('[EVS] Python 3 not found');
    return false;
  }
  return false;
}

/**
 * Check if castlabs-evs is installed
 */
function checkEvsInstalled() {
  try {
    const result = spawnSync('python3', ['-m', 'pip', 'show', 'castlabs-evs'], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.includes('Name: castlabs-evs')) {
      const versionMatch = result.stdout.match(/Version: ([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      console.log('[EVS] castlabs-evs installed (version:', version + ')');
      return true;
    }
  } catch (error) {
    // Ignore
  }
  console.error('[EVS] castlabs-evs not installed');
  return false;
}

/**
 * Check if EVS account is configured
 */
function checkEvsAccount() {
  const configPath = path.join(os.homedir(), '.config', 'evs', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error('[EVS] EVS account not configured (config not found)');
    return false;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    // Check for both formats: account_name (old) and Auth.AccountName (new)
    const accountName = config.account_name || (config.Auth && config.Auth.AccountName) || (config.Account && config.Account.AccountName);
    if (accountName) {
      console.log('[EVS] ✓ EVS account configured:', accountName);
      return true;
    }
  } catch (error) {
    console.error('[EVS] ✗ Failed to read EVS config:', error.message);
    return false;
  }
  
  console.error('[EVS] EVS account not configured');
  return false;
}

/**
 * Print setup instructions
 */
function printSetupInstructions() {
  console.error('\n[EVS] Setup Instructions:');
  console.error('[EVS] ==========================================');
  console.error('[EVS] ');
  console.error('[EVS] 1. Install castlabs-evs:');
  console.error('[EVS]    $ pip3 install --upgrade castlabs-evs');
  console.error('[EVS] ');
  console.error('[EVS] 2. Create an EVS account (if you don\'t have one):');
  console.error('[EVS]    $ python3 -m castlabs_evs.account signup');
  console.error('[EVS] ');
  console.error('[EVS] 3. Or log in to existing account:');
  console.error('[EVS]    $ python3 -m castlabs_evs.account reauth');
  console.error('[EVS] ');
  console.error('[EVS] 4. Verify your setup:');
  console.error('[EVS]    $ node scripts/evs-sign.js --verify');
  console.error('[EVS] ');
  console.error('[EVS] ==========================================\n');
}

/**
 * Verify EVS environment setup
 */
function verifyEnvironment() {
  console.log('\n[EVS] Verifying EVS environment...');
  console.log('[EVS] ==========================================');
  
  const pythonOk = checkPython();
  const evsInstalled = pythonOk && checkEvsInstalled();
  const accountConfigured = evsInstalled && checkEvsAccount();
  
  console.log('[EVS] ==========================================');
  
  if (!pythonOk || !evsInstalled || !accountConfigured) {
    console.error('[EVS] EVS environment is not properly configured\n');
    printSetupInstructions();
    return false;
  }
  
  console.log('[EVS] EVS environment is ready for signing\n');
  return true;
}

/**
 * Copy Widevine CDM to app bundle
 */
function copyWidevineCdm(appOutDir, electronPlatformName) {
  console.log('[Widevine] Copying Widevine CDM to app bundle...');
  
  // Determine source path based on platform
  let widevineSrcPath;
  let widevineDestPath;
  
  if (electronPlatformName === 'darwin') {
    // macOS: Check multiple possible locations
    const possiblePaths = [
      path.join(os.homedir(), 'Library/Application Support/@aka-browser/browser/WidevineCdm'),
      path.join(os.homedir(), 'Library/Application Support/Electron/WidevineCdm'),
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        widevineSrcPath = p;
        break;
      }
    }
    
    if (!widevineSrcPath) {
      console.log('[Widevine] ⚠️  Widevine CDM not found in Application Support');
      console.log('[Widevine] The app will download it on first run');
      return false;
    }
    
    // Find the version directory
    const versions = fs.readdirSync(widevineSrcPath).filter(f => f.match(/^\d+\.\d+\.\d+\.\d+$/));
    if (versions.length === 0) {
      console.log('[Widevine] ⚠️  No Widevine CDM version found');
      return false;
    }
    
    const latestVersion = versions.sort().reverse()[0];
    widevineSrcPath = path.join(widevineSrcPath, latestVersion);
    
    // Destination: inside the app bundle
    const appName = fs.readdirSync(appOutDir).find(f => f.endsWith('.app'));
    if (!appName) {
      console.error('[Widevine] ✗ App bundle not found in', appOutDir);
      return false;
    }
    
    widevineDestPath = path.join(
      appOutDir,
      appName,
      'Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/WidevineCdm',
      latestVersion
    );
    
    console.log('[Widevine] Source:', widevineSrcPath);
    console.log('[Widevine] Destination:', widevineDestPath);
    
    // Create destination directory
    fs.mkdirSync(path.dirname(widevineDestPath), { recursive: true });
    
    // Copy Widevine CDM
    try {
      execSync(`cp -R "${widevineSrcPath}" "${widevineDestPath}"`, { encoding: 'utf8' });
      console.log('[Widevine] ✓ Widevine CDM copied successfully');
      
      // Verify the copy
      const cdmLib = path.join(widevineDestPath, '_platform_specific/mac_arm64/libwidevinecdm.dylib');
      if (fs.existsSync(cdmLib)) {
        const stats = fs.statSync(cdmLib);
        console.log(`[Widevine] ✓ libwidevinecdm.dylib (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // CRITICAL: Also copy to Resources directory for component updater
        const resourcesWidevinePath = path.join(
          appOutDir,
          appName,
          'Contents/Resources/WidevineCdm',
          latestVersion
        );
        
        console.log('[Widevine] Also copying to Resources:', resourcesWidevinePath);
        fs.mkdirSync(path.dirname(resourcesWidevinePath), { recursive: true });
        execSync(`cp -R "${widevineSrcPath}" "${resourcesWidevinePath}"`, { encoding: 'utf8' });
        console.log('[Widevine] ✓ Widevine CDM also copied to Resources');
        
        return true;
      } else {
        console.error('[Widevine] ✗ libwidevinecdm.dylib not found after copy');
        return false;
      }
    } catch (error) {
      console.error('[Widevine] ✗ Failed to copy Widevine CDM:', error.message);
      return false;
    }
  } else if (electronPlatformName === 'win32') {
    // Windows implementation (similar logic)
    console.log('[Widevine] Windows Widevine CDM copy not implemented yet');
    return false;
  }
  
  return false;
}

/**
 * Sign the application package
 */
function signPackage(appOutDir, persistent = false) {
  const persistentFlag = persistent ? '--persistent' : '';
  const command = `python3 -m castlabs_evs.vmp sign-pkg ${persistentFlag} "${appOutDir}"`;
  
  console.log('[EVS] Running:', command);
  
  try {
    execSync(command, {
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    console.log('[EVS] VMP signing completed successfully\n');
    return true;
  } catch (error) {
    console.error('[EVS] VMP signing failed:', error.message);
    return false;
  }
}

/**
 * Main electron-builder hook
 */
exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  console.log('\n[EVS] Starting post-pack process...');
  console.log('[EVS] Platform:', electronPlatformName);
  console.log('[EVS] App directory:', appOutDir);
  
  // Only process macOS and Windows builds
  if (electronPlatformName !== 'darwin' && electronPlatformName !== 'win32') {
    console.log('[EVS] Skipping for', electronPlatformName);
    return;
  }
  
  // Step 1: Verify EVS environment
  console.log('\n[EVS] Step 1: Verify EVS environment');
  if (!verifyEnvironment()) {
    throw new Error('EVS environment not configured. Please follow the setup instructions above.');
  }
  
  // Step 2: Sign the package with EVS VMP FIRST (before adding Widevine CDM)
  console.log('\n[EVS] Step 2: Sign with EVS VMP');
  const success = signPackage(appOutDir, false);
  
  if (!success) {
    throw new Error('EVS signing failed');
  }
  
  // Step 3: Copy Widevine CDM to app bundle AFTER signing
  // This prevents EVS from modifying the Widevine CDM dylib signature
  console.log('\n[EVS] Step 3: Copy Widevine CDM (after EVS signing)');
  copyWidevineCdm(appOutDir, electronPlatformName);
};

// Allow running this script directly for verification
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--verify') || args.includes('-v')) {
    // Verification mode
    const success = verifyEnvironment();
    process.exit(success ? 0 : 1);
  } else if (args.includes('--help') || args.includes('-h')) {
    // Help mode
    console.log('\nEVS Signing Script');
    console.log('==================');
    console.log('\nUsage:');
    console.log('  node scripts/evs-sign.js --verify    Verify EVS environment');
    console.log('  node scripts/evs-sign.js --help      Show this help');
    console.log('  node scripts/evs-sign.js <app-dir>   Sign application package');
    console.log('\n');
  } else if (args.length > 0) {
    // Manual signing mode
    const appOutDir = args[0];
    
    if (!fs.existsSync(appOutDir)) {
      console.error('[EVS] Error: Directory not found:', appOutDir);
      process.exit(1);
    }
    
    console.log('\n[EVS] Manual signing mode');
    console.log('[EVS] App directory:', appOutDir);
    
    if (!verifyEnvironment()) {
      process.exit(1);
    }
    
    const success = signPackage(appOutDir, false);
    process.exit(success ? 0 : 1);
  } else {
    console.error('\nError: Missing arguments');
    console.error('Run: node scripts/evs-sign.js --help\n');
    process.exit(1);
  }
}
