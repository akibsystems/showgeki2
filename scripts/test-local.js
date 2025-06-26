#!/usr/bin/env node

// ローカル環境でのWebhookテスト用スクリプト

const http = require('http');

const LOCAL_URL = 'http://localhost:8080';
const testPayload = {
  type: "INSERT",
  table: "stories",
  record: {
    id: `local-test-${Date.now()}`,
    story_text: "ローカルテスト用のストーリーです。昔々、ある森に小さなウサギが住んでいました。",
    created_at: new Date().toISOString(),
    is_completed: false
  }
};

async function testHealthCheck() {
  console.log('🏥 ヘルスチェックテスト...');
  
  return new Promise((resolve, reject) => {
    const req = http.request(`${LOCAL_URL}/health`, { method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ ヘルスチェック成功:', data);
          resolve();
        } else {
          console.log('❌ ヘルスチェック失敗:', res.statusCode, data);
          reject(new Error(`Health check failed: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ ヘルスチェックエラー:', error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ ヘルスチェックタイムアウト');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

async function testWebhook() {
  console.log('🎣 Webhookテスト...');
  console.log(`📝 テストストーリーID: ${testPayload.record.id}`);
  
  const postData = JSON.stringify(testPayload);
  
  return new Promise((resolve, reject) => {
    const req = http.request(`${LOCAL_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📊 ステータスコード: ${res.statusCode}`);
        console.log('📨 レスポンス:', data);
        
        if (res.statusCode === 200) {
          console.log('✅ Webhookテスト成功！');
          resolve();
        } else {
          console.log('❌ Webhookテスト失敗');
          reject(new Error(`Webhook test failed: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Webhookエラー:', error.message);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Webhookタイムアウト');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🧪 ローカル環境テストを開始...');
  console.log(`🔗 対象URL: ${LOCAL_URL}`);
  console.log('');
  
  try {
    // 1. ヘルスチェック
    await testHealthCheck();
    console.log('');
    
    // 2. Webhook テスト
    await testWebhook();
    console.log('');
    
    console.log('🎉 すべてのテストが成功しました！');
    
  } catch (error) {
    console.error('💥 テスト失敗:', error.message);
    console.log('');
    console.log('💡 トラブルシューティング:');
    console.log('1. ローカルサーバーが起動しているか確認');
    console.log('   node scripts/local-debug.js');
    console.log('2. 環境変数が正しく設定されているか確認');
    console.log('3. ポート8080が使用可能か確認');
    process.exit(1);
  }
}

main();