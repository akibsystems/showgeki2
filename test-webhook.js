#!/usr/bin/env node

// Webhook動作テスト用スクリプト

const https = require('https');

const testPayload = {
  type: "INSERT",
  table: "stories",
  record: {
    id: `test-${Date.now()}`,
    story_text: "テスト用のストーリーです。昔々、ある森に小さなウサギが住んでいました。",
    created_at: new Date().toISOString(),
    is_completed: false
  }
};

const postData = JSON.stringify(testPayload);

const options = {
  hostname: 'showgeki2-auto-process-598866385095.asia-northeast1.run.app',
  port: 443,
  path: '/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Webhookテストを開始...');
console.log(`📝 テストストーリーID: ${testPayload.record.id}`);

const req = https.request(options, (res) => {
  console.log(`📊 ステータスコード: ${res.statusCode}`);
  
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  
  res.on('end', () => {
    console.log('📨 レスポンス:', responseBody);
    
    if (res.statusCode === 200) {
      console.log('✅ Webhookテスト成功！');
      console.log('🔍 ログを確認してください:');
      console.log('   gcloud run services logs read showgeki2-auto-process --region=asia-northeast1 --project=showgeki2 --limit=10');
    } else {
      console.log('❌ Webhookテスト失敗');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ リクエストエラー:', error);
});

req.write(postData);
req.end();