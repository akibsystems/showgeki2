#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数 SUPABASE_URL と SUPABASE_SERVICE_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    exportOnly: false,
    downloadOnly: false,
    from: null,
    to: null,
    limit: null,
    outputDir: null, // Will be set based on Excel filename
    excelFile: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--export-only':
      case '-e':
        options.exportOnly = true;
        break;
      case '--download-only':
      case '-d':
        options.downloadOnly = true;
        break;
      case '--from':
      case '-f':
        options.from = nextArg;
        i++;
        break;
      case '--to':
      case '-t':
        options.to = nextArg;
        i++;
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(nextArg);
        i++;
        break;
      case '--output-dir':
      case '-o':
        options.outputDir = nextArg;
        i++;
        break;
      case '--excel-file':
      case '-x':
        options.excelFile = nextArg;
        i++;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

// ヘルプメッセージの表示
function showHelp() {
  console.log(`
動画管理スクリプト - Showgeki2の動画をエクスポート・ダウンロードします

使用方法:
  node video-manager.js [オプション]

オプション:
  -h, --help              このヘルプを表示
  -e, --export-only       Excelファイルの作成のみ（ダウンロードなし）
  -d, --download-only     ダウンロードのみ（既存のExcelファイルから）
  -f, --from <日時>       開始日時（日本時間 JST）（例: "2025-06-28 17:00"）
  -t, --to <日時>         終了日時（日本時間 JST）（省略時は現在時刻）
  -l, --limit <数>        最大件数
  -o, --output-dir <パス> ダウンロード先ディレクトリ（デフォルト: ~/Downloads/[Excelファイル名]）
  -x, --excel-file <パス> 既存のExcelファイル（download-onlyの場合）

デフォルト動作:
  パラメータなしで実行すると、過去24時間分の動画をエクスポート＆ダウンロードします

例:
  # デフォルト: 過去24時間分を処理
  node video-manager.js
  
  # 今日の17:00以降の動画を全て処理
  node video-manager.js --from "2025-06-28 17:00"

  # 特定期間の動画を最大10件エクスポートのみ
  node video-manager.js --export-only --from "2025-06-28 09:00" --to "2025-06-28 18:00" --limit 10

  # 既存のExcelファイルから動画をダウンロードのみ
  node video-manager.js --download-only --excel-file videos_2025-06-28.xlsx

  # 昨日の全動画を処理
  node video-manager.js --from "2025-06-27 00:00" --to "2025-06-27 23:59"
`);
}

// 日時文字列をDateオブジェクトに変換（JST対応）
function parseDateTime(dateStr) {
  if (!dateStr) return null;
  
  // ISO形式の場合はそのまま
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  
  // "YYYY-MM-DD HH:mm" 形式の場合はJSTとして解釈
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    // JST時刻として文字列を構築し、UTCに変換
    const jstString = `${year}-${month}-${day}T${hour}:${minute}:00+09:00`;
    return new Date(jstString);
  }
  
  // "YYYY-MM-DD" 形式の場合もJSTの00:00として解釈
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    const jstString = `${year}-${month}-${day}T00:00:00+09:00`;
    return new Date(jstString);
  }
  
  // その他の形式も試す
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`無効な日時形式: ${dateStr}`);
  }
  return date;
}

// ファイル名をサニタイズする関数
function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

// URLからファイルをダウンロードする関数
async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlinkSync(filepath);
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

// 動画データをエクスポート
async function exportVideos(options) {
  try {
    // クエリの構築
    let query = supabase
      .from('videos')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    // 日時範囲の適用
    if (options.from) {
      const fromDate = parseDateTime(options.from);
      const fromJST = new Date(fromDate.getTime() + 9 * 60 * 60 * 1000);
      console.log(`📅 開始日時: ${options.from} JST (UTC: ${fromDate.toISOString()})`);
      query = query.gte('created_at', fromDate.toISOString());
    }
    
    if (options.to) {
      const toDate = parseDateTime(options.to);
      const toJST = new Date(toDate.getTime() + 9 * 60 * 60 * 1000);
      console.log(`📅 終了日時: ${options.to} JST (UTC: ${toDate.toISOString()})`);
      query = query.lte('created_at', toDate.toISOString());
    }

    // 件数制限の適用
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data: videos, error: videoError } = await query;

    if (videoError) {
      console.error('動画取得エラー:', videoError);
      return null;
    }

    if (!videos || videos.length === 0) {
      console.log('該当する動画がありません。');
      return null;
    }

    console.log(`📹 ${videos.length}件の動画を見つけました`);

    // 各動画のストーリー情報を取得
    const videoData = [];
    
    for (const video of videos) {
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .select('title, text_raw')
        .eq('id', video.story_id)
        .single();

      if (storyError) {
        console.error(`ストーリー ${video.story_id} の取得エラー:`, storyError);
        continue;
      }

      videoData.push({
        created_at: video.created_at,
        video_url: video.video_url || video.url,
        title: story?.title || 'タイトルなし',
        text_raw: story?.text_raw || '',
        story_id: video.story_id,
        video_id: video.id,
        duration_sec: video.duration_sec,
        resolution: video.resolution,
        size_mb: video.size_mb
      });
    }

    // Excelファイルを作成
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('動画一覧');

    // ヘッダー設定
    worksheet.columns = [
      { header: '作成日時', key: 'created_at', width: 20 },
      { header: '動画URL', key: 'video_url', width: 50 },
      { header: 'タイトル', key: 'title', width: 30 },
      { header: 'ストーリー内容', key: 'text_raw', width: 50 },
      { header: 'ストーリーID', key: 'story_id', width: 40 },
      { header: '動画ID', key: 'video_id', width: 40 },
      { header: '再生時間(秒)', key: 'duration_sec', width: 15 },
      { header: '解像度', key: 'resolution', width: 15 },
      { header: 'サイズ(MB)', key: 'size_mb', width: 15 }
    ];

    // ヘッダーのスタイル設定
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4B5563' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // データを追加
    videoData.forEach((data) => {
      const row = worksheet.addRow(data);
      
      // 作成日時をJSTで表示
      const createdDate = new Date(data.created_at);
      const jstDate = new Date(createdDate.getTime() + 9 * 60 * 60 * 1000);
      row.getCell('created_at').value = jstDate.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Tokyo'
      });

      // URLをハイパーリンクに
      if (data.video_url) {
        row.getCell('video_url').value = {
          text: data.video_url,
          hyperlink: data.video_url
        };
        row.getCell('video_url').font = { color: { argb: 'FF0066CC' }, underline: true };
      }

      // ストーリー内容の改行を保持
      row.getCell('text_raw').alignment = { wrapText: true, vertical: 'top' };
      
      // 行の高さを調整
      row.height = Math.min(100, 15 + (data.text_raw.length / 50) * 15);
    });

    // グリッド線を表示
    worksheet.views = [{ showGridLines: true }];

    // ファイル名（日時を含む）- JST時刻を使用
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000; // 9 hours in milliseconds
    const jstNow = new Date(now.getTime() + jstOffset);
    
    // JSTの日時を手動でフォーマット
    const year = jstNow.getUTCFullYear();
    const month = String(jstNow.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstNow.getUTCDate()).padStart(2, '0');
    const hour = String(jstNow.getUTCHours()).padStart(2, '0');
    const minute = String(jstNow.getUTCMinutes()).padStart(2, '0');
    const second = String(jstNow.getUTCSeconds()).padStart(2, '0');
    
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hour}-${minute}-${second}`;
    const fileName = `showgeki2_videos_${dateStr}_${timeStr}.xlsx`;
    
    // Excelファイルも~/Downloadsに保存
    const userHome = os.homedir();
    const filePath = path.join(userHome, 'Downloads', fileName);

    // ファイルを保存
    await workbook.xlsx.writeFile(filePath);
    
    console.log(`✅ Excelファイルを作成しました: ${fileName}`);
    console.log(`📊 エクスポートした動画数: ${videoData.length}件`);
    console.log(`📍 保存場所: ${filePath}`);

    return { filePath, fileName, videos: videoData };

  } catch (error) {
    console.error('エクスポート中にエラーが発生しました:', error);
    return null;
  }
}

// 動画をダウンロード
async function downloadVideos(excelPath, outputDir) {
  try {
    // outputフォルダを作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 ${outputDir} フォルダを作成しました`);
    }

    // Excelファイルを読み込む
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    
    const worksheet = workbook.getWorksheet('動画一覧');
    if (!worksheet) {
      console.error('❌ ワークシート「動画一覧」が見つかりません');
      return false;
    }

    console.log('📊 Excelファイルを読み込みました');

    // ヘッダー行をスキップして、データ行を処理
    const videos = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // ヘッダー行をスキップ
      
      const video = {
        created_at: row.getCell(1).value,
        video_url: row.getCell(2).value,
        title: row.getCell(3).value,
        story_id: row.getCell(5).value,
        video_id: row.getCell(6).value
      };
      
      // URLがオブジェクトの場合（ハイパーリンク）、実際のURLを取得
      if (video.video_url && typeof video.video_url === 'object') {
        video.video_url = video.video_url.text || video.video_url.hyperlink;
      }
      
      if (video.video_url) {
        videos.push(video);
      }
    });

    console.log(`📹 ${videos.length}件の動画URLを取得しました`);
    console.log(`📁 ダウンロード先: ${outputDir}\n`);

    // 各動画をダウンロード
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const index = (i + 1).toString().padStart(2, '0');
      
      // ファイル名を作成（番号_タイトル_ID.mp4）
      const filename = `${index}_${sanitizeFilename(video.title || 'untitled')}_${video.story_id}.mp4`;
      const filepath = path.join(outputDir, filename);
      
      console.log(`[${i + 1}/${videos.length}] ダウンロード中: ${video.title || 'タイトルなし'}`);
      console.log(`  URL: ${video.video_url}`);
      
      try {
        await downloadFile(video.video_url, filepath);
        const stats = fs.statSync(filepath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`  ✅ 成功: ${filename} (${sizeMB}MB)`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ 失敗: ${error.message}`);
        failCount++;
      }
      
      // レート制限を避けるため少し待機
      if (i < videos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n========== ダウンロード完了 ==========');
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ 失敗: ${failCount}件`);
    console.log(`📁 保存先: ${outputDir}`);

    return true;

  } catch (error) {
    console.error('ダウンロード中にエラーが発生しました:', error);
    return false;
  }
}

// メイン処理
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  // 排他的オプションのチェック
  if (options.exportOnly && options.downloadOnly) {
    console.error('❌ --export-only と --download-only は同時に指定できません');
    process.exit(1);
  }

  // デフォルト値の設定
  if (!options.from && !options.to && !options.downloadOnly) {
    // パラメータなしの場合は過去24時間をデフォルトに
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    options.from = yesterday.toISOString();
    options.to = now.toISOString();
    console.log('📅 デフォルト期間: 過去24時間');
  }

  console.log('🚀 動画管理スクリプトを開始します...\n');

  // エクスポート処理
  let exportResult = null;
  if (!options.downloadOnly) {
    exportResult = await exportVideos(options);
    if (!exportResult && !options.exportOnly) {
      console.log('エクスポートするデータがないため、処理を終了します。');
      return;
    }
  }

  // ダウンロード処理
  if (!options.exportOnly) {
    let excelPath = options.excelFile;
    
    // Excelファイルが指定されていない場合は、エクスポートしたファイルを使用
    if (!excelPath && exportResult) {
      excelPath = exportResult.filePath;
    }
    
    if (!excelPath) {
      console.error('❌ ダウンロード用のExcelファイルが指定されていません');
      console.log('--excel-file オプションでファイルを指定するか、エクスポートを実行してください');
      process.exit(1);
    }
    
    if (!fs.existsSync(excelPath)) {
      console.error(`❌ Excelファイルが見つかりません: ${excelPath}`);
      process.exit(1);
    }
    
    // outputDirが指定されていない場合は、Excelファイル名に基づいて設定
    if (!options.outputDir) {
      const excelBaseName = path.basename(excelPath, '.xlsx');
      const userHome = os.homedir();
      options.outputDir = path.join(userHome, 'Downloads', excelBaseName);
    }
    
    await downloadVideos(excelPath, options.outputDir);
  }

  console.log('\n✨ すべての処理が完了しました');
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('予期しないエラーが発生しました:', error);
  process.exit(1);
});

// 実行
main();