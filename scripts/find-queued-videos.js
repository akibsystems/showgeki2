#!/usr/bin/env node

/**
 * queuedステータスのビデオを検索するスクリプト
 * 
 * 使用方法:
 * node scripts/find-queued-videos.js
 * 
 * オプション:
 * --days <N>: 過去N日間のビデオを検索（デフォルト: 7）
 * --limit <N>: 表示件数の上限（デフォルト: 20）
 * --all: 全てのステータスを表示
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
 * ビデオを検索
 */
async function findVideos(options = {}) {
  const { days = 7, limit = 20, showAll = false } = options;
  
  console.log('🔍 ビデオを検索中...');
  console.log(`  期間: 過去${days}日間`);
  console.log(`  表示上限: ${limit}件`);
  console.log(`  フィルター: ${showAll ? '全てのステータス' : 'queuedのみ'}\n`);

  try {
    // 日付の計算
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // クエリ構築
    let query = supabase
      .from('videos')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        uid,
        url,
        error_msg,
        story_id
      `)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    // ステータスフィルター
    if (!showAll) {
      query = query.eq('status', 'queued');
    }

    const { data: videos, error } = await query;

    if (error) {
      throw new Error(`検索エラー: ${error.message}`);
    }

    if (!videos || videos.length === 0) {
      console.log(`✅ ${showAll ? 'ビデオ' : 'queuedステータスのビデオ'}は見つかりませんでした`);
      return;
    }

    // ステータス別に分類
    const videosByStatus = {
      queued: [],
      processing: [],
      completed: [],
      failed: []
    };

    videos.forEach(video => {
      if (videosByStatus[video.status]) {
        videosByStatus[video.status].push(video);
      }
    });

    // 表示
    console.log(`📊 ${videos.length}件のビデオが見つかりました:\n`);

    // queuedビデオを優先表示
    if (videosByStatus.queued.length > 0) {
      console.log('⏳ Queuedビデオ:');
      console.log('─'.repeat(80));
      displayVideos(videosByStatus.queued);
    }

    // その他のステータスも表示
    if (showAll) {
      if (videosByStatus.processing.length > 0) {
        console.log('\n🔄 Processingビデオ:');
        console.log('─'.repeat(80));
        displayVideos(videosByStatus.processing);
      }

      if (videosByStatus.failed.length > 0) {
        console.log('\n❌ Failedビデオ:');
        console.log('─'.repeat(80));
        displayVideos(videosByStatus.failed, true);
      }

      if (videosByStatus.completed.length > 0) {
        console.log('\n✅ Completedビデオ:');
        console.log('─'.repeat(80));
        displayVideos(videosByStatus.completed, false, true);
      }
    }

    // サマリー
    console.log('\n📊 サマリー:');
    console.log(`  Queued: ${videosByStatus.queued.length}件`);
    console.log(`  Processing: ${videosByStatus.processing.length}件`);
    console.log(`  Failed: ${videosByStatus.failed.length}件`);
    console.log(`  Completed: ${videosByStatus.completed.length}件`);
    console.log(`  合計: ${videos.length}件`);

    // queuedビデオの処理ヒント
    if (videosByStatus.queued.length > 0) {
      console.log('\n💡 queuedビデオを処理するには:');
      console.log('  個別処理: node scripts/process-video.js <video_id>');
      if (videosByStatus.queued.length > 1) {
        console.log('  一括処理スクリプト例:');
        console.log('  #!/bin/bash');
        videosByStatus.queued.slice(0, 5).forEach(v => {
          console.log(`  node scripts/process-video.js ${v.id}`);
        });
        if (videosByStatus.queued.length > 5) {
          console.log('  # ... 他 ' + (videosByStatus.queued.length - 5) + ' 件');
        }
      }
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

/**
 * ビデオ情報を表示
 */
async function displayVideos(videos, showError = false, showUrl = false) {
  for (const video of videos) {
    const createdAt = new Date(video.created_at);
    const updatedAt = new Date(video.updated_at);
    const waitTime = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60)); // 時間単位

    // ストーリーボードのタイトルを取得
    let title = '未設定';
    if (video.story_id) {
      const { data: storyboard } = await supabase
        .from('storyboards')
        .select('title')
        .eq('id', video.story_id)
        .single();
      
      if (storyboard?.title) {
        title = storyboard.title;
      }
    }

    console.log(`ID: ${video.id}`);
    console.log(`  タイトル: ${title}`);
    console.log(`  作成日時: ${createdAt.toLocaleString('ja-JP')}`);
    console.log(`  最終更新: ${updatedAt.toLocaleString('ja-JP')}`);
    console.log(`  待機時間: ${waitTime}時間`);
    console.log(`  UID: ${video.uid}`);
    
    if (showError && video.error_msg) {
      console.log(`  エラー: ${video.error_msg}`);
    }
    
    if (showUrl && video.url) {
      console.log(`  動画URL: ${video.url}`);
    }

    if (video.status === 'queued') {
      console.log(`  処理コマンド: node scripts/process-video.js ${video.id}`);
    }
    
    console.log('─'.repeat(80));
  }
}

// コマンドライン引数の処理
const args = process.argv.slice(2);
let days = 7;
let limit = 20;
let showAll = false;

// --days オプション
const daysIndex = args.indexOf('--days');
if (daysIndex !== -1 && args[daysIndex + 1]) {
  days = parseInt(args[daysIndex + 1], 10);
  if (isNaN(days) || days < 1) {
    console.error('❌ --days は1以上の数値を指定してください');
    process.exit(1);
  }
}

// --limit オプション
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  limit = parseInt(args[limitIndex + 1], 10);
  if (isNaN(limit) || limit < 1) {
    console.error('❌ --limit は1以上の数値を指定してください');
    process.exit(1);
  }
}

// --all オプション
if (args.includes('--all')) {
  showAll = true;
}

// 実行
findVideos({ days, limit, showAll });