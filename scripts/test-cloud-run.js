#!/usr/bin/env node

// Cloud Run環境でのWebhookテスト用スクリプト

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const CLOUD_RUN_URL = 'https://showgeki2-auto-process-598866385095.asia-northeast1.run.app';
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数 SUPABASE_URL と SUPABASE_SERVICE_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testHealthCheck() {
  console.log('🏥 Cloud Run ヘルスチェックテスト...');
  
  return new Promise((resolve, reject) => {
    const req = https.request(`${CLOUD_RUN_URL}/health`, { method: 'GET' }, (res) => {
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
    
    req.setTimeout(10000, () => {
      console.log('❌ ヘルスチェックタイムアウト');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

async function createTestStory() {
  console.log('📝 テスト用ストーリーを作成中...');
  
  const testStory = {
    story_text: `テスト用の短いストーリーです（${new Date().toLocaleString()}）。
    
昔々、ある小さな村に賢い猫が住んでいました。この猫は毎日村人たちの悩みを聞いて、知恵で解決していました。ある日、村に大きな問題が起こりました。川の水が濁ってしまったのです。

猫は森の奥深くへ向かい、清らかな泉を見つけました。村人たちと協力して新しい水路を作り、村に美しい水を引きました。村人たちは猫の知恵に感謝し、猫は村の守り神として大切にされました。`,
    is_completed: false
  };

  try {
    const { data, error } = await supabase
      .from('stories')
      .insert(testStory)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ テストストーリー作成成功: ID ${data.id}`);
    return data;
  } catch (error) {
    console.error('❌ ストーリー作成失敗:', error.message);
    throw error;
  }
}

async function waitForProcessing(storyId, timeoutMs = 300000) { // 5分タイムアウト
  console.log(`⏳ ストーリー ${storyId} の処理完了を待機中...`);
  
  const startTime = Date.now();
  const checkInterval = 10000; // 10秒間隔でチェック
  
  return new Promise((resolve, reject) => {
    const checkProcessing = async () => {
      try {
        // ストーリーの完了状態をチェック
        const { data: story, error } = await supabase
          .from('stories')
          .select('*')
          .eq('id', storyId)
          .single();

        if (error) {
          console.error('❌ ストーリー確認エラー:', error.message);
          reject(error);
          return;
        }

        if (story.is_completed) {
          console.log('✅ ストーリー処理完了！');
          console.log(`📹 動画URL: ${story.video_url || 'URL未設定'}`);
          resolve(story);
          return;
        }

        // タイムアウトチェック
        if (Date.now() - startTime > timeoutMs) {
          console.log('⏰ タイムアウト: 処理が完了しませんでした');
          reject(new Error('Processing timeout'));
          return;
        }

        // 次のチェックをスケジュール
        console.log(`🔄 まだ処理中... (経過時間: ${Math.round((Date.now() - startTime) / 1000)}秒)`);
        setTimeout(checkProcessing, checkInterval);

      } catch (error) {
        console.error('❌ 処理確認エラー:', error.message);
        reject(error);
      }
    };

    // 最初のチェックを開始
    setTimeout(checkProcessing, 5000); // 5秒後から開始
  });
}

async function testCloudRunProcessing() {
  console.log('🎬 Cloud Run 処理テスト...');
  
  try {
    // 1. テストストーリーを作成（これでSupabase Webhookが自動的にトリガーされる）
    const testStory = await createTestStory();
    console.log('');
    
    // 2. 処理完了を待機
    const completedStory = await waitForProcessing(testStory.id);
    console.log('');
    
    console.log('🎉 Cloud Run処理テスト成功！');
    console.log(`📊 結果: ストーリーID ${completedStory.id} が正常に処理されました`);
    
    return completedStory;
    
  } catch (error) {
    console.error('❌ Cloud Run処理テスト失敗:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Cloud Run動作確認テストを開始...');
  console.log(`🔗 対象URL: ${CLOUD_RUN_URL}`);
  console.log(`🗄️  Supabase: ${supabaseUrl}`);
  console.log('');
  
  try {
    // 1. ヘルスチェック
    await testHealthCheck();
    console.log('');
    
    // 2. 実際の処理テスト
    await testCloudRunProcessing();
    console.log('');
    
    console.log('🎉 すべてのテストが成功しました！');
    console.log('');
    console.log('✅ Cloud Runサービスは正常に動作しています');
    console.log('✅ Supabase Webhookとの連携も正常です');
    console.log('✅ mulmocast-cliによる動画生成も正常です');
    
  } catch (error) {
    console.error('💥 テスト失敗:', error.message);
    console.log('');
    console.log('💡 トラブルシューティング:');
    console.log('1. Cloud Runサービスが正常にデプロイされているか確認');
    console.log('2. Supabase Webhookが正しく設定されているか確認');
    console.log('3. 環境変数（秘密）が正しく設定されているか確認');
    console.log('4. Cloud Runログを確認: gcloud logging read "resource.type=cloud_run_revision" --project=showgeki2');
    process.exit(1);
  }
}

main();