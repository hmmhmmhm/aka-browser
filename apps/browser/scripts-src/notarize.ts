import { notarize } from '@electron/notarize';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local file
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

export default async function notarizing(context: any) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Check environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('⚠️  Skipping notarization. Please set environment variables:');
    console.warn('   APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`🔐 Starting notarization: ${appPath}`);

  try {
    await notarize({
      appPath,
      appleId,
      appleIdPassword,
      teamId,
    });
    console.log('✅ Notarization completed!');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
}
