#!/usr/bin/env node

// Supabaseのstoriesテーブルの内容をExcelファイルにエクスポート

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数 SUPABASE_URL と SUPABASE_SERVICE_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchAllStories() {
  console.log('📊 Supabaseからstoriesデータを取得中...');
  
  try {
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`✅ ${stories.length}件のストーリーを取得しました`);
    return stories;
  } catch (error) {
    console.error('❌ データ取得エラー:', error.message);
    throw error;
  }
}

async function createExcelFile(stories) {
  console.log('📝 Excelファイルを作成中...');
  
  // ワークブックを作成
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stories');

  // ヘッダー行を設定
  const headers = [
    { header: 'ID', key: 'id', width: 12 },
    { header: '作成日時', key: 'created_at', width: 20 },
    { header: 'ストーリー', key: 'story_text', width: 50 },
    { header: '完了状態', key: 'is_completed', width: 12 },
    { header: '動画URL', key: 'video_url', width: 60 }
  ];
  
  worksheet.columns = headers;

  // ヘッダー行のスタイルを設定
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // データを追加
  stories.forEach((story, index) => {
    const row = worksheet.addRow({
      id: story.id,
      created_at: story.created_at ? new Date(story.created_at).toLocaleString('ja-JP') : '',
      story_text: story.story_text || '',
      is_completed: story.is_completed ? '完了' : '未完了',
      video_url: story.video_url || ''
    });

    // 交互に背景色を設定
    if ((index + 1) % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8F8F8' }
      };
    }

    // ストーリーテキストのセルを改行を有効にする
    const storyTextCell = row.getCell('story_text');
    storyTextCell.alignment = { 
      wrapText: true, 
      vertical: 'top'
    };
  });

  // 行の高さを調整
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // ヘッダー行以外
      row.height = 60;
    }
  });

  // 罫線を設定
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // ファイル名を生成（日時付き）
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
  const filename = `stories_export_${dateStr}.xlsx`;
  const filepath = path.join(process.cwd(), filename);

  // ファイルを保存
  await workbook.xlsx.writeFile(filepath);
  
  console.log(`✅ Excelファイルを作成しました: ${filename}`);
  console.log(`📁 ファイルパス: ${filepath}`);
  
  return { filename, filepath };
}

function generateSummaryStats(stories) {
  console.log('\n📈 データサマリー:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const total = stories.length;
  const completed = stories.filter(s => s.is_completed).length;
  const pending = total - completed;
  
  console.log(`📊 総ストーリー数: ${total}件`);
  console.log(`✅ 完了済み: ${completed}件 (${(completed/total*100).toFixed(1)}%)`);
  console.log(`⏳ 未完了: ${pending}件 (${(pending/total*100).toFixed(1)}%)`);
  
  if (stories.length > 0) {
    const oldest = new Date(Math.min(...stories.map(s => new Date(s.created_at))));
    const newest = new Date(Math.max(...stories.map(s => new Date(s.created_at))));
    
    console.log(`📅 最古のストーリー: ${oldest.toLocaleString('ja-JP')}`);
    console.log(`📅 最新のストーリー: ${newest.toLocaleString('ja-JP')}`);
  }
  
  // 文字数統計
  const storyLengths = stories
    .filter(s => s.story_text)
    .map(s => s.story_text.length);
  
  if (storyLengths.length > 0) {
    const avgLength = Math.round(storyLengths.reduce((a, b) => a + b, 0) / storyLengths.length);
    const maxLength = Math.max(...storyLengths);
    const minLength = Math.min(...storyLengths);
    
    console.log(`📝 平均文字数: ${avgLength}文字`);
    console.log(`📝 最大文字数: ${maxLength}文字`);
    console.log(`📝 最小文字数: ${minLength}文字`);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function main() {
  console.log('🚀 Stories Excelエクスポートを開始...');
  console.log(`🗄️  Supabase: ${supabaseUrl}`);
  console.log('');
  
  try {
    // 1. データを取得
    const stories = await fetchAllStories();
    console.log('');
    
    // 2. サマリー統計を表示
    generateSummaryStats(stories);
    console.log('');
    
    // 3. Excelファイルを作成
    const result = await createExcelFile(stories);
    console.log('');
    
    console.log('🎉 エクスポート完了！');
    console.log('');
    console.log('📋 次のステップ:');
    console.log(`1. ファイルを開く: open "${result.filename}"`);
    console.log('2. Excel、LibreOffice、Google スプレッドシートなどで開けます');
    console.log('3. 必要に応じてフィルタリングや並び替えを行ってください');
    
  } catch (error) {
    console.error('💥 エクスポート失敗:', error.message);
    console.log('');
    console.log('💡 トラブルシューティング:');
    console.log('1. 環境変数が正しく設定されているか確認');
    console.log('2. Supabaseへの接続権限を確認');
    console.log('3. ExcelJSライブラリがインストールされているか確認: npm install exceljs');
    process.exit(1);
  }
}

// ExcelJSの依存関係をチェック
try {
  require('exceljs');
} catch (error) {
  console.error('❌ ExcelJSライブラリが見つかりません');
  console.log('📦 以下のコマンドでインストールしてください:');
  console.log('npm install exceljs');
  process.exit(1);
}

main();