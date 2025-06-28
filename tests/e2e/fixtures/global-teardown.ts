import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // グローバルティアダウン処理
  console.log('🧹 Starting E2E test global teardown...');

  try {
    // テストデータのクリーンアップ
    console.log('🗑️  Cleaning up test data...');
    
    // 必要に応じてテスト中に作成されたデータを削除
    // - テスト用ストーリー
    // - テスト用ワークスペース  
    // - 一時的なファイル
    
    // ログファイルやスクリーンショットの整理
    console.log('📁 Organizing test artifacts...');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // ティアダウンのエラーはテスト失敗にしない
    console.warn('⚠️  Continuing despite teardown errors...');
  }

  console.log('✅ Global teardown completed');
}

export default globalTeardown;