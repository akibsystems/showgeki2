#!/usr/bin/env node

// 動画生成機能の単体テスト
// FFmpegと動画生成ライブラリの動作確認

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function testFFmpegAvailability() {
  console.log('🔧 FFmpeg の利用可能性をテスト中...');
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    let stdout = '';
    ffmpeg.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const version = stdout.split('\n')[0];
        console.log('✅ FFmpeg 利用可能:', version);
        resolve(true);
      } else {
        console.log('❌ FFmpeg が利用できません');
        reject(new Error('FFmpeg not available'));
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.log('❌ FFmpeg 実行エラー:', error.message);
      reject(error);
    });
  });
}

async function testSimpleVideoGeneration() {
  console.log('🎬 簡単な動画生成テスト中...');
  
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-test-'));
  const outputPath = path.join(tempDir, 'test.mp4');
  
  let videoResult;
  
  try {
    // Find available font file
    const fontPaths = [
      '/System/Library/Fonts/Arial.ttf',           // macOS
      '/System/Library/Fonts/Helvetica.ttc',      // macOS
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', // Linux
      '/Windows/Fonts/arial.ttf',                 // Windows
    ];
    
    let fontFile = '';
    for (const fontPath of fontPaths) {
      try {
        await fs.access(fontPath);
        fontFile = fontPath;
        break;
      } catch {
        continue;
      }
    }
    
    console.log('📝 使用フォント:', fontFile || 'デフォルト');
    
    videoResult = await new Promise((resolve, reject) => {
      const text = 'Test Video Generation';
      const resolution = '640x360';
      const duration = 5;
      const fps = 24;
      
      const ffmpegArgs = [
        '-f', 'lavfi',
        '-i', `color=#1a1a2e:size=${resolution}:duration=${duration}:rate=${fps}`,
        '-vf', fontFile 
          ? `drawtext=text='${text}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=${fontFile}`
          : `drawtext=text='${text}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=(h-text_h)/2`,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-y',
        outputPath,
      ];
      
      console.log('🔄 FFmpeg コマンド実行中...');
      console.log('ffmpeg', ffmpegArgs.join(' '));
      
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          try {
            const stats = await fs.stat(outputPath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            console.log('✅ 動画生成成功!');
            console.log(`📊 ファイルサイズ: ${sizeMB}MB`);
            console.log(`📁 出力パス: ${outputPath}`);
            
            resolve({
              path: outputPath,
              size: stats.size,
              sizeMB: parseFloat(sizeMB),
            });
          } catch (error) {
            reject(new Error(`File stat error: ${error.message}`));
          }
        } else {
          console.log('❌ FFmpeg エラー出力:', stderr);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
    
    return videoResult;
    
  } finally {
    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('🧹 一時ファイルクリーンアップ完了');
    } catch (error) {
      console.warn('⚠️  クリーンアップ警告:', error.message);
    }
  }
}

async function testSupabaseStorageConnection() {
  console.log('🗄️  Supabase ストレージ接続テスト中...');
  
  // Load environment variables
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Supabase 環境変数が設定されていません');
    return false;
  }
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test storage access
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('❌ Supabase ストレージエラー:', error.message);
      return false;
    }
    
    console.log('✅ Supabase ストレージ接続成功');
    console.log('📋 利用可能バケット:', data?.map(b => b.name).join(', '));
    
    // Check if videos bucket exists
    const videosBucket = data?.find(b => b.name === 'videos');
    if (videosBucket) {
      console.log('✅ videos バケットが存在します');
    } else {
      console.log('⚠️  videos バケットが存在しません（作成が必要）');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Supabase テストエラー:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 動画生成機能テストを開始...');
  console.log('');
  
  try {
    // Test 1: FFmpeg availability
    await testFFmpegAvailability();
    console.log('');
    
    // Test 2: Simple video generation
    const videoResult = await testSimpleVideoGeneration();
    console.log('');
    
    // Test 3: Supabase Storage connection
    const storageOk = await testSupabaseStorageConnection();
    console.log('');
    
    console.log('🎉 すべてのテストが完了しました!');
    console.log('');
    console.log('✅ FFmpeg: 利用可能');
    console.log(`✅ 動画生成: 成功 (${videoResult.sizeMB}MB)`);
    console.log(`${storageOk ? '✅' : '⚠️ '} Supabase Storage: ${storageOk ? '接続成功' : '要設定'}`);
    
    if (storageOk) {
      console.log('');
      console.log('🎬 実際の動画生成APIをテストする準備ができました!');
      console.log('💡 次のステップ:');
      console.log('   1. Supabase で videos バケットを作成');
      console.log('   2. npm run dev でサーバーを起動');
      console.log('   3. 動画生成APIをテスト');
    }
    
  } catch (error) {
    console.error('💥 テスト失敗:', error.message);
    console.log('');
    console.log('💡 トラブルシューティング:');
    console.log('1. FFmpeg がインストールされているか確認');
    console.log('   - macOS: brew install ffmpeg');
    console.log('   - Ubuntu: sudo apt install ffmpeg');
    console.log('2. 環境変数が正しく設定されているか確認');
    console.log('3. Supabase プロジェクトの権限を確認');
    process.exit(1);
  }
}

main();