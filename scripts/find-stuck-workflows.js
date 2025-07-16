#!/usr/bin/env node

/**
 * 中断されたワークフローを検索するスクリプト
 * 
 * 使用方法:
 * node scripts/find-stuck-workflows.js
 * 
 * オプション:
 * --days <N>: 過去N日間のワークフローを検索（デフォルト: 7）
 * --limit <N>: 表示件数の上限（デフォルト: 20）
 * --all: 通常モードも含めて表示（デフォルト: インスタントモードのみ）
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
 * 中断されたワークフローを検索
 */
async function findStuckWorkflows(days = 7, limit = 20, includeNormal = false) {
  console.log('🔍 中断されたワークフローを検索中...');
  console.log(`  期間: 過去${days}日間`);
  console.log(`  表示上限: ${limit}件`);
  console.log(`  検索対象: ${includeNormal ? '全てのワークフロー' : 'インスタントモードのみ'}\n`);

  try {
    // 日付の計算
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // activeステータスのワークフローを検索
    let query = supabase
      .from('workflows')
      .select(`
        id,
        status,
        current_step,
        created_at,
        updated_at,
        uid,
        mode,
        storyboard:storyboards(
          id,
          title,
          story_data
        )
      `)
      .eq('status', 'active')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // デフォルトはインスタントモードのみ
    if (!includeNormal) {
      query = query.eq('mode', 'instant');
    }
    
    const { data: workflows, error } = await query;

    if (error) {
      throw new Error(`検索エラー: ${error.message}`);
    }

    if (!workflows || workflows.length === 0) {
      console.log(includeNormal ? 
        '✅ 中断されたワークフローは見つかりませんでした' : 
        '✅ 中断されたインスタントモードワークフローは見つかりませんでした'
      );
      
      // インスタントモードのみ検索時に、通常モードの件数を確認
      if (!includeNormal) {
        const { count: normalCount } = await supabase
          .from('workflows')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .neq('mode', 'instant')
          .gte('created_at', cutoffDate.toISOString());
        
        if (normalCount && normalCount > 0) {
          console.log(`\n💡 通常モードの中断ワークフローが${normalCount}件あります。--allオプションで表示できます。`);
        }
      }
      return;
    }

    // modeフィールドでワークフローを分類
    const instantWorkflows = workflows.filter(w => w.mode === 'instant');
    const normalWorkflows = workflows.filter(w => w.mode !== 'instant');

    console.log(`📊 ${workflows.length}件の中断されたワークフローが見つかりました:\n`);

    // インスタントモードのワークフローを表示
    if (instantWorkflows.length > 0) {
      console.log('🚀 インスタントモードのワークフロー:');
      console.log('─'.repeat(80));
      
      for (const workflow of instantWorkflows) {
        const createdAt = new Date(workflow.created_at);
        const updatedAt = new Date(workflow.updated_at);
        const stuckDuration = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)); // 時間単位

        console.log(`ID: ${workflow.id}`);
        console.log(`  タイトル: ${workflow.storyboard?.title || '未設定'}`);
        console.log(`  現在のステップ: ${workflow.current_step}/7`);
        console.log(`  作成日時: ${createdAt.toLocaleString('ja-JP')}`);
        console.log(`  最終更新: ${updatedAt.toLocaleString('ja-JP')} (${stuckDuration}時間前)`);
        console.log(`  UID: ${workflow.uid}`);
        
        // ストーリーの冒頭を表示
        const storyText = workflow.storyboard?.story_data?.originalText;
        if (storyText) {
          const preview = storyText.substring(0, 50) + (storyText.length > 50 ? '...' : '');
          console.log(`  ストーリー: ${preview}`);
        }
        
        // 再実行コマンドを表示
        console.log(`  再実行: node scripts/retry-instant-workflow.js ${workflow.id}`);
        console.log('─'.repeat(80));
      }
    }

    // 通常モードのワークフローも表示（--allオプション時のみ）
    if (includeNormal && normalWorkflows.length > 0) {
      console.log(`\n📝 通常モードのワークフロー: ${normalWorkflows.length}件`);
      console.log('（これらは手動で進める必要があります）');
      console.log('─'.repeat(80));
      
      for (const workflow of normalWorkflows) {
        const createdAt = new Date(workflow.created_at);
        const updatedAt = new Date(workflow.updated_at);
        const stuckDuration = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)); // 時間単位

        console.log(`ID: ${workflow.id}`);
        console.log(`  タイトル: ${workflow.storyboard?.title || '未設定'}`);
        console.log(`  現在のステップ: ${workflow.current_step}/7`);
        console.log(`  作成日時: ${createdAt.toLocaleString('ja-JP')}`);
        console.log(`  最終更新: ${updatedAt.toLocaleString('ja-JP')} (${stuckDuration}時間前)`);
        console.log(`  UID: ${workflow.uid}`);
        console.log('─'.repeat(80));
      }
    }

    // サマリー
    console.log('\n📊 サマリー:');
    console.log(`  インスタントモード: ${instantWorkflows.length}件`);
    if (includeNormal) {
      console.log(`  通常モード: ${normalWorkflows.length}件`);
      console.log(`  合計: ${workflows.length}件`);
    } else if (normalWorkflows.length > 0) {
      console.log(`  通常モード: ${normalWorkflows.length}件（非表示、--allで表示）`);
    }

    // 一括処理のヒント
    if (instantWorkflows.length > 1) {
      console.log('\n💡 ヒント: 以下のコマンドで全てのインスタントモードワークフローを再実行できます:');
      console.log('\n#!/bin/bash');
      instantWorkflows.forEach(w => {
        console.log(`node scripts/retry-instant-workflow.js ${w.id}`);
      });
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// コマンドライン引数の処理
const args = process.argv.slice(2);
let days = 7;
let limit = 20;
let includeNormal = false;

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
  includeNormal = true;
}

// 実行
findStuckWorkflows(days, limit, includeNormal);