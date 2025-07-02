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
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

// 必須環境変数のチェック
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数 SUPABASE_URL と SUPABASE_SERVICE_KEY を設定してください');
  process.exit(1);
}


console.log('🔧 システム設定:');
console.log(`  - Supabase URL: ${supabaseUrl}`);
console.log(`  - Service Key: ${supabaseServiceKey ? '設定済み (' + supabaseServiceKey.substring(0, 10) + '...)' : '未設定'}`);
console.log(`  - 環境: ${process.env.NODE_ENV || 'production'}`);
console.log('');

if (!openaiApiKey) {
  console.error('環境変数 OPENAI_API_KEY を設定してください');
  process.exit(1);
}

// Service Role Keyを使用してAdminクライアントを作成
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    fetch: async (url, options = {}) => {
      // カスタムfetch関数でタイムアウトとエラーハンドリングを改善
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒タイムアウト

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        // HTMLレスポンスを検出
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html') && !response.ok) {
          const text = await response.text();
          console.error('❌ HTMLレスポンス検出:');
          console.error(`  - Status: ${response.status} ${response.statusText}`);
          console.error(`  - URL: ${url}`);
          console.error(`  - Content preview: ${text.substring(0, 200)}...`);
          throw new Error(`Supabase APIがHTMLを返しました (Status: ${response.status})`);
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.error('❌ リクエストタイムアウト:', url);
          throw new Error('Request timeout after 60 seconds');
        }
        throw error;
      }
    }
  }
});
const openai = new OpenAI({ apiKey: openaiApiKey });

// 並列実行制御用の変数
const CONCURRENT_UPLOAD_LIMIT = 1; // 同時アップロード数を制限（3→5に増加）
let currentUploads = 0;

/**
 * Slackにエラー通知を送信する関数
 */
async function sendSlackErrorNotification(message) {
  if (!slackWebhookUrl) {
    console.log('⚠️ SLACK_WEBHOOK_URLが設定されていないため、Slack通知をスキップします');
    return;
  }

  try {
    const payload = {
      attachments: [{
        color: '#dc3545', // 赤色
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: ':x: *Showgeki2 Video Processing Error*'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Environment: ${process.env.NODE_ENV || 'production'} | Time: ${new Date().toISOString()}`
              }
            ]
          }
        ]
      }]
    };

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }

    console.log('✅ Slackエラー通知を送信しました');
  } catch (error) {
    console.error('❌ Slack通知の送信に失敗しました:', error.message);
  }
}

// 動作モード設定
const WATCH_MODE = process.env.WATCH_MODE === 'true'; // ローカルポーリング用

// ポーリング設定（WATCH_MODEの時のみ使用）
const POLLING_INTERVAL = 5000; // 5秒

// 環境に応じたパス設定
const WORK_DIR = process.env.NODE_ENV === 'development'
  ? '/app/mulmocast-cli'
  : '/app/mulmocast-cli';

// Create unique paths for each request to avoid conflicts
function createUniquePaths(videoId) {
  const uniqueDir = path.join(WORK_DIR, 'temp', videoId);
  return {
    tempDir: uniqueDir,
    scriptPath: path.join(uniqueDir, 'script.json'),
    outputPath: path.join(uniqueDir, 'output.mp4')
  };
}

function writeScriptJson(jsonContent, scriptPath) {
  try {
    console.log('script.jsonに書き込み中...');
    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(scriptPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(scriptPath, jsonContent, 'utf8');
    console.log(`✅ ${scriptPath} に書き込み完了`);
  } catch (error) {
    throw new Error(`ファイル書き込みエラー: ${error.message}`);
  }
}

function generateMovie(scriptPath, outputPath, hasCaption = false) {
  try {
    console.log('mulmocast-cliで動画生成中...');
    console.log('🎬 実際のmulmocast-cliで動画生成を開始...');

    // mulmocast-cliが存在するかチェック
    const mulmocastPath = '/app/mulmocast-cli';
    if (!fs.existsSync(path.join(mulmocastPath, 'package.json'))) {
      throw new Error('mulmocast-cli が見つかりません');
    }

    // 出力ディレクトリを確保 (Video IDごとのユニークディレクトリ)
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // システム情報をログ出力
    console.log('📊 システム情報:');
    console.log(`  - Node.js: ${process.version}`);
    console.log(`  - Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`);
    console.log(`  - Working Directory: ${process.cwd()}`);
    console.log(`  - Mulmocast Path: ${mulmocastPath}`);
    console.log(`  - Script Path: ${scriptPath}`);
    console.log(`  - Output Path: ${outputPath}`);
    console.log(`  - Unique Output Dir: ${outputDir}`);

    // ディスク容量チェック
    try {
      const { execSync: exec } = require('child_process');
      const dfOutput = exec('df -h /app', { encoding: 'utf8' });
      console.log('  - Disk Usage:', dfOutput.split('\n')[1]);
    } catch (dfError) {
      console.log('  - Disk Usage: Could not check');
    }

    try {
      // 相対パスでスクリプトと出力ディレクトリを指定 (mulmocast-cliから見た相対パス)
      const relativeScriptPath = path.relative(mulmocastPath, scriptPath);
      const relativeOutputDir = path.relative(mulmocastPath, outputDir);
      const command = `yarn movie "${relativeScriptPath}" -f -o "${relativeOutputDir}"`;
      console.log(`実行コマンド: ${command}`);
      console.log('🚀 mulmocast-cli 実行開始...');

      const startTime = Date.now();

      // メトリクス初期化
      const metrics = {
        imageGenerationTime: 0,
        audioGenerationTime: 0,
        videoProcessingTime: 0,
        totalTime: 0,
        beatCount: 0,
        details: {
          imagePhaseStart: null,
          audioPhaseStart: null,
          videoPhaseStart: null
        }
      };

      // 元のシンプルな方法に戻す
      console.log('📝 mulmocast-cli 実行中...');

      // リアルタイム表示のため stdio: 'inherit' を使用
      execSync(command, {
        cwd: mulmocastPath,
        stdio: 'inherit',
        timeout: 600000, // 10分タイムアウト
        maxBuffer: 1024 * 1024 * 10
      });

      const executionTime = Date.now() - startTime;
      metrics.totalTime = Math.round(executionTime / 1000);

      // mulmocast-cliのログパターンから推定
      // 通常、画像生成が全体の60-70%、音声生成が20-25%、動画処理が10-15%
      metrics.imageGenerationTime = Math.round(metrics.totalTime * 0.65);
      metrics.audioGenerationTime = Math.round(metrics.totalTime * 0.20);
      metrics.videoProcessingTime = Math.round(metrics.totalTime * 0.15);

      console.log(`⏱️ mulmocast-cli 実行完了: ${metrics.totalTime}秒`);

      // mulmocast-cliの出力パスを確認 (ユニークディレクトリ内)
      const actualOutputPaths = [
        path.join(outputDir, 'script.mp4'), // mulmocast-cliの実際の出力名（字幕なし）
        outputPath // 期待するパス
      ];
      
      // 字幕ありの場合は、言語別のファイル名も確認
      if (hasCaption) {
        actualOutputPaths.unshift(path.join(outputDir, 'script__ja.mp4')); // 日本語字幕ありのファイル名
      }

      let foundOutputPath = null;
      for (const checkPath of actualOutputPaths) {
        if (fs.existsSync(checkPath)) {
          foundOutputPath = checkPath;
          console.log(`✅ 動画ファイル発見: ${checkPath}`);
          break;
        }
      }

      if (foundOutputPath) {
        // ファイルが既に正しい場所にある場合はコピー不要
        if (foundOutputPath !== outputPath) {
          fs.copyFileSync(foundOutputPath, outputPath);
          fs.unlinkSync(foundOutputPath); // 元ファイルを削除
        }
        console.log('✅ 動画生成完了');
        return {
          videoPath: outputPath,
          metrics: metrics
        };
      } else {
        console.error('❌ 動画ファイルが見つかりません。確認した場所:');
        actualOutputPaths.forEach(checkPath => {
          console.error(`  - ${checkPath}: ${fs.existsSync(checkPath) ? '存在' : '存在しない'}`);
        });
        throw new Error(`出力動画ファイルが見つかりません`);
      }

    } catch (execError) {
      console.error('mulmocast-cli実行エラー:', execError.message);
      throw execError; // フォールバック処理を削除し、エラーを上位に伝播
    }

  } catch (error) {
    throw new Error(`動画生成エラー: ${error.message}`);
  }
}

/**
 * Upload video to Supabase Storage with retry logic
 */
async function uploadVideoToSupabase(videoPath, videoId, retryCount = 0) {
  const MAX_RETRIES = 3;
  const BASE_RETRY_DELAY = 2000; // 2秒

  // 同時アップロード数を制限
  while (currentUploads >= CONCURRENT_UPLOAD_LIMIT) {
    console.log(`🚀 現在${currentUploads}件のアップロードが進行中。待機中!!!!!!!!!!!!!!!!!`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  currentUploads++;
  console.log(`📤 アップロード開始 (同時実行数: ${currentUploads}/${CONCURRENT_UPLOAD_LIMIT})`);

  try {
    console.log('動画をSupabase Storageにアップロード中...');

    // ファイルの存在確認とサイズ確認
    if (!fs.existsSync(videoPath)) {
      throw new Error(`動画ファイルが存在しません: ${videoPath}`);
    }

    const stats = fs.statSync(videoPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`📁 動画ファイル: ${videoPath}`);
    console.log(`📏 ファイルサイズ: ${fileSizeMB.toFixed(2)} MB`);

    // Read video file
    const videoBuffer = fs.readFileSync(videoPath);
    const fileName = `${videoId}.mp4`;
    const filePath = `videos/${fileName}`;

    console.log(`📤 アップロード先: ${filePath}`);
    console.log(`🔑 Supabase URL: ${supabaseUrl}`);


    // Upload to Supabase Storage
    console.log('📡 Storage APIを呼び出し中...');
    console.log(`  - エンドポイント: ${supabaseUrl}/storage/v1/object/videos/${filePath}`);
    console.log(`  - メソッド: POST`);
    console.log(`  - Content-Type: video/mp4`);
    console.log(`  - ファイルサイズ: ${videoBuffer.length} bytes (${fileSizeMB.toFixed(2)} MB)`);
    console.log(`  - リトライ回数: ${retryCount}/${MAX_RETRIES}`);
    console.log(`  - タイムスタンプ: ${new Date().toISOString()}`);

    let uploadResponse;
    try {

      uploadResponse = await supabase.storage
        .from('videos')
        .upload(filePath, videoBuffer, {
          contentType: 'video/mp4',
          upsert: false,
        });
    } catch (uploadError) {
      console.error('❌ アップロード中にエクセプション発生:', uploadError);
      if (uploadError.message && uploadError.message.includes('Unexpected token')) {
        console.error('🌐 レスポンスがHTMLの可能性があります。');
        console.error('🔍 チェックポイント:');
        console.error('  1. SUPABASE_URLが正しいプロジェクトURLか確認');
        console.error('  2. SUPABASE_SERVICE_KEYがService Role Keyであるか確認');
        console.error('  3. ネットワーク接続を確認');
        console.error('  4. 並列実行によるAPIレート制限');
        console.error('  5. 一時的なネットワークエラー（503等）');

        // HTMLレスポンスの可能性が高いため、自動リトライ
        if (retryCount < MAX_RETRIES) {
          const retryDelay = BASE_RETRY_DELAY * Math.pow(2, retryCount); // エクスポネンシャルバックオフ
          console.log(`⏳ HTMLレスポンスのため、${retryDelay}ms後に自動リトライします...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return uploadVideoToSupabase(videoPath, videoId, retryCount + 1);
        }
      }
      throw uploadError;
    }

    const { data, error } = uploadResponse;

    if (error) {
      console.error('❌ Supabase Storage エラー詳細:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
        hint: error.hint,
        timestamp: new Date().toISOString()
      });


      // エラーメッセージをより詳細に
      const errorDetail = error.statusCode ?
        `Supabase upload failed (${error.statusCode}): ${error.message}` :
        `Supabase upload failed: ${error.message}`;
      throw new Error(errorDetail);
    }

    // データが返ってきた場合はログ出力
    if (data) {
      console.log('✅ アップロード成功:', {
        path: data.path,
        id: data.id,
        fullPath: data.fullPath
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    console.log('✅ 動画アップロード完了');
    console.log(`🔗 動画URL: ${urlData.publicUrl}`);

    currentUploads--; // 成功時にカウントを減らす
    console.log(`📥 アップロード完了 (同時実行数: ${currentUploads}/${CONCURRENT_UPLOAD_LIMIT})`);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`❌ アップロード関数内エラー (リトライ ${retryCount}/${MAX_RETRIES}):`, error);

    // エラーがSyntaxErrorの場合は追加情報を記録
    if (error instanceof SyntaxError || (error.message && error.message.includes('Unexpected token'))) {
      console.error('🔍 JSONパースエラーが発生しました。レスポンスがHTMLの可能性があります。');

      // リトライ可能かチェック
      if (retryCount < MAX_RETRIES) {
        currentUploads--; // リトライ前にカウントを減らす
        const retryDelay = BASE_RETRY_DELAY * Math.pow(2, retryCount); // エクスポネンシャルバックオフ
        console.log(`⏳ ${retryDelay}ms後にリトライします...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return uploadVideoToSupabase(videoPath, videoId, retryCount + 1);
      }
    }

    // ネットワークエラーの場合もリトライ
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      if (retryCount < MAX_RETRIES) {
        currentUploads--; // リトライ前にカウントを減らす
        const retryDelay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`🌐 ネットワークエラー。${retryDelay}ms後にリトライします...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return uploadVideoToSupabase(videoPath, videoId, retryCount + 1);
      }
    }

    currentUploads--; // エラー時にカウントを減らす
    throw new Error(`動画アップロードエラー: ${error.message}`);
  }
}

async function processVideoGeneration(payload) {
  const { video_id, story_id, uid, title, text_raw, script_json } = payload;
  let uniquePaths = null;
  const processingStartTime = Date.now(); // 処理開始時刻を記録

  try {

    console.log(`🚀 動画生成処理を開始します... (モード: ${WATCH_MODE ? 'WATCH' : 'CLOUD_RUN'})`);
    console.log('🔍 受信ペイロード:', JSON.stringify(payload, null, 2));
    console.log(`📹 動画ID: ${video_id} (型: ${typeof video_id}, 長さ: ${video_id ? video_id.length : 'N/A'})`);
    console.log(`📝 ストーリーID: ${story_id}`);
    console.log(`👤 UID: ${uid}`);
    console.log(`📄 タイトル: ${title}`);
    console.log(`⏰ 処理開始時刻: ${new Date(processingStartTime).toISOString()}`);
    console.log('');

    // UUID形式チェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(video_id)) {
      throw new Error(`無効なvideo_id形式: "${video_id}" - UUID形式である必要があります`);
    }
    if (!uuidRegex.test(story_id)) {
      throw new Error(`無効なstory_id形式: "${story_id}" - UUID形式である必要があります`);
    }

    // Create unique paths for this request to avoid conflicts
    uniquePaths = createUniquePaths(video_id);
    console.log(`🗂️ ユニーク作業ディレクトリ: ${uniquePaths.tempDir}`);

    // ステータスをprocessingに更新
    const { error: statusUpdateError } = await supabase
      .from('videos')
      .update({
        status: 'processing'
      })
      .eq('id', video_id)
      .eq('uid', uid);

    if (statusUpdateError) {
      console.error('❌ ステータス更新エラー:', statusUpdateError);
      throw new Error(`ステータス更新失敗: ${statusUpdateError.message}`);
    } else {
      console.log('✅ ステータス更新成功: processing');
    }

    let jsonContent;

    // Check if script_json already exists - REQUIRED
    if (script_json && typeof script_json === 'object') {
      console.log('2. 既存のスクリプトを使用...');

      // クレジットbeatを最後に追加
      const scriptWithCredit = { ...script_json };
      if (Array.isArray(scriptWithCredit.beats)) {
        // speechParamsから最初のspeakerを取得
        let creditSpeaker = "";
        if (scriptWithCredit.speechParams && scriptWithCredit.speechParams.speakers) {
          const speakerNames = Object.keys(scriptWithCredit.speechParams.speakers);
          if (speakerNames.length > 0) {
            creditSpeaker = speakerNames[0]; // 最初のspeakerを使用
          }
        }

        // もしspeakerが見つからない場合は、beatsから最初のspeakerを探す
        if (!creditSpeaker && scriptWithCredit.beats.length > 0) {
          creditSpeaker = scriptWithCredit.beats[0].speaker || "";
        }

        const creditBeat = {
          "speaker": creditSpeaker,
          "text": "",
          "duration": 1,
          "image": {
            "type": "image",
            "source": {
              "kind": "url",
              "url": "https://showgeki2-git-main-tobe-tokyo.vercel.app/TSAS_credit.png"
            }
          }
        };

        scriptWithCredit.beats.push(creditBeat);
        console.log(`✅ クレジットbeat追加完了 (speaker: ${creditSpeaker})`);
      }

      jsonContent = JSON.stringify(scriptWithCredit, null, 2);
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

    // 動画生成処理実行
    console.log('🎬 動画生成処理実行中...');

    // 3. script.jsonに書き込み (ユニークなパス)
    console.log('3. script.jsonファイルに書き込み中...');
    writeScriptJson(jsonContent, uniquePaths.scriptPath);
    console.log('');

    // 4. mulmocast-cliで動画生成 (ユニークなパス)
    console.log('4. mulmocast-cliで動画生成中...');
    let videoPath;
    let movieMetrics = null; // Initialize outside try block
    try {
      // captionParamsの有無を確認
      const hasCaption = !!(script_json && script_json.captionParams);
      const result = generateMovie(uniquePaths.scriptPath, uniquePaths.outputPath, hasCaption);
      videoPath = result.videoPath;
      movieMetrics = result.metrics;
      console.log('\n📊 動画生成メトリクス:');
      console.log(`  - 画像生成時間: ${movieMetrics.imageGenerationTime}秒`);
      console.log(`  - 音声生成時間: ${movieMetrics.audioGenerationTime}秒`);
      console.log(`  - 動画合成時間: ${movieMetrics.videoProcessingTime}秒`);
      console.log(`  - 合計時間: ${movieMetrics.totalTime}秒`);
      console.log('');
    } catch (movieError) {
      console.error('❌ 動画生成に失敗しました:', movieError.message);
      throw new Error(`動画生成失敗: ${movieError.message}`);
    }

    // 5. 動画をSupabase Storageにアップロード
    console.log('5. 動画をSupabase Storageにアップロード中...');
    const videoUrl = await uploadVideoToSupabase(videoPath, video_id);
    console.log('');

    // 6. Get video file stats and metadata
    const stats = fs.statSync(videoPath);
    const videoSizeMB = stats.size / (1024 * 1024);

    // Get video metadata using ffprobe
    let duration = 30; // Default fallback
    let resolution = '1920x1080'; // Default fallback

    try {
      const ffprobeCommand = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of json "${videoPath}"`;
      const ffprobeOutput = execSync(ffprobeCommand, { encoding: 'utf8' });
      const metadata = JSON.parse(ffprobeOutput);

      if (metadata.streams && metadata.streams.length > 0) {
        const stream = metadata.streams[0];
        if (stream.width && stream.height) {
          resolution = `${stream.width}x${stream.height}`;
        }
        if (stream.duration) {
          duration = Math.round(parseFloat(stream.duration));
        }
      }

      console.log(`📊 動画メタデータ: 解像度=${resolution}, 再生時間=${duration}秒`);
    } catch (metadataError) {
      console.warn('⚠️ 動画メタデータの取得に失敗しました（デフォルト値を使用）:', metadataError.message);
    }

    // 7. Update video record with completion
    const processingEndTime = Date.now();
    const processingTimeSeconds = Math.round((processingEndTime - processingStartTime) / 1000);

    console.log(`⏱️ 総処理時間: ${processingTimeSeconds}秒`);

    // メトリクスのサマリーをログに記録
    console.log('\n📊 詳細処理時間:');
    console.log(`  - 画像生成: ${movieMetrics.imageGenerationTime.toFixed(1)}秒 (${(movieMetrics.imageGenerationTime / processingTimeSeconds * 100).toFixed(1)}%)`);
    console.log(`  - 音声生成: ${movieMetrics.audioGenerationTime.toFixed(1)}秒 (${(movieMetrics.audioGenerationTime / processingTimeSeconds * 100).toFixed(1)}%)`);
    console.log(`  - 動画合成: ${movieMetrics.videoProcessingTime.toFixed(1)}秒 (${(movieMetrics.videoProcessingTime / processingTimeSeconds * 100).toFixed(1)}%)`);
    console.log(`  - その他（アップロード等）: ${(processingTimeSeconds - movieMetrics.totalTime).toFixed(1)}秒`);
    console.log('');

    const { error: updateError } = await supabase
      .from('videos')
      .update({
        status: 'completed',
        url: videoUrl,
        duration_sec: duration, // Actual duration from video
        resolution: resolution, // Actual resolution from video
        size_mb: Number(videoSizeMB.toFixed(2)),
        proc_time: processingTimeSeconds, // 処理時間を記録
        error_msg: null // エラーログをクリア
        // TODO: 将来的に以下のカラムを追加して個別メトリクスを保存
        // image_gen_time: movieMetrics.imageGenerationTime,
        // audio_gen_time: movieMetrics.audioGenerationTime,
        // video_proc_time: movieMetrics.videoProcessingTime
      })
      .eq('id', video_id)
      .eq('uid', uid);

    if (updateError) {
      console.error('❌ 動画完了更新エラー:', updateError);
      throw new Error(`動画レコード更新エラー: ${updateError.message}`);
    } else {
      console.log('✅ 動画完了更新成功: completed');
    }

    // 8. Update story status to completed
    const { error: storyUpdateError } = await supabase
      .from('stories')
      .update({ status: 'completed' })
      .eq('id', story_id)
      .eq('uid', uid);

    if (storyUpdateError) {
      console.error('❌ ストーリー完了更新エラー:', storyUpdateError);
    } else {
      console.log('✅ ストーリー完了更新成功: completed');
    }

    console.log('🎉 処理が完了しました！');
    console.log(`📹 動画ID ${video_id} の動画が完成し、アップロードされました。`);
    console.log(`🔗 動画URL: ${videoUrl}`);
    console.log(`⏱️ 総処理時間: ${processingTimeSeconds}秒`);
    console.log('');

    return true; // 処理完了

  } catch (error) {
    console.error('❌ 処理中にエラーが発生しました:', error.message);

    // エラーが発生してもメトリクスが存在する場合は表示
    if (movieMetrics) {
      console.log('\n📊 エラー前の処理メトリクス:');
      console.log(`  - 画像生成: ${movieMetrics.imageGenerationTime.toFixed(1)}秒`);
      console.log(`  - 音声生成: ${movieMetrics.audioGenerationTime.toFixed(1)}秒`);
      console.log(`  - 動画合成: ${movieMetrics.videoProcessingTime.toFixed(1)}秒`);
      console.log(`  - mulmocast-cli合計: ${movieMetrics.totalTime}秒`);
      console.log('');
    }

    // Update video status to failed
    if (video_id && uid) {
      const { error: failedUpdateError } = await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_msg: error.message
        })
        .eq('id', video_id)
        .eq('uid', uid);

      if (failedUpdateError) {
        console.error('❌ 失敗ステータス更新エラー:', failedUpdateError);
      } else {
        console.log('✅ 失敗ステータス更新成功: failed');
      }
    }

    // Slack通知を送信
    const errorMessage = [
      `*エラーが発生しました* :warning:`,
      ``,
      `*Video ID:* ${video_id || 'N/A'}`,
      `*Story ID:* ${story_id || 'N/A'}`,
      `*Title:* ${title || 'N/A'}`,
      `*Error:* ${error.message}`,
      `*Timestamp:* ${new Date().toISOString()}`,
      `*Environment:* ${process.env.NODE_ENV || 'production'}`,
      ``,
      `*Stack Trace:*`,
      `\`\`\`${error.stack || 'No stack trace available'}\`\`\``
    ].join('\n');

    await sendSlackErrorNotification(errorMessage);

    return false; // エラーのため処理失敗
  } finally {
    // Clean up temporary files and directories
    if (uniquePaths && uniquePaths.tempDir) {
      try {
        console.log('🧹 一時ファイルをクリーンアップ中...');
        if (fs.existsSync(uniquePaths.tempDir)) {
          // Recursively remove temporary directory
          fs.rmSync(uniquePaths.tempDir, { recursive: true, force: true });
          console.log(`✅ 一時ディレクトリを削除: ${uniquePaths.tempDir}`);
        }
      } catch (cleanupError) {
        console.error('⚠️ クリーンアップエラー:', cleanupError.message);
        // Don't throw error for cleanup failure
      }
    }
  }
}

/**
 * DBポーリングでキューの動画を処理（WATCH_MODEのみ）
 */
async function pollForQueuedVideos() {
  if (!WATCH_MODE) {
    return; // WATCH_MODE無効時はスキップ
  }

  try {
    // queued状態の動画を取得（最古の1件のみ）
    const { data: queuedVideos, error } = await supabase
      .from('videos')
      .select(`
        id,
        story_id,
        uid,
        created_at,
        stories!inner (
          id,
          title,
          text_raw,
          script_json
        )
      `)
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('❌ キュー取得エラー:', error.message);
      return;
    }

    if (queuedVideos && queuedVideos.length > 0) {
      const video = queuedVideos[0];
      console.log(`📋 ポーリング検出: ${video.id} を処理開始`);

      // 処理前にステータス確認（他のプロセスが処理済みかチェック）
      const { data: currentVideo, error: checkError } = await supabase
        .from('videos')
        .select('status')
        .eq('id', video.id)
        .single();

      if (checkError || !currentVideo || currentVideo.status !== 'queued') {
        console.log(`⏭️ スキップ: ${video.id} (既に処理済みまたはエラー)`);
        return;
      }

      console.log(`🚀 ポーリング処理開始: ${video.id}`);

      // 既存のprocessVideoGeneration関数を呼び出し
      const payload = {
        video_id: video.id,
        story_id: video.story_id,
        uid: video.uid,
        title: video.stories.title,
        text_raw: video.stories.text_raw,
        script_json: video.stories.script_json
      };

      await processVideoGeneration(payload);
    }

  } catch (error) {
    console.error('❌ ポーリング処理エラー:', error.message);
  }
}

/**
 * スリープ関数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 継続的ポーリング（WATCH_MODEのみ）
 */
async function continuousPolling() {
  if (!WATCH_MODE) {
    return;
  }

  console.log('🔄 継続的ポーリング開始...');
  console.log(`📊 ポーリング間隔: ${POLLING_INTERVAL}ms`);

  while (true) {
    try {
      await pollForQueuedVideos(); // 処理実行
    } catch (error) {
      console.error('❌ ポーリング実行エラー:', error.message);
    }

    await sleep(POLLING_INTERVAL); // 処理完了後にスリープ
  }
}

/**
 * ポーリングを開始（WATCH_MODEのみ）
 */
function startPolling() {
  if (!WATCH_MODE) {
    return;
  }

  // 継続的ポーリングを開始（非同期）
  continuousPolling().catch(error => {
    console.error('❌ 継続的ポーリングエラー:', error.message);
  });
}

// リクエスト数のトラッキング（レート制限用）
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 1; // Cloud Runのconcurrency=1設定に合わせる

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
    if (WATCH_MODE) {
      // WATCHモードではwebhook無視
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'WATCH mode - webhook ignored' }));
      return;
    }

    // レート制限チェック
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
      console.log(`⚠️ レート制限: アクティブリクエスト数 ${activeRequests}/${MAX_CONCURRENT_REQUESTS}`);
      
      // 429エラーを返す前に、リクエストボディをパースしてvideo_idを取得
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          if (payload.type === 'video_generation' && payload.payload?.video_id && payload.payload?.uid) {
            // ビデオステータスをfailedに更新
            console.log(`❌ レート制限によりvideo ${payload.payload.video_id} をfailedに更新`);
            await supabase
              .from('videos')
              .update({
                status: 'failed',
                error_msg: 'Rate limit exceeded (429) - too many concurrent requests'
              })
              .eq('id', payload.payload.video_id)
              .eq('uid', payload.payload.uid);
          }
        } catch (error) {
          console.error('❌ レート制限時のステータス更新エラー:', error);
        }
        
        // 429 Rate Limit Exceededを返す
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Rate limit exceeded - too many concurrent requests',
          activeRequests: activeRequests,
          maxRequests: MAX_CONCURRENT_REQUESTS
        }));
      });
      
      return;
    }

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

          // 処理完了まで待機（同期的に処理）
          console.log('📝 動画生成処理を同期的に実行します...');
          
          // アクティブリクエスト数を増やす
          activeRequests++;
          console.log(`📊 アクティブリクエスト数: ${activeRequests}/${MAX_CONCURRENT_REQUESTS}`);
          
          try {
            const result = await processVideoGeneration(requestData);
            
            // 処理成功
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Video generation completed',
              video_id: requestData.video_id,
              completed: result
            }));
          } catch (error) {
            console.error('❌ 動画生成処理でエラー:', error.message);
            console.error('❌ エラースタック:', error.stack);

            // エラーを動画レコードに記録
            if (requestData.video_id && requestData.uid) {
              try {
                await supabase
                  .from('videos')
                  .update({
                    status: 'failed',
                    error_msg: `処理エラー: ${error.message}`
                  })
                  .eq('id', requestData.video_id)
                  .eq('uid', requestData.uid);
                console.log('❌ 動画ステータスをfailedに更新');
              } catch (updateError) {
                console.error('❌ ステータス更新エラー:', updateError.message);
              }
            }
            
            // エラーレスポンス
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'Video generation failed',
              error: error.message,
              video_id: requestData.video_id
            }));
          } finally {
            // アクティブリクエスト数を減らす
            activeRequests--;
            console.log(`📊 アクティブリクエスト数: ${activeRequests}/${MAX_CONCURRENT_REQUESTS}`);
          }
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
  console.log(`🚀 Webhook server listening on port ${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`📥 Webhook endpoint: http://localhost:${port}/webhook`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Mode: ${WATCH_MODE ? 'WATCH (内蔵ポーリング)' : 'CLOUD_RUN (直接処理)'}`);
  console.log(`📷 OpenAI Image Quality: ${process.env.OPENAI_IMAGE_QUALITY_DEFAULT || 'medium'}`);
  console.log('');
  if (WATCH_MODE) {
    console.log('📋 WATCHモード有効:');
    console.log('  - Webhook無視（ポーリングのみ）');
    console.log('  - DBポーリングで動画生成実行');
    console.log('  - 処理は同一コンテナ内で完結');

    // WATCHモードの場合、ポーリングを開始
    startPolling();
  } else {
    console.log('📋 Cloud Runモード:');
    console.log('  - Webhookで直接動画生成実行');
    console.log('  - 並列処理対応（unique paths）');
  }
});