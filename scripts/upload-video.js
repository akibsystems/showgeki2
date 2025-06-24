#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数 SUPABASE_URL と SUPABASE_SERVICE_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadVideo(videoFilePath, registrationId) {
  try {
    // ファイルの存在確認
    if (!fs.existsSync(videoFilePath)) {
      throw new Error(`動画ファイルが見つかりません: ${videoFilePath}`);
    }

    // 登録番号の検証
    if (!registrationId || registrationId.length !== 8) {
      throw new Error('登録番号は8桁のアルファベット大文字と数字で入力してください');
    }

    const uppercaseId = registrationId.toUpperCase();

    // ストーリーの存在確認
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .eq('id', uppercaseId)
      .single();

    if (storyError) {
      if (storyError.code === 'PGRST116') {
        throw new Error(`登録番号 ${uppercaseId} は見つかりませんでした`);
      }
      throw new Error(`ストーリーの取得エラー: ${storyError.message}`);
    }

    console.log(`ストーリーを確認しました: ${uppercaseId}`);
    console.log(`内容: ${story.story_text.substring(0, 100)}${story.story_text.length > 100 ? '...' : ''}`);

    // 動画ファイルの読み込み
    const fileBuffer = fs.readFileSync(videoFilePath);
    const fileName = `${uppercaseId}.mp4`;

    console.log('動画をアップロード中...');

    // Supabase Storageに動画をアップロード
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`動画のアップロードエラー: ${uploadError.message}`);
    }

    console.log('動画のアップロードが完了しました');

    // データベースの完了フラグを更新
    const videoUrl = `${supabaseUrl}/storage/v1/object/public/videos/${fileName}`;
    
    const { error: updateError } = await supabase
      .from('stories')
      .update({
        is_completed: true,
        video_url: videoUrl
      })
      .eq('id', uppercaseId);

    if (updateError) {
      throw new Error(`データベースの更新エラー: ${updateError.message}`);
    }

    console.log('✅ 処理が完了しました！');
    console.log(`登録番号: ${uppercaseId}`);
    console.log(`動画URL: ${videoUrl}`);
    console.log('ユーザーは視聴画面で動画を視聴・ダウンロードできます。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// コマンドライン引数の処理
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('使用方法:');
  console.log('node scripts/upload-video.js <動画ファイルパス> <登録番号>');
  console.log('');
  console.log('例:');
  console.log('node scripts/upload-video.js /path/to/video.mp4 ABC12345');
  console.log('');
  console.log('必要な環境変数:');
  console.log('- SUPABASE_URL: SupabaseプロジェクトのURL');
  console.log('- SUPABASE_SERVICE_KEY: Supabaseのサービスキー');
  process.exit(1);
}

const [videoFilePath, registrationId] = args;

// 動画アップロードの実行
uploadVideo(videoFilePath, registrationId);