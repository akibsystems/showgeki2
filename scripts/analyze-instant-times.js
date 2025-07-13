#!/usr/bin/env node
/**
 * Instant Mode の実行時間を分析するスクリプト
 * 
 * Usage:
 *   node scripts/analyze-instant-times.js
 *   node scripts/analyze-instant-times.js --days 7    # 過去7日間のデータを分析
 *   node scripts/analyze-instant-times.js --export    # Excel形式でエクスポート
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeInstantTimes() {
  const args = process.argv.slice(2);
  const daysBack = args.includes('--days') ? parseInt(args[args.indexOf('--days') + 1]) : 1;
  const shouldExport = args.includes('--export');
  
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);
  
  console.log(`\n📊 Instant Mode 実行時間分析`);
  console.log(`期間: ${fromDate.toLocaleDateString('ja-JP')} 〜 現在\n`);

  try {
    // Instant Mode のワークフローを取得
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('mode', 'instant')
      .eq('status', 'completed')
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!workflows || workflows.length === 0) {
      console.log('⚠️  完了したInstant Modeワークフローが見つかりません。');
      return;
    }

    console.log(`✅ ${workflows.length}件のワークフローを分析中...\n`);

    // 実行時間データを収集
    const timingData = [];
    let totalsByStep = {
      'step1-2': { total: 0, count: 0 },
      'step2-3': { total: 0, count: 0 },
      'step3-4': { total: 0, count: 0 },
      'step4-5': { total: 0, count: 0 },
      'step5-6': { total: 0, count: 0 },
      'step6-7': { total: 0, count: 0 },
      'direct-generation': { total: 0, count: 0 },
      'video-generation': { total: 0, count: 0 }
    };

    for (const workflow of workflows) {
      const metadata = workflow.instant_metadata || {};
      const timings = metadata.execution_timings || {};
      
      if (Object.keys(timings).length > 0) {
        const totalTime = metadata.total_execution_time_ms || 0;
        
        timingData.push({
          id: workflow.id,
          created_at: workflow.created_at,
          totalTime,
          timings
        });

        // 各ステップの合計を計算
        for (const [step, time] of Object.entries(timings)) {
          if (totalsByStep[step]) {
            totalsByStep[step].total += time;
            totalsByStep[step].count += 1;
          }
        }
      }
    }

    if (timingData.length === 0) {
      console.log('⚠️  実行時間データが記録されているワークフローがありません。');
      console.log('   (新しいバージョンで作成されたワークフローのみ実行時間が記録されます)');
      return;
    }

    // 統計情報を表示
    console.log('📈 ステップ別平均実行時間:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const stepNames = {
      'step1-2': 'ストーリー解析',
      'step2-3': 'キャラクター生成',
      'step3-4': '台本生成',
      'step4-5': '音声割り当て',
      'step5-6': 'BGM・字幕設定',
      'step6-7': '最終処理',
      'direct-generation': 'ダイレクトMulmoScript生成',
      'video-generation': '動画生成'
    };

    for (const [step, data] of Object.entries(totalsByStep)) {
      if (data.count > 0) {
        const avg = data.total / data.count;
        const avgSeconds = (avg / 1000).toFixed(1);
        const stepName = stepNames[step] || step;
        console.log(`${stepName.padEnd(20, ' ')}: ${avgSeconds.padStart(6, ' ')}秒`);
      }
    }

    // 全体の統計
    const totalTimes = timingData.map(d => d.totalTime);
    const avgTotal = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;
    const minTotal = Math.min(...totalTimes);
    const maxTotal = Math.max(...totalTimes);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 全体統計:`);
    console.log(`平均総実行時間: ${(avgTotal / 1000).toFixed(1)}秒`);
    console.log(`最短実行時間: ${(minTotal / 1000).toFixed(1)}秒`);
    console.log(`最長実行時間: ${(maxTotal / 1000).toFixed(1)}秒`);
    console.log(`サンプル数: ${timingData.length}件`);

    // Excelエクスポート
    if (shouldExport) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Instant Mode Timings');

      // ヘッダー設定
      worksheet.columns = [
        { header: 'Workflow ID', key: 'id', width: 40 },
        { header: '作成日時', key: 'created_at', width: 20 },
        { header: '総実行時間(秒)', key: 'total_seconds', width: 15 },
        { header: 'ストーリー解析(秒)', key: 'step1_2', width: 18 },
        { header: 'キャラクター生成(秒)', key: 'step2_3', width: 20 },
        { header: '台本生成(秒)', key: 'step3_4', width: 15 },
        { header: '音声割り当て(秒)', key: 'step4_5', width: 18 },
        { header: 'BGM・字幕(秒)', key: 'step5_6', width: 15 },
        { header: '最終処理(秒)', key: 'step6_7', width: 15 },
        { header: '動画生成(秒)', key: 'video_generation', width: 15 }
      ];

      // データ追加
      for (const data of timingData) {
        worksheet.addRow({
          id: data.id,
          created_at: new Date(data.created_at).toLocaleString('ja-JP'),
          total_seconds: (data.totalTime / 1000).toFixed(1),
          step1_2: data.timings['step1-2'] ? (data.timings['step1-2'] / 1000).toFixed(1) : '',
          step2_3: data.timings['step2-3'] ? (data.timings['step2-3'] / 1000).toFixed(1) : '',
          step3_4: data.timings['step3-4'] ? (data.timings['step3-4'] / 1000).toFixed(1) : '',
          step4_5: data.timings['step4-5'] ? (data.timings['step4-5'] / 1000).toFixed(1) : '',
          step5_6: data.timings['step5-6'] ? (data.timings['step5-6'] / 1000).toFixed(1) : '',
          step6_7: data.timings['step6-7'] ? (data.timings['step6-7'] / 1000).toFixed(1) : '',
          video_generation: data.timings['video-generation'] ? (data.timings['video-generation'] / 1000).toFixed(1) : ''
        });
      }

      // スタイル設定
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // ファイル保存
      const filename = `instant_mode_timings_${new Date().toISOString().split('T')[0]}.xlsx`;
      await workbook.xlsx.writeFile(filename);
      console.log(`\n✅ Excelファイルを保存しました: ${filename}`);
    }

  } catch (error) {
    console.error('エラー:', error);
  }
}

// 実行
analyzeInstantTimes();