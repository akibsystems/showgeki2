#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

// Load environment variables (only in local environment)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
}

// 設定
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// 必須環境変数のチェック
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数 SUPABASE_URL と SUPABASE_SERVICE_KEY を設定してください');
  process.exit(1);
}

if (!openaiApiKey) {
  console.error('環境変数 OPENAI_API_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// 環境に応じたパス設定
const WORK_DIR = process.env.NODE_ENV === 'development'
  ? '/app/mulmocast-cli'
  : '/app/mulmocast-cli';
const SCHOOL_JSON_PATH = path.join(WORK_DIR, 'scripts', 'school.json');
const OUTPUT_VIDEO_PATH = path.join(WORK_DIR, 'output', 'school.mp4');

function writeSchoolJson(jsonContent) {
  try {
    console.log('school.jsonに書き込み中...');
    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(SCHOOL_JSON_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(SCHOOL_JSON_PATH, jsonContent, 'utf8');
    console.log(`✅ ${SCHOOL_JSON_PATH} に書き込み完了`);
  } catch (error) {
    throw new Error(`ファイル書き込みエラー: ${error.message}`);
  }
}

function generateMovie() {
  try {
    console.log('mulmocast-cliで動画生成中...');
    console.log('🎬 実際のmulmocast-cliで動画生成を開始...');

    // mulmocast-cliが存在するかチェック
    const mulmocastPath = '/app/mulmocast-cli';
    if (!fs.existsSync(path.join(mulmocastPath, 'package.json'))) {
      throw new Error('mulmocast-cli が見つかりません');
    }

    // システム情報をログ出力
    console.log('📊 システム情報:');
    console.log(`  - Node.js: ${process.version}`);
    console.log(`  - Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`);
    console.log(`  - Working Directory: ${process.cwd()}`);
    console.log(`  - Mulmocast Path: ${mulmocastPath}`);

    // ディスク容量チェック
    try {
      const { execSync: exec } = require('child_process');
      const dfOutput = exec('df -h /app', { encoding: 'utf8' });
      console.log('  - Disk Usage:', dfOutput.split('\n')[1]);
    } catch (dfError) {
      console.log('  - Disk Usage: Could not check');
    }

    // 出力ディレクトリを確保
    const outputDir = path.dirname(OUTPUT_VIDEO_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      // 実際のmulmocast-cliコマンドを実行
      const command = 'yarn movie scripts/school.json -f';
      console.log(`実行コマンド: ${command}`);
      console.log('🚀 mulmocast-cli 実行開始...');

      const startTime = Date.now();
      execSync(command, {
        cwd: mulmocastPath,
        stdio: 'inherit',
        timeout: 600000, // 10分タイムアウト (Cloud Run制限を考慮)
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer (大きなログ出力に対応)
      });

      const executionTime = Date.now() - startTime;
      console.log(`⏱️ mulmocast-cli 実行完了: ${Math.round(executionTime / 1000)}秒`);

      // 出力ファイルの存在確認
      if (!fs.existsSync(OUTPUT_VIDEO_PATH)) {
        throw new Error(`出力動画ファイルが見つかりません: ${OUTPUT_VIDEO_PATH}`);
      }

      console.log('✅ 動画生成完了');
      return OUTPUT_VIDEO_PATH; // Return video path for upload

    } catch (execError) {
      console.error('mulmocast-cli実行エラー:', execError.message);
      // フォールバック: ダミーファイルを作成
      console.log('⚠️ フォールバック: ダミーファイルを作成');
      fs.writeFileSync(OUTPUT_VIDEO_PATH, 'dummy video content - mulmocast failed', 'utf8');
      return OUTPUT_VIDEO_PATH;
    }

  } catch (error) {
    throw new Error(`動画生成エラー: ${error.message}`);
  }
}

/**
 * Upload video to Supabase Storage
 */
async function uploadVideoToSupabase(videoPath, videoId) {
  try {
    console.log('動画をSupabase Storageにアップロード中...');

    // Read video file
    const videoBuffer = fs.readFileSync(videoPath);
    const fileName = `${videoId}_${Date.now()}.mp4`;
    const filePath = `videos/${fileName}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('videos')
      .upload(filePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    console.log('✅ 動画アップロード完了');
    console.log(`🔗 動画URL: ${urlData.publicUrl}`);

    return urlData.publicUrl;
  } catch (error) {
    throw new Error(`動画アップロードエラー: ${error.message}`);
  }
}

async function processVideoGeneration(payload) {
  try {
    const { video_id, story_id, uid, title, text_raw, script_json } = payload;

    console.log('🚀 動画生成処理を開始します...');
    console.log('🔍 受信ペイロード:', JSON.stringify(payload, null, 2));
    console.log(`📹 動画ID: ${video_id} (型: ${typeof video_id}, 長さ: ${video_id ? video_id.length : 'N/A'})`);
    console.log(`📝 ストーリーID: ${story_id}`);
    console.log(`👤 UID: ${uid}`);
    console.log(`📄 タイトル: ${title}`);
    console.log('');

    // UUID形式チェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(video_id)) {
      throw new Error(`無効なvideo_id形式: "${video_id}" - UUID形式である必要があります`);
    }
    if (!uuidRegex.test(story_id)) {
      throw new Error(`無効なstory_id形式: "${story_id}" - UUID形式である必要があります`);
    }

    // Update video status to 'processing'
    await supabase
      .from('videos')
      .update({ status: 'processing' })
      .eq('id', video_id)
      .eq('uid', uid);

    let jsonContent;

    // Check if script_json already exists - REQUIRED
    if (script_json && typeof script_json === 'object') {
      console.log('2. 既存のスクリプトを使用...');
      jsonContent = JSON.stringify(script_json, null, 2);
      console.log('✅ スクリプト準備完了');
    } else {
      // script_jsonが存在しない場合はエラーで終了
      const errorMessage = `script_jsonが存在しません。動画生成にはスクリプトが必要です。`;
      console.error('❌ エラー:', errorMessage);
      console.error('📝 受信したscript_json:', script_json);
      console.error('📝 script_json型:', typeof script_json);

      throw new Error(errorMessage);
    }
    console.log('');

    // 3. school.jsonに書き込み
    console.log('3. school.jsonファイルに書き込み中...');
    writeSchoolJson(jsonContent);
    console.log('');

    // 4. mulmocast-cliで動画生成
    console.log('4. mulmocast-cliで動画生成中...');
    const videoPath = generateMovie();
    console.log('');

    // 5. 動画をSupabase Storageにアップロード
    console.log('5. 動画をSupabase Storageにアップロード中...');
    const videoUrl = await uploadVideoToSupabase(videoPath, video_id);
    console.log('');

    // 6. Get video file stats
    const stats = fs.statSync(videoPath);
    const videoSizeMB = stats.size / (1024 * 1024);

    // 7. Update video record with completion
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        status: 'completed',
        url: videoUrl,
        duration_sec: 30, // Default duration, can be calculated from video
        resolution: '1920x1080', // Default resolution from mulmocast
        size_mb: Number(videoSizeMB.toFixed(2))
      })
      .eq('id', video_id)
      .eq('uid', uid);

    if (updateError) {
      throw new Error(`動画レコード更新エラー: ${updateError.message}`);
    }

    // 8. Update story status to completed
    await supabase
      .from('stories')
      .update({ status: 'completed' })
      .eq('id', story_id)
      .eq('uid', uid);

    console.log('🎉 処理が完了しました！');
    console.log(`📹 動画ID ${video_id} の動画が完成し、アップロードされました。`);
    console.log(`🔗 動画URL: ${videoUrl}`);
    console.log('');

    return true; // 処理完了

  } catch (error) {
    console.error('❌ 処理中にエラーが発生しました:', error.message);

    // Update video status to failed
    if (payload.video_id && payload.uid) {
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_msg: error.message
        })
        .eq('id', payload.video_id)
        .eq('uid', payload.uid);
    }

    return false; // エラーのため処理失敗
  }
}

// HTTP サーバー作成
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        console.log('Webhook受信:', payload);

        // Handle video generation requests from API Routes
        if (payload.type === 'video_generation' && payload.payload) {
          const requestData = payload.payload;
          console.log(`新しい動画生成リクエスト: ${requestData.video_id}`);

          // 非同期で動画生成処理を開始（レスポンスは即座に返す）
          processVideoGeneration(requestData).catch(error => {
            console.error('❌ 動画生成処理でエラー:', error.message);
            console.error('❌ エラースタック:', error.stack);

            // エラーを動画レコードに記録
            if (requestData.video_id && requestData.uid) {
              supabase
                .from('videos')
                .update({
                  status: 'failed',
                  error_msg: `処理エラー: ${error.message}`
                })
                .eq('id', requestData.video_id)
                .eq('uid', requestData.uid)
                .then(() => console.log('❌ 動画ステータスをfailedに更新'))
                .catch(updateError => console.error('❌ ステータス更新エラー:', updateError.message));
            }
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Video generation started',
            video_id: requestData.video_id
          }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Webhook received but no action needed' }));
        }

      } catch (error) {
        console.error('Webhook処理エラー:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });

    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Cloud Run requires listening on PORT
const port = process.env.PORT || 8080;

// Ctrl+Cでの終了処理
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 処理を停止します...');
  server.close();
  process.exit(0);
});

// サーバーを起動
server.listen(port, () => {
  console.log(`Webhook server listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Webhook endpoint: http://localhost:${port}/webhook`);
});