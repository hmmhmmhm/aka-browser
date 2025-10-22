import { notarize } from '@electron/notarize';
import * as path from 'path';

export default async function notarizing(context: any) {
  const { electronPlatformName, appOutDir } = context;
  
  // macOS만 공증
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // 환경 변수 확인
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('⚠️  공증을 건너뜁니다. 환경 변수를 설정하세요:');
    console.warn('   APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`🔐 공증 시작: ${appPath}`);

  try {
    await notarize({
      appPath,
      appleId,
      appleIdPassword,
      teamId,
    });
    console.log('✅ 공증 완료!');
  } catch (error) {
    console.error('❌ 공증 실패:', error);
    throw error;
  }
}
