#!/usr/bin/env node

// mulmocast-cli テスト用スクリプト

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MULMOCAST_PATH = '/app/mulmocast-cli';
const TEST_SCRIPT_PATH = path.join(MULMOCAST_PATH, 'scripts', 'test-school.json');
const OUTPUT_PATH = path.join(MULMOCAST_PATH, 'output', 'test-school.mp4');

// テスト用のスクリプト作成
const testScript = {
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
      "ナレーター": {
        "voiceId": "nova"
      },
      "ウサギ": {
        "voiceId": "shimmer"
      }
    }
  },
  "beats": [
    {
      "speaker": "ナレーター",
      "text": "昔々、ある森に小さなウサギが住んでいました。",
      "imagePrompt": "A small rabbit in a beautiful forest, Ghibli style anime"
    },
    {
      "speaker": "ウサギ",
      "text": "今日はいい天気だなあ。お散歩に行こう！",
      "imagePrompt": "A happy rabbit looking at the sunny sky, Ghibli style"
    },
    {
      "speaker": "ナレーター",
      "text": "ウサギは森の中を楽しく歩き回りました。",
      "imagePrompt": "A rabbit walking happily through the forest path"
    },
    {
      "speaker": "ウサギ",
      "text": "あ、美しい花を見つけた！",
      "imagePrompt": "A rabbit discovering beautiful flowers in the forest"
    },
    {
      "speaker": "ナレーター",
      "text": "そして、ウサギは幸せに暮らしましたとさ。",
      "imagePrompt": "A content rabbit sitting peacefully in the forest"
    }
  ]
};

async function testMulmocast() {
  console.log('🎬 mulmocast-cli テストを開始...');
  console.log(`📁 mulmocast-cli パス: ${MULMOCAST_PATH}`);
  console.log('');

  try {
    // 1. mulmocast-cliディレクトリの存在確認
    if (!fs.existsSync(MULMOCAST_PATH)) {
      throw new Error(`mulmocast-cli ディレクトリが見つかりません: ${MULMOCAST_PATH}`);
    }

    // 2. package.jsonの存在確認
    const packageJsonPath = path.join(MULMOCAST_PATH, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json が見つかりません: ${packageJsonPath}`);
    }

    console.log('✅ mulmocast-cli ディレクトリ確認完了');

    // 3. 必要なディレクトリを作成
    const scriptsDir = path.join(MULMOCAST_PATH, 'scripts');
    const outputDir = path.join(MULMOCAST_PATH, 'output');
    
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
      console.log('📁 scripts ディレクトリを作成');
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('📁 output ディレクトリを作成');
    }

    // 4. テストスクリプトファイルを作成
    console.log('📝 テストスクリプトファイルを作成...');
    fs.writeFileSync(TEST_SCRIPT_PATH, JSON.stringify(testScript, null, 2));
    console.log(`✅ テストファイル作成: ${TEST_SCRIPT_PATH}`);

    // 5. 環境確認
    console.log('🔍 環境確認...');
    
    // Node.js version
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      console.log(`  Node.js: ${nodeVersion}`);
    } catch (error) {
      console.log('  Node.js: 確認できませんでした');
    }

    // FFmpeg version
    try {
      const ffmpegVersion = execSync('ffmpeg -version', { encoding: 'utf8' }).split('\n')[0];
      console.log(`  FFmpeg: ${ffmpegVersion}`);
    } catch (error) {
      console.log('  FFmpeg: インストールされていません');
    }

    // ImageMagick version
    try {
      const magickVersion = execSync('convert -version', { encoding: 'utf8' }).split('\n')[0];
      console.log(`  ImageMagick: ${magickVersion}`);
    } catch (error) {
      console.log('  ImageMagick: インストールされていません');
    }

    console.log('');

    // 6. mulmocast-cli の dependencies確認
    console.log('📦 mulmocast-cli dependencies確認...');
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log(`  Name: ${packageJson.name || 'N/A'}`);
      console.log(`  Version: ${packageJson.version || 'N/A'}`);
      
      if (packageJson.scripts && packageJson.scripts.movie) {
        console.log(`  Movie script: ${packageJson.scripts.movie}`);
      } else {
        console.log('  ⚠️ movie script が見つかりません');
      }
    } catch (error) {
      console.log('  package.json の読み取りに失敗');
    }

    // 7. npm install確認
    const nodeModulesPath = path.join(MULMOCAST_PATH, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('⚠️ node_modules が見つかりません。npm install を実行します...');
      try {
        execSync('npm install', {
          cwd: MULMOCAST_PATH,
          stdio: 'inherit',
          timeout: 120000 // 2分タイムアウト
        });
        console.log('✅ npm install 完了');
      } catch (error) {
        console.log('❌ npm install 失敗:', error.message);
        return;
      }
    } else {
      console.log('✅ node_modules 確認完了');
    }

    console.log('');

    // 8. 実際の動画生成テスト
    console.log('🎥 動画生成テストを開始...');
    console.log('⚠️ この処理には数分かかる場合があります...');
    
    try {
      // 既存の出力ファイルを削除
      if (fs.existsSync(OUTPUT_PATH)) {
        fs.unlinkSync(OUTPUT_PATH);
      }

      // mulmocast-cli実行
      const command = 'npm run movie scripts/test-school.json';
      console.log(`実行コマンド: ${command}`);
      
      execSync(command, {
        cwd: MULMOCAST_PATH,
        stdio: 'inherit',
        timeout: 300000 // 5分タイムアウト
      });

      // 出力ファイル確認
      if (fs.existsSync(OUTPUT_PATH)) {
        const stats = fs.statSync(OUTPUT_PATH);
        console.log('');
        console.log('🎉 動画生成テスト成功！');
        console.log(`📁 出力ファイル: ${OUTPUT_PATH}`);
        console.log(`📏 ファイルサイズ: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📅 作成日時: ${stats.mtime}`);
      } else {
        console.log('❌ 出力ファイルが作成されませんでした');
      }

    } catch (error) {
      console.log('❌ 動画生成テスト失敗:', error.message);
      console.log('');
      console.log('💡 トラブルシューティング:');
      console.log('1. OpenAI API key が設定されているか確認');
      console.log('2. 必要な依存関係がすべてインストールされているか確認');
      console.log('3. FFmpeg と ImageMagick が正しくインストールされているか確認');
    }

  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
  }
}

// メイン実行
if (require.main === module) {
  testMulmocast();
}

module.exports = { testMulmocast };