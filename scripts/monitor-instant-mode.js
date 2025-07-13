#!/usr/bin/env node
/**
 * Instant Mode のリアルタイム監視スクリプト
 * 
 * Usage:
 *   node scripts/monitor-instant-mode.js
 *   node scripts/monitor-instant-mode.js --interval 5    # 5秒ごとに更新
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function monitorInstantMode() {
  const args = process.argv.slice(2);
  const interval = args.includes('--interval') ? parseInt(args[args.indexOf('--interval') + 1]) : 10;
  
  console.clear();
  console.log(`🔍 Instant Mode モニター (${interval}秒ごとに更新)`);
  console.log('Ctrl+C で終了\n');

  setInterval(async () => {
    try {
      // アクティブなInstant Modeワークフローを取得
      const { data: activeWorkflows, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('mode', 'instant')
        .in('status', ['active', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.clear();
      console.log(`🔍 Instant Mode モニター - ${new Date().toLocaleTimeString('ja-JP')}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      if (!activeWorkflows || activeWorkflows.length === 0) {
        console.log('現在処理中のInstant Modeワークフローはありません。');
      } else {
        for (const workflow of activeWorkflows) {
          const metadata = workflow.instant_metadata || {};
          const currentStep = workflow.instant_step || 'unknown';
          const progress = workflow.progress || 0;
          const createdAt = new Date(workflow.created_at);
          const elapsedTime = Math.floor((Date.now() - createdAt.getTime()) / 1000);

          console.log(`📋 Workflow ID: ${workflow.id}`);
          console.log(`   状態: ${workflow.status}`);
          console.log(`   現在のステップ: ${getStepName(currentStep)}`);
          console.log(`   進捗: ${createProgressBar(progress)} ${progress}%`);
          console.log(`   経過時間: ${formatTime(elapsedTime)}`);
          
          if (metadata.message) {
            console.log(`   メッセージ: ${metadata.message}`);
          }
          
          console.log();
        }
      }

      // 最近完了したワークフローも表示
      const { data: recentCompleted } = await supabase
        .from('workflows')
        .select('*')
        .eq('mode', 'instant')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(3);

      if (recentCompleted && recentCompleted.length > 0) {
        console.log('\n📊 最近完了したワークフロー:');
        console.log('────────────────────────────────────────────────────────────');
        
        for (const workflow of recentCompleted) {
          const metadata = workflow.instant_metadata || {};
          const totalTime = metadata.total_execution_time_ms;
          const completedAt = new Date(workflow.updated_at);
          
          console.log(`✅ ${workflow.id.substring(0, 8)}... - ${completedAt.toLocaleTimeString('ja-JP')}`);
          
          if (totalTime) {
            console.log(`   総実行時間: ${(totalTime / 1000).toFixed(1)}秒`);
          }
        }
      }

    } catch (error) {
      console.error('エラー:', error);
    }
  }, interval * 1000);
}

function getStepName(step) {
  const stepNames = {
    'analyzing': 'ストーリー解析中',
    'structuring': '構成作成中',
    'characters': 'キャラクター生成中',
    'script': '台本生成中',
    'voices': '音声割り当て中',
    'finalizing': '最終処理中',
    'generating': '動画生成中',
    'completed': '完了'
  };
  return stepNames[step] || step;
}

function createProgressBar(progress) {
  const barLength = 20;
  const filled = Math.floor((progress / 100) * barLength);
  const empty = barLength - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  }
  return `${secs}秒`;
}

// 実行
monitorInstantMode();