#!/usr/bin/env node

/**
 * ビデオを手動で処理（生成/再生成）するスクリプト
 * 
 * 使用方法:
 * node scripts/process-video.js <video_id>
 * 
 * オプション:
 * --dry-run: 実行せずに確認のみ
 * --force: ステータスに関わらず強制的に再生成
 * --check-webhook-url: Cloud Run Webhook URLの設定確認
 * 
 * 例:
 * node scripts/process-video.js 123e4567-e89b-12d3-a456-426614174000
 * node scripts/process-video.js 123e4567-e89b-12d3-a456-426614174000 --dry-run
 * node scripts/process-video.js 123e4567-e89b-12d3-a456-426614174000 --force
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

/**
 * ビデオ情報と関連データを取得
 */
async function getVideoWithStoryboard(videoId) {
  // ビデオ情報を取得
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (videoError || !video) {
    throw new Error(`ビデオが見つかりません: ${videoId}`);
  }

  // ストーリーボード情報を別途取得
  if (video.story_id) {
    const { data: storyboard, error: storyboardError } = await supabase
      .from('storyboards')
      .select('id, uid, title, mulmoscript, summary_data, story_data')
      .eq('id', video.story_id)
      .single();

    if (!storyboardError && storyboard) {
      video.storyboards = storyboard;
    }
  }

  return video;
}


/**
 * Webhook URLを選択
 */
function selectWebhookUrl(target) {
  const webhookUrls = {
    'local': 'http://localhost:8080/webhook',
    'production': 'https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/webhook',
    'debug': 'https://showgeki2-auto-process-debug-mqku5oexhq-an.a.run.app/webhook'
  };

  // targetが指定されていない場合は環境変数から読み取り、それもなければローカル
  if (!target) {
    const envUrl = process.env.CLOUD_RUN_WEBHOOK_URL || process.env.WEBHOOK_URL;
    if (envUrl) {
      return envUrl;
    }
    return webhookUrls.local;
  }

  return webhookUrls[target] || webhookUrls.local;
}

/**
 * Cloud Run Webhookを直接送信（代替手段）
 */
async function sendWebhookDirectly(video, storyboard, webhookTarget) {
  const webhookUrl = selectWebhookUrl(webhookTarget);

  console.log(`\n🚀 Webhook直接送信: ${webhookUrl}`);
  
  const webhookPayload = {
    type: 'video_generation',
    payload: {
      video_id: video.id,
      story_id: video.story_id,
      uid: video.uid,
      title: storyboard.title || '無題の作品',
      text_raw: storyboard.summary_data?.description || storyboard.story_data?.originalText || '',
      script_json: storyboard.mulmoscript
    }
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Webhook送信失敗: ${response.status} ${errorText}`);
  }

  return response;
}

/**
 * メイン処理
 */
async function processQueuedVideo(videoId, options = {}) {
  const { dryRun = false, webhookTarget = null, force = false } = options;
  
  console.log('📹 ビデオの処理を開始します...');
  console.log(`  ビデオID: ${videoId}`);
  console.log(`  モード: ${dryRun ? 'DRY RUN' : '実行'}`);
  if (force) {
    console.log(`  強制再生成: 有効`);
  }
  if (webhookTarget) {
    console.log(`  Webhook宛先: ${webhookTarget}`);
  }

  try {
    // 1. ビデオ情報を取得
    const video = await getVideoWithStoryboard(videoId);
    
    console.log('\n📊 ビデオ情報:');
    console.log(`  ステータス: ${video.status}`);
    console.log(`  作成日時: ${video.created_at}`);
    console.log(`  UID: ${video.uid}`);
    console.log(`  ストーリーID: ${video.story_id}`);
    console.log(`  タイトル: ${video.storyboards?.title || '未設定'}`);

    // ステータスチェック（--forceオプションが指定されていない場合のみ）
    if (!force && video.status !== 'queued') {
      console.log(`\n⚠️  このビデオのステータスは '${video.status}' です。処理をスキップします。`);
      console.log(`  強制的に再生成するには --force オプションを使用してください。`);
      return;
    }

    // MulmoScriptの存在チェック
    if (!video.storyboards?.mulmoscript) {
      console.error('\n❌ MulmoScriptが見つかりません。先にスクリプトを生成してください。');
      return;
    }

    if (dryRun) {
      console.log('\n📝 DRY RUNモード: 実際の処理は行いません');
      return;
    }

    // --forceオプションの場合、既存の動画とプレビューを削除
    if (force) {
      console.log('\n🗑️ 強制再生成モード: 既存のデータを削除します...');
      
      // 1. 既存の動画ファイルを削除
      if (video.url) {
        console.log('  📹 既存の動画を削除中...');
        try {
          const videoPath = `videos/${videoId}.mp4`;
          const { error: deleteVideoError } = await supabase.storage
            .from('videos')
            .remove([videoPath]);
          
          if (deleteVideoError) {
            console.error(`  ⚠️ 動画削除エラー: ${deleteVideoError.message}`);
          } else {
            console.log(`  ✅ 動画を削除しました: ${videoPath}`);
          }
        } catch (error) {
          console.error('  ⚠️ 動画削除中にエラー:', error.message);
        }
      }
      
      // 2. プレビューフォルダを削除（videos/[video_id]/preview）
      console.log('  🖼️ プレビューフォルダを削除中...');
      try {
        // プレビューフォルダ内のファイルをリスト
        const previewPath = `videos/${videoId}/preview`;
        const { data: files, error: listError } = await supabase.storage
          .from('videos')
          .list(previewPath, {
            limit: 1000,
            recursive: true
          });
        
        if (!listError && files && files.length > 0) {
          // すべてのファイルのパスを生成
          const filePaths = files.map(file => `${previewPath}/${file.name}`);
          
          // バッチで削除
          const { error: deleteError } = await supabase.storage
            .from('videos')
            .remove(filePaths);
          
          if (deleteError) {
            console.error(`  ⚠️ プレビュー削除エラー: ${deleteError.message}`);
          } else {
            console.log(`  ✅ プレビューファイルを削除しました: ${files.length}個`);
          }
        } else {
          console.log('  ℹ️ プレビューファイルが見つかりませんでした');
        }
      } catch (error) {
        console.error('  ⚠️ プレビュー削除中にエラー:', error.message);
      }
      
      // 3. 音声プレビューフォルダも削除（videos/[video_id]/audio-preview）
      console.log('  🎵 音声プレビューフォルダを削除中...');
      try {
        const audioPreviewPath = `videos/${videoId}/audio-preview`;
        const { data: audioFiles, error: listError } = await supabase.storage
          .from('videos')
          .list(audioPreviewPath, {
            limit: 1000,
            recursive: true
          });
        
        if (!listError && audioFiles && audioFiles.length > 0) {
          const filePaths = audioFiles.map(file => `${audioPreviewPath}/${file.name}`);
          
          const { error: deleteError } = await supabase.storage
            .from('videos')
            .remove(filePaths);
          
          if (deleteError) {
            console.error(`  ⚠️ 音声プレビュー削除エラー: ${deleteError.message}`);
          } else {
            console.log(`  ✅ 音声プレビューファイルを削除しました: ${audioFiles.length}個`);
          }
        } else {
          console.log('  ℹ️ 音声プレビューファイルが見つかりませんでした');
        }
      } catch (error) {
        console.error('  ⚠️ 音声プレビュー削除中にエラー:', error.message);
      }
      
      // 4. videosテーブルのURLとプレビュー関連フィールドをクリア
      console.log('  📝 データベースの参照をクリア中...');
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          url: null,
          title: null,
          duration: null,
          resolution: null,
          preview_status: null,
          preview_data: null,
          preview_storage_path: null,
          audio_preview_status: null,
          audio_preview_data: null,
          audio_preview_storage_path: null
        })
        .eq('id', videoId)
        .eq('uid', video.uid);
      
      if (updateError) {
        console.error(`  ⚠️ データベース更新エラー: ${updateError.message}`);
      } else {
        console.log('  ✅ データベースの参照をクリアしました');
      }
      
      console.log('\n✅ 既存データの削除が完了しました');
    }

    const startTime = Date.now();

    // 2. 直接Webhookを送信（webhookTargetが指定されている場合は優先）
    console.log('\n🚀 処理を開始します...');
    
    const response = await sendWebhookDirectly(video, video.storyboards, webhookTarget);
    const responseData = await response.json();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Webhook送信成功!`);
    console.log(`  実行時間: ${duration}秒`);
    console.log(`  レスポンス:`, JSON.stringify(responseData, null, 2));

    // 3. ビデオのステータスを確認
    console.log('\n⏳ 処理状況を確認中...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
    
    const { data: updatedVideo, error: checkError } = await supabase
      .from('videos')
      .select('status, url')
      .eq('id', videoId)
      .single();

    if (!checkError && updatedVideo) {
      console.log('\n📊 処理後のステータス:');
      console.log(`  ステータス: ${updatedVideo.status}`);
      if (updatedVideo.url) {
        console.log(`  動画URL: ${updatedVideo.url}`);
      }
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    throw error;
  }
}

/**
 * queuedステータスのビデオを検索
 */
async function findQueuedVideos(limit = 10) {
  console.log('🔍 queuedステータスのビデオを検索中...');
  
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, status, created_at, uid, story_id')
    .eq('status', 'queued')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`検索エラー: ${error.message}`);
  }

  // 各ビデオのタイトルを取得
  for (const video of videos || []) {
    if (video.story_id) {
      const { data: storyboard } = await supabase
        .from('storyboards')
        .select('title')
        .eq('id', video.story_id)
        .single();
      
      video.storyboards = storyboard;
    }
  }

  return videos || [];
}

// コマンドライン引数の処理
const args = process.argv.slice(2);
const videoId = args.find(arg => !arg.startsWith('--'));

// オプション解析
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const checkWebhookUrl = args.includes('--check-webhook-url');
const listWebhooks = args.includes('--list-webhooks');

// Webhook宛先の解析
let webhookTarget = null;
const targetIndex = args.indexOf('--webhook');
if (targetIndex !== -1 && args[targetIndex + 1]) {
  webhookTarget = args[targetIndex + 1];
}

// Webhook一覧表示モード
if (listWebhooks) {
  console.log('🔧 利用可能なWebhook宛先:');
  console.log('  local      : http://localhost:8080/webhook (デフォルト)');
  console.log('  production : https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/webhook');
  console.log('  debug      : https://showgeki2-auto-process-debug-mqku5oexhq-an.a.run.app/webhook');
  console.log('\n使用例:');
  console.log('  node scripts/process-video.js <video_id> --webhook production');
  console.log('  node scripts/process-video.js <video_id> --webhook debug');
  process.exit(0);
}

// Webhook URL確認モード
if (checkWebhookUrl) {
  console.log('🔧 Cloud Run Webhook URL 設定確認:');
  console.log(`  環境変数: ${process.env.CLOUD_RUN_WEBHOOK_URL || '❌ 未設定'}`);
  console.log('\n利用可能なWebhook宛先を表示するには:');
  console.log('  node scripts/process-video.js --list-webhooks');
  process.exit(0);
}

// ビデオIDが指定されていない場合
if (!videoId) {
  console.error('❌ ビデオIDを指定してください');
  console.log('\n使用方法:');
  console.log('  node scripts/process-video.js <video_id>');
  console.log('  node scripts/process-video.js <video_id> --dry-run');
  console.log('  node scripts/process-video.js <video_id> --force');
  console.log('  node scripts/process-video.js <video_id> --webhook <target>');
  console.log('  node scripts/process-video.js --check-webhook-url');
  console.log('  node scripts/process-video.js --list-webhooks');
  console.log('\n📋 queuedステータスのビデオを検索するには:');
  console.log('  node scripts/find-queued-videos.js');
  
  // queuedビデオを簡易表示
  findQueuedVideos(5)
    .then(videos => {
      if (videos.length > 0) {
        console.log(`\n最近のqueuedビデオ (${videos.length}件):`)
        videos.forEach(v => {
          const createdAt = new Date(v.created_at).toLocaleString('ja-JP');
          console.log(`  ${v.id} - ${v.storyboards?.title || '無題'} (${createdAt})`);
        });
      }
    })
    .catch(error => {
      console.error('検索エラー:', error.message);
    })
    .finally(() => {
      process.exit(1);
    });
  return;
}

// 実行
processQueuedVideo(videoId, { dryRun, webhookTarget, force })
  .then(() => {
    console.log('\n🎉 処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 処理が失敗しました:', error);
    process.exit(1);
  });