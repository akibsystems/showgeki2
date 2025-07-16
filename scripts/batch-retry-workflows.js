#!/usr/bin/env node

/**
 * 複数のインスタントモードワークフローを一括で再実行するスクリプト
 * 
 * 使用方法:
 * # 全ての中断されたインスタントモードワークフローを再実行
 * node scripts/batch-retry-workflows.js
 * 
 * # 特定のワークフローIDリストを再実行
 * node scripts/batch-retry-workflows.js id1 id2 id3
 * 
 * オプション:
 * --dry-run: 実行せずに対象を確認
 * --concurrent <N>: 同時実行数（デフォルト: 1）
 * --days <N>: 過去N日間のワークフローを対象（デフォルト: 7）
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const path = require('path');

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
 * 中断されたインスタントモードワークフローを検索
 */
async function findStuckInstantWorkflows(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data: workflows, error } = await supabase
    .from('workflows')
    .select(`
      id,
      status,
      current_step,
      created_at,
      updated_at,
      uid,
      storyboard:storyboards(
        id,
        title,
        story_data
      )
    `)
    .eq('status', 'active')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`検索エラー: ${error.message}`);
  }

  // インスタントモードのワークフローのみフィルタ
  return workflows.filter(w => w.storyboard?.story_data?.originalText);
}

/**
 * 単一のワークフローを再実行
 */
function retryWorkflow(workflowId) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'retry-instant-workflow.js');
    const child = spawn('node', [scriptPath, workflowId], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ workflowId, success: true });
      } else {
        resolve({ workflowId, success: false, code });
      }
    });

    child.on('error', (error) => {
      resolve({ workflowId, success: false, error: error.message });
    });
  });
}

/**
 * 複数のワークフローを並列実行
 */
async function batchRetryWorkflows(workflowIds, concurrent = 1) {
  console.log(`\n🚀 ${workflowIds.length}件のワークフローを再実行します`);
  console.log(`  同時実行数: ${concurrent}`);

  const results = {
    success: [],
    failed: []
  };

  // バッチ処理
  for (let i = 0; i < workflowIds.length; i += concurrent) {
    const batch = workflowIds.slice(i, i + concurrent);
    console.log(`\n📦 バッチ ${Math.floor(i / concurrent) + 1}/${Math.ceil(workflowIds.length / concurrent)} を処理中...`);

    const promises = batch.map(id => retryWorkflow(id));
    const batchResults = await Promise.all(promises);

    // 結果を集計
    batchResults.forEach(result => {
      if (result.success) {
        results.success.push(result.workflowId);
      } else {
        results.failed.push(result);
      }
    });

    // 次のバッチまで少し待機（API負荷軽減）
    if (i + concurrent < workflowIds.length) {
      console.log('  ⏳ 次のバッチまで5秒待機...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return results;
}

/**
 * メイン処理
 */
async function main() {
  // コマンドライン引数の処理
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  let concurrent = 1;
  let days = 7;
  let workflowIds = [];

  // オプション解析
  const concurrentIndex = args.indexOf('--concurrent');
  if (concurrentIndex !== -1 && args[concurrentIndex + 1]) {
    concurrent = parseInt(args[concurrentIndex + 1], 10);
    if (isNaN(concurrent) || concurrent < 1 || concurrent > 5) {
      console.error('❌ --concurrent は1-5の数値を指定してください');
      process.exit(1);
    }
  }

  const daysIndex = args.indexOf('--days');
  if (daysIndex !== -1 && args[daysIndex + 1]) {
    days = parseInt(args[daysIndex + 1], 10);
    if (isNaN(days) || days < 1) {
      console.error('❌ --days は1以上の数値を指定してください');
      process.exit(1);
    }
  }

  // ワークフローIDの収集
  const nonOptionArgs = args.filter(arg => !arg.startsWith('--') && 
    arg !== args[concurrentIndex + 1] && 
    arg !== args[daysIndex + 1]);

  if (nonOptionArgs.length > 0) {
    // 引数で指定されたIDを使用
    workflowIds = nonOptionArgs;
    console.log(`📋 指定された${workflowIds.length}件のワークフローを処理します`);
  } else {
    // 中断されたワークフローを自動検索
    console.log('🔍 中断されたインスタントモードワークフローを検索中...');
    const stuckWorkflows = await findStuckInstantWorkflows(days);
    workflowIds = stuckWorkflows.map(w => w.id);

    if (workflowIds.length === 0) {
      console.log('✅ 中断されたインスタントモードワークフローは見つかりませんでした');
      return;
    }

    console.log(`\n📊 ${workflowIds.length}件の中断されたワークフローが見つかりました:`);
    for (const workflow of stuckWorkflows) {
      console.log(`  - ${workflow.id} (${workflow.storyboard?.title || '未設定'})`);
    }
  }

  if (dryRun) {
    console.log('\n📝 DRY RUNモード: 実際の実行は行いません');
    console.log('\n対象ワークフロー:');
    workflowIds.forEach((id, index) => {
      console.log(`  ${index + 1}. ${id}`);
    });
    return;
  }

  // 確認
  console.log('\n⚠️  これらのワークフローを再実行しますか？');
  console.log('  Enterキーで続行、Ctrl+Cでキャンセル');
  
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // バッチ実行
  const startTime = Date.now();
  const results = await batchRetryWorkflows(workflowIds, concurrent);
  const duration = Math.floor((Date.now() - startTime) / 1000);

  // 結果表示
  console.log('\n📊 実行結果:');
  console.log(`  ✅ 成功: ${results.success.length}件`);
  console.log(`  ❌ 失敗: ${results.failed.length}件`);
  console.log(`  ⏱️  実行時間: ${Math.floor(duration / 60)}分${duration % 60}秒`);

  if (results.failed.length > 0) {
    console.log('\n❌ 失敗したワークフロー:');
    results.failed.forEach(result => {
      console.log(`  - ${result.workflowId}: ${result.error || `終了コード ${result.code}`}`);
    });
  }

  if (results.success.length > 0) {
    console.log('\n✅ 成功したワークフロー:');
    results.success.forEach(id => {
      console.log(`  - ${id}`);
    });
  }
}

// 実行
main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});