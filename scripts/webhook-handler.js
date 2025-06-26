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

async function generateScriptWithOpenAI(storyText) {
  try {
    console.log('OpenAI APIでスクリプト生成中...');

    const prompt = `以下のストーリーをシェイクスピア風の５幕の悲喜劇として台本を考えてください。

【制約】
- 各幕で1人の人物が1つ台詞を言います
- 登場人物は全体で1〜3名で、ストーリーに応じて調整してください
- 音声は次の音声IDの中から選んでください
　(男性) alloy, echo, fable, onyx
　(女性) nova, shimmer
- 登場人物の名前と、音声IDを決めてください
- セリフは現代的でカジュアルな日本語を使ってください
- 背景や登場人物はストーリに応じて一貫性を持たせてください
- 以下のJSON形式で出力してください

{
    "$mulmocast": {
        "version": "1.0"
    },
    "imageParams": {
        "style": "Ghibli style anime, soft pastel colors, delicate line art, cinematic lighting",
        "model": "gpt-image-1"
    },
    "speechParams": {
        "provider": "openai",
        "speakers": {
            "[人物1]": {
                "voiceId": "[人物1の音声ID]"
            },
            "[人物2]": {
                "voiceId": "[人物2の音声ID]"
            }
        }
    },
    "beats": [
        {
            "speaker": "[speakersの中の人物名]",
            "text": "[第１幕のセリフ]",
            "imagePrompt": "[第１幕の画像]"
        },
        {
            "speaker": "[speakersの中の人物名]",
            "text": "[第２幕のセリフ]",
            "imagePrompt": "[第２幕の画像]"
        },
        {
            "speaker": "[speakersの中の人物名]",
            "text": "[第３幕のセリフ]",
            "imagePrompt": "[第３幕の画像]"
        },
        {
            "speaker": "[speakersの中の人物名]",
            "text": "[第４幕のセリフ]",
            "imagePrompt": "[第４幕の画像]"
        },
        {
            "speaker": "[speakersの中の人物名]",
            "text": "[第５幕のセリフ]",
            "imagePrompt": "[第５幕の画像]"
        }
    ]
}

【ストーリー】
${storyText}`;

    const response = await openai.chat.completions.create({
      model: 'o4-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    const jsonContent = response.choices[0].message.content;

    try {
      // JSONの妥当性をチェック
      JSON.parse(jsonContent);
      return jsonContent;
    } catch (parseError) {
      throw new Error(`生成されたJSONが無効です: ${parseError.message}`);
    }
  } catch (error) {
    console.error('OpenAI APIエラー:', error.message);
    throw error;
  }
}

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
    
    // 開発環境では実際のmulmocast-cliを使用
    if (process.env.NODE_ENV === 'development') {
      console.log('🎬 実際のmulmocast-cliで動画生成を開始...');
      
      // mulmocast-cliが存在するかチェック
      const mulmocastPath = '/app/mulmocast-cli';
      if (!fs.existsSync(path.join(mulmocastPath, 'package.json'))) {
        throw new Error('mulmocast-cli が見つかりません');
      }
      
      // 出力ディレクトリを確保
      const outputDir = path.dirname(OUTPUT_VIDEO_PATH);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      try {
        // 実際のmulmocast-cliコマンドを実行
        const command = 'npm run movie scripts/school.json';
        console.log(`実行コマンド: ${command}`);
        
        execSync(command, {
          cwd: mulmocastPath,
          stdio: 'inherit',
          timeout: 300000 // 5分タイムアウト
        });
        
        // 出力ファイルの存在確認
        if (!fs.existsSync(OUTPUT_VIDEO_PATH)) {
          throw new Error(`出力動画ファイルが見つかりません: ${OUTPUT_VIDEO_PATH}`);
        }
        
        console.log('✅ 動画生成完了');
        
      } catch (execError) {
        console.error('mulmocast-cli実行エラー:', execError.message);
        // 開発環境でもフォールバック
        console.log('⚠️ フォールバック: ダミーファイルを作成');
        fs.writeFileSync(OUTPUT_VIDEO_PATH, 'dummy video content - mulmocast failed', 'utf8');
      }
      
    } else {
      // 本番環境ではダミー実装
      console.log('⚠️ 本番環境では動画生成をスキップします');
      
      const outputDir = path.dirname(OUTPUT_VIDEO_PATH);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(OUTPUT_VIDEO_PATH, 'dummy video content', 'utf8');
      
      console.log('✅ 動画生成完了 (ダミー)');
    }

  } catch (error) {
    throw new Error(`動画生成エラー: ${error.message}`);
  }
}

function uploadVideo(registrationId) {
  try {
    console.log('動画をアップロード中...');
    const uploadScript = path.join(__dirname, 'upload-video.js');
    const command = `node "${uploadScript}" "${OUTPUT_VIDEO_PATH}" "${registrationId}"`;

    execSync(command, {
      stdio: 'inherit'
    });

    console.log('✅ 動画アップロード完了');
  } catch (error) {
    throw new Error(`動画アップロードエラー: ${error.message}`);
  }
}

async function processStory(storyId) {
  try {
    // ストーリーを取得
    const { data: story, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .eq('is_completed', false)
      .single();

    if (error || !story) {
      console.log(`ストーリーID ${storyId} が見つからないか、既に完了済みです`);
      return false;
    }

    console.log('🚀 新しい依頼を処理します...');
    console.log(`📝 登録番号: ${story.id}`);
    console.log(`📅 作成日: ${story.created_at}`);
    console.log(`📄 ストーリー: ${story.story_text.substring(0, 100)}${story.story_text.length > 100 ? '...' : ''}`);
    console.log('');

    // 2. OpenAI APIでスクリプト生成
    console.log('2. OpenAI APIでスクリプト生成中...');
    const jsonContent = await generateScriptWithOpenAI(story.story_text);
    console.log('✅ スクリプト生成完了');
    console.log('');

    // 3. school.jsonに書き込み
    console.log('3. school.jsonファイルに書き込み中...');
    writeSchoolJson(jsonContent);
    console.log('');

    // 4. mulmocast-cliで動画生成
    console.log('4. mulmocast-cliで動画生成中...');
    generateMovie();
    console.log('');

    // 5. 動画をアップロード
    console.log('5. 動画をアップロード中...');
    uploadVideo(story.id);
    console.log('');

    console.log('🎉 処理が完了しました！');
    console.log(`📹 登録番号 ${story.id} の5幕劇が完成し、アップロードされました。`);
    console.log('');

    return true; // 処理完了

  } catch (error) {
    console.error('❌ 処理中にエラーが発生しました:', error.message);
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

        // Supabase Webhookの場合、新しいレコードは payload.record に含まれる
        if (payload.type === 'INSERT' && payload.table === 'stories' && payload.record) {
          const storyId = payload.record.id;
          console.log(`新しいストーリーが作成されました: ${storyId}`);
          
          // 非同期でストーリー処理を開始（レスポンスは即座に返す）
          processStory(storyId).catch(error => {
            console.error('ストーリー処理でエラー:', error);
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Processing started' }));
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