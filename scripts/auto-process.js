#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

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

const MULMOCAST_PATH = '/Users/takuo/source/mulmocast-cli';
const SCHOOL_JSON_PATH = path.join(MULMOCAST_PATH, 'scripts', 'school.json');
const OUTPUT_VIDEO_PATH = path.join(MULMOCAST_PATH, 'output', 'school.mp4');

async function getOldestPendingStory() {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('is_completed', false)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      throw new Error(`ストーリーの取得エラー: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('データベースアクセスエラー:', error.message);
    throw error;
  }
}

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
    fs.writeFileSync(SCHOOL_JSON_PATH, jsonContent, 'utf8');
    console.log(`✅ ${SCHOOL_JSON_PATH} に書き込み完了`);
  } catch (error) {
    throw new Error(`ファイル書き込みエラー: ${error.message}`);
  }
}

function generateMovie() {
  try {
    console.log('mulmocast-cliで動画生成中...');
    const command = 'yarn movie scripts/school.json -f';

    execSync(command, {
      cwd: MULMOCAST_PATH,
      stdio: 'inherit'
    });

    console.log('✅ 動画生成完了');

    // 出力ファイルの存在確認
    if (!fs.existsSync(OUTPUT_VIDEO_PATH)) {
      throw new Error(`出力動画ファイルが見つかりません: ${OUTPUT_VIDEO_PATH}`);
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

async function processOneStory() {
  try {
    // 1. 最も古い未完了ストーリーを取得
    const story = await getOldestPendingStory();

    if (!story) {
      return false; // 未完了の依頼なし
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
    console.log('⏭️  次の依頼の監視を続行します...');
    console.log('');
    return false; // エラーのため処理失敗
  }
}

async function watchMode() {
  console.log('👁️  自動監視モードを開始します...');
  console.log('⏰ 5秒間隔でデータベースを監視します');
  console.log('🛑 終了するには Ctrl+C を押してください');
  console.log('');

  let processedCount = 0;

  while (true) {
    try {
      const processed = await processOneStory();

      if (processed) {
        processedCount++;
        console.log(`📊 これまでに処理した依頼数: ${processedCount}`);
        console.log('');
      } else {
        // 未完了の依頼がない場合は静かに待機
        process.stdout.write('⏳ 監視中... ');
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        console.log(`(${timestamp})`);
      }

      // 5秒待機
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.error('⚠️  監視中にエラーが発生しました:', error.message);
      console.log('🔄 5秒後に監視を再開します...');
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function oneTimeMode() {
  try {
    console.log('🚀 単発処理を開始します...');
    console.log('');

    const processed = await processOneStory();

    if (!processed) {
      console.log('✅ 未完了の依頼はありません');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// コマンドライン引数の処理
const args = process.argv.slice(2);
const watchFlag = args.includes('--watch') || args.includes('-w');

// Ctrl+Cでの終了処理
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 処理を停止します...');
  process.exit(0);
});

// メイン処理実行
if (watchFlag) {
  watchMode();
} else {
  oneTimeMode();
}