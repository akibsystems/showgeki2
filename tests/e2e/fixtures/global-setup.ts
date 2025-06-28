import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // グローバルセットアップ処理
  console.log('🚀 Starting E2E test global setup...');

  // ブラウザを起動してアプリケーションの初期化を確認
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // アプリケーションが起動しているかチェック
    const baseURL = config.webServer?.url || 'http://localhost:3000';
    console.log(`📡 Checking application availability at ${baseURL}`);
    
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    // ホームページが正常に読み込まれることを確認
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('✅ Application is running and accessible');

    // 必要に応じてテストデータのセットアップ
    console.log('📋 Setting up test data...');
    
    // テスト用のワークスペースやストーリーがあれば削除
    // 実際のプロダクションでは注意深く実装する必要がある
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;