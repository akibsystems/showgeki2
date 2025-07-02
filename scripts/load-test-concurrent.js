#!/usr/bin/env node

/**
 * 負荷テスト用並列実行スクリプト
 * 
 * ストーリー投稿から動画生成完了までのフルフローを
 * 複数ユーザーで同時実行し、パフォーマンスを測定します。
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数 NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// コマンドライン引数の処理
const args = process.argv.slice(2);
let concurrentUsers = 1; // デフォルト値
let exportExcel = false; // デフォルトはExcel出力なし

// 引数の解析
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--users' || args[i] === '-u') {
    concurrentUsers = parseInt(args[i + 1]);
    if (isNaN(concurrentUsers) || concurrentUsers < 1) {
      console.error('❌ ユーザー数は1以上の整数で指定してください');
      process.exit(1);
    }
  }
  if (args[i] === '--excel' || args[i] === '-e') {
    exportExcel = true;
  }
  if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
使用方法:
  node scripts/load-test-concurrent.js [オプション]

オプション:
  --users, -u <数値>    同時実行ユーザー数を指定 (デフォルト: 1)
  --excel, -e          Excel形式でレポートを出力
  --help, -h           このヘルプを表示

例:
  node scripts/load-test-concurrent.js --users 20
  node scripts/load-test-concurrent.js -u 100
  node scripts/load-test-concurrent.js -u 5 --excel
    `);
    process.exit(0);
  }
}

// テスト設定
const TEST_CONFIG = {
  CONCURRENT_USERS: concurrentUsers,     // 同時実行ユーザー数
  POLLING_INTERVAL: 5000,        // ステータス確認間隔（ミリ秒）
  MAX_WAIT_TIME: 300000,         // 最大待機時間（5分）
};

// ストーリーテンプレート
const STORY_TEMPLATES = [
  {
    title: "未来のロボット社会",
    content: "2050年、AIと人間が共存する社会で、一人の少年が新しい友情を見つける物語。ロボットと人間の境界が曖昧になる中で、真の友情とは何かを問いかける。"
  },
  {
    title: "魔法の図書館",
    content: "古い図書館で見つけた不思議な本。ページを開くと、物語の世界に入り込んでしまう主人公。様々な物語を冒険しながら、自分自身の物語を見つけていく。"
  },
  {
    title: "時を超える手紙",
    content: "祖母の遺品から見つかった古い手紙。それは50年前の自分宛てに書かれたものだった。時を超えて届いたメッセージが、現代の私に新たな人生の指針を与える。"
  },
  {
    title: "深海の秘密都市",
    content: "海洋学者として深海を探索中、偶然発見した古代文明の遺跡。そこには現代科学を超える技術と、人類への警告が隠されていた。"
  },
  {
    title: "星々の交響曲",
    content: "宇宙飛行士として初めて火星に降り立った私。そこで聞こえてきたのは、宇宙そのものが奏でる壮大な音楽だった。星々が織りなす交響曲の意味とは。"
  },
  {
    title: "夢を売る少女",
    content: "不思議な少女が営む小さな店。そこでは人々の夢を買い取り、必要な人に売っている。ある日、自分の夢を売った青年が、それを取り戻そうとする。"
  },
  {
    title: "消えた一日の謎",
    content: "ある朝目覚めると、世界中の人々が昨日の記憶を失っていた。唯一記憶を持つ主人公は、失われた一日に何が起きたのかを解明しようとする。"
  },
  {
    title: "鏡の向こうの自分",
    content: "アンティークショップで見つけた古い鏡。そこに映る自分は、現実とは違う選択をした別の人生を生きていた。二つの人生が交錯し始める。"
  },
  {
    title: "最後の魔法使い",
    content: "科学技術が発達した現代に、ひっそりと生きる最後の魔法使い。彼女の使命は、失われつつある自然の魔法を次世代に伝えること。"
  },
  {
    title: "記憶の図書館",
    content: "人々の記憶を本として保管する不思議な図書館。司書として働く主人公は、ある日自分の記憶の本が空白であることに気づく。"
  }
];

// メトリクス記録用
const metrics = {
  startTime: new Date(),
  users: [],
  summary: {
    totalUsers: TEST_CONFIG.CONCURRENT_USERS,
    successCount: 0,
    failureCount: 0,
    averageTime: 0,
    minTime: Infinity,
    maxTime: 0
  }
};

// ユーザーメトリクス作成
function createUserMetrics(userId, storyTemplate) {
  return {
    userId,
    storyTitle: storyTemplate.title,
    storyId: null,
    videoId: null,
    startTime: new Date(),
    endTime: null,
    duration: null,
    status: 'started',
    error: null,
    steps: {
      storyCreation: { start: null, end: null, duration: null, status: 'pending' },
      scriptGeneration: { start: null, end: null, duration: null, status: 'pending' },
      videoGeneration: { start: null, end: null, duration: null, status: 'pending' }
    }
  };
}

// Cloud Runのwebhookを手動でトリガー
async function triggerWebhook(storyId, userId) {
  const https = require('https');

  // Service Keyを使用してadminクライアントを作成（書き込み権限が必要）
  const { createClient } = require('@supabase/supabase-js');
  const adminSupabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || supabaseServiceKey
  );

  // ストーリー情報を取得して、テスト用のscript_jsonを作成
  const { data: story } = await adminSupabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single();

  if (!story) {
    throw new Error('Story not found');
  }

  // テスト用の最小限のMulmoScript
  const testScript = {
    lang: "ja",
    beats: [
      {
        text: `${story.title}の物語が始まる。${story.text_raw.substring(0, 100)}`,
        speaker: "Narrator",
        imagePrompt: "シンプルな背景、ミニマルなアニメ風イラスト、パステルカラー"
      }
    ],
    title: story.title,
    "$mulmocast": {
      version: "1.0"
    },
    imageParams: {
      model: "gpt-image-1",
      style: "アニメ風ソフトパステルカラー",
      quality: "low"  // テスト用に画像品質をlowに設定
    },
    speechParams: {
      provider: "openai",
      speakers: {
        "Narrator": {
          voiceId: "alloy",
          displayName: {
            en: "Narrator",
            ja: "ナレーター"
          }
        }
      }
    }
  };

  // script_jsonを更新
  await adminSupabase
    .from('stories')
    .update({
      script_json: testScript,
      status: 'script_generated'
    })
    .eq('id', storyId);

  // ビデオレコードを作成
  const { data: video } = await adminSupabase
    .from('videos')
    .insert({
      story_id: storyId,
      uid: userId,
      status: 'processing'
    })
    .select()
    .single();

  const payload = {
    type: 'video_generation',
    payload: {
      video_id: video.id,
      story_id: storyId,
      uid: userId,
      title: story.title,
      text_raw: story.text_raw,
      script_json: testScript
    }
  };

  const data = JSON.stringify(payload);

  console.log('Webhook payload size:', data.length, 'bytes');
  console.log('Webhook payload preview:', data.substring(0, 200) + '...');

  const options = {
    hostname: 'showgeki2-auto-process-mqku5oexhq-an.a.run.app',
    path: '/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data, 'utf8')
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log(`Webhook response status: ${res.statusCode}`);
        console.log(`Webhook response body: ${body}`);
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(body);
            resolve({ video_id: video.id, response });
          } catch (e) {
            // JSONパースエラーでも成功とみなす
            resolve({ video_id: video.id });
          }
        } else if (res.statusCode === 429) {
          // レート制限エラー
          console.log(`⚠️ Rate limit exceeded for video ${video.id}`);
          reject(new Error(`Webhook failed with status 429: Rate limit exceeded`));
        } else if (res.statusCode === 500) {
          // エラーレスポンスの詳細を取得
          try {
            const errorResponse = JSON.parse(body);
            reject(new Error(`Webhook failed: ${errorResponse.error || errorResponse.message || body}`));
          } catch (e) {
            reject(new Error(`Webhook failed with status ${res.statusCode}: ${body}`));
          }
        } else {
          reject(new Error(`Webhook failed with status ${res.statusCode}: ${body}`));
        }
      });
    });

    // タイムアウトを10分に設定
    req.setTimeout(600000, () => {
      req.destroy();
      reject(new Error('Webhook request timeout after 10 minutes'));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ストーリー作成
async function createStory(userMetrics, storyTemplate) {
  console.log(`[User ${userMetrics.userId}] 📝 ストーリー作成開始: ${storyTemplate.title}`);
  userMetrics.steps.storyCreation.start = new Date();

  try {
    // まず、デフォルトのワークスペースを作成または取得
    const testUid = `load-test-user-${userMetrics.userId}`;
    userMetrics.uid = testUid;

    // ワークスペースを確認/作成
    let { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('uid', testUid)
      .single();

    if (wsError || !workspace) {
      // ワークスペースが存在しない場合は作成
      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          uid: testUid,
          name: `Load Test Workspace ${userMetrics.userId}`
        })
        .select()
        .single();

      if (createError) throw createError;
      workspace = newWorkspace;
    }

    userMetrics.workspaceId = workspace.id;

    // ストーリーを作成
    const { data, error } = await supabase
      .from('stories')
      .insert({
        workspace_id: workspace.id,
        uid: testUid,
        title: storyTemplate.title,
        text_raw: storyTemplate.content,
        status: 'draft',
        beats: 5 // デフォルトは5シーン
      })
      .select()
      .single();

    if (error) throw error;

    userMetrics.storyId = data.id;

    // Webhookを手動でトリガー（同期的に処理完了まで待つ）
    console.log(`[User ${userMetrics.userId}] 🔔 Webhookトリガー中（処理完了まで待機）...`);
    
    // 各フェーズの開始時刻を記録
    userMetrics.steps.scriptGeneration.start = new Date();
    userMetrics.steps.videoGeneration.start = new Date();
    
    try {
      const result = await triggerWebhook(data.id, testUid);
      
      // Webhookが成功 = 全処理完了
      const now = new Date();
      
      // 台本生成完了
      userMetrics.steps.scriptGeneration.end = now;
      userMetrics.steps.scriptGeneration.duration = userMetrics.steps.scriptGeneration.end - userMetrics.steps.scriptGeneration.start;
      userMetrics.steps.scriptGeneration.status = 'completed';
      
      // 動画生成完了
      userMetrics.steps.videoGeneration.end = now;
      userMetrics.steps.videoGeneration.duration = userMetrics.steps.videoGeneration.end - userMetrics.steps.videoGeneration.start;
      userMetrics.steps.videoGeneration.status = 'completed';
      
      userMetrics.videoId = result.video_id;
      
      console.log(`[User ${userMetrics.userId}] ✅ 動画生成完了: video_id=${result.video_id}`);
    } catch (webhookError) {
      console.error(`[User ${userMetrics.userId}] ❌ Webhookエラー:`, webhookError.message);
      
      // エラー時のステータス更新
      userMetrics.steps.scriptGeneration.status = 'failed';
      userMetrics.steps.scriptGeneration.error = webhookError.message;
      userMetrics.steps.videoGeneration.status = 'failed';
      userMetrics.steps.videoGeneration.error = webhookError.message;
      
      throw webhookError; // エラーを上位に伝播
    }

    userMetrics.steps.storyCreation.end = new Date();
    userMetrics.steps.storyCreation.duration = userMetrics.steps.storyCreation.end - userMetrics.steps.storyCreation.start;
    userMetrics.steps.storyCreation.status = 'completed';

    console.log(`[User ${userMetrics.userId}] ✅ ストーリー作成完了: ID=${data.id}`);
    return data;
  } catch (error) {
    userMetrics.steps.storyCreation.status = 'failed';
    userMetrics.steps.storyCreation.error = error.message;
    throw error;
  }
}

// ストーリーのステータスを確認
async function waitForScriptGeneration(userMetrics, storyId) {
  console.log(`[User ${userMetrics.userId}] ⏳ 台本生成待機中...`);
  userMetrics.steps.scriptGeneration.start = new Date();

  const startTime = Date.now();

  while (Date.now() - startTime < TEST_CONFIG.MAX_WAIT_TIME) {
    const { data, error } = await supabase
      .from('stories')
      .select('status, script_json')
      .eq('id', storyId)
      .single();

    if (error) {
      console.error(`[User ${userMetrics.userId}] ❌ ステータス確認エラー:`, error);
      throw error;
    }

    if (data.status === 'script_generated' && data.script_json) {
      userMetrics.steps.scriptGeneration.end = new Date();
      userMetrics.steps.scriptGeneration.duration = userMetrics.steps.scriptGeneration.end - userMetrics.steps.scriptGeneration.start;
      userMetrics.steps.scriptGeneration.status = 'completed';
      console.log(`[User ${userMetrics.userId}] ✅ 台本生成完了`);
      return data;
    }

    if (data.status === 'failed') {
      userMetrics.steps.scriptGeneration.status = 'failed';
      throw new Error('台本生成に失敗しました');
    }

    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.POLLING_INTERVAL));
  }

  userMetrics.steps.scriptGeneration.status = 'timeout';
  throw new Error('台本生成がタイムアウトしました');
}

// 動画生成完了を待機
async function waitForVideoGeneration(userMetrics, storyId) {
  console.log(`[User ${userMetrics.userId}] 🎬 動画生成待機中...`);
  userMetrics.steps.videoGeneration.start = new Date();

  const startTime = Date.now();

  while (Date.now() - startTime < TEST_CONFIG.MAX_WAIT_TIME) {
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, status, url')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[User ${userMetrics.userId}] ❌ 動画ステータス確認エラー:`, error);
      throw error;
    }

    const completedVideo = videos?.find(v => v.status === 'completed' && v.url);
    if (completedVideo) {
      userMetrics.videoId = completedVideo.id;
      userMetrics.steps.videoGeneration.end = new Date();
      userMetrics.steps.videoGeneration.duration = userMetrics.steps.videoGeneration.end - userMetrics.steps.videoGeneration.start;
      userMetrics.steps.videoGeneration.status = 'completed';
      console.log(`[User ${userMetrics.userId}] ✅ 動画生成完了: ${completedVideo.url}`);
      return completedVideo;
    }

    const failedVideo = videos?.find(v => v.status === 'failed');
    if (failedVideo) {
      userMetrics.steps.videoGeneration.status = 'failed';
      throw new Error('動画生成に失敗しました');
    }

    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.POLLING_INTERVAL));
  }

  userMetrics.steps.videoGeneration.status = 'timeout';
  throw new Error('動画生成がタイムアウトしました');
}

// 単一ユーザーのフルフロー実行
async function runSingleUserFlow(userId) {
  const storyTemplate = STORY_TEMPLATES[userId % STORY_TEMPLATES.length];
  const userMetrics = createUserMetrics(userId, storyTemplate);
  metrics.users.push(userMetrics);

  try {
    // ストーリー作成とwebhook処理（全て同期的に実行）
    const story = await createStory(userMetrics, storyTemplate);

    // 完了（createStory内でwebhookが完了している）
    userMetrics.endTime = new Date();
    userMetrics.duration = userMetrics.endTime - userMetrics.startTime;
    userMetrics.status = 'completed';
    metrics.summary.successCount++;

    console.log(`[User ${userMetrics.userId}] 🎉 フルフロー完了: ${userMetrics.duration}ms`);

  } catch (error) {
    userMetrics.endTime = new Date();
    userMetrics.duration = userMetrics.endTime - userMetrics.startTime;
    userMetrics.status = 'failed';
    userMetrics.error = error.message;
    metrics.summary.failureCount++;

    console.error(`[User ${userMetrics.userId}] ❌ エラー: ${error.message}`);
  }

  return userMetrics;
}

// レポート生成
async function generateReport(exportExcel = false) {
  // サマリー計算
  const completedUsers = metrics.users.filter(u => u.status === 'completed');
  if (completedUsers.length > 0) {
    const durations = completedUsers.map(u => u.duration);
    metrics.summary.averageTime = durations.reduce((a, b) => a + b, 0) / durations.length;
    metrics.summary.minTime = Math.min(...durations);
    metrics.summary.maxTime = Math.max(...durations);
  }

  // コンソールにサマリー表示
  console.log('\n========== テスト結果サマリー ==========');
  console.log(`総ユーザー数: ${metrics.summary.totalUsers}`);
  console.log(`成功: ${metrics.summary.successCount} (${(metrics.summary.successCount / metrics.summary.totalUsers * 100).toFixed(1)}%)`);
  console.log(`失敗: ${metrics.summary.failureCount}`);
  console.log(`平均処理時間: ${Math.round(metrics.summary.averageTime / 1000)}秒`);
  console.log(`最短/最長: ${Math.round(metrics.summary.minTime / 1000)}秒 / ${Math.round(metrics.summary.maxTime / 1000)}秒`);
  console.log('=====================================\n');

  // 詳細表示
  console.log('詳細結果:');
  console.log('ID\tステータス\t処理時間\tストーリー\tエラー');
  console.log('-'.repeat(80));
  
  metrics.users.forEach(user => {
    const duration = user.duration ? `${Math.round(user.duration / 1000)}秒` : '-';
    const error = user.error ? user.error.substring(0, 30) + '...' : '-';
    console.log(`${user.userId}\t${user.status}\t${duration}\t${user.storyTitle}\t${error}`);
  });

  if (!exportExcel) {
    return;
  }

  // Excel作成（--excelフラグが指定された場合のみ）
  const workbook = new ExcelJS.Workbook();

  // サマリーシート
  const summarySheet = workbook.addWorksheet('サマリー');
  summarySheet.columns = [
    { header: '項目', key: 'item', width: 30 },
    { header: '値', key: 'value', width: 20 }
  ];

  summarySheet.addRows([
    { item: 'テスト開始時刻', value: metrics.startTime.toLocaleString('ja-JP') },
    { item: 'テスト終了時刻', value: new Date().toLocaleString('ja-JP') },
    { item: '総ユーザー数', value: metrics.summary.totalUsers },
    { item: '成功数', value: metrics.summary.successCount },
    { item: '失敗数', value: metrics.summary.failureCount },
    { item: '成功率', value: `${(metrics.summary.successCount / metrics.summary.totalUsers * 100).toFixed(1)}%` },
    { item: '平均処理時間', value: `${Math.round(metrics.summary.averageTime / 1000)}秒` },
    { item: '最短処理時間', value: `${Math.round(metrics.summary.minTime / 1000)}秒` },
    { item: '最長処理時間', value: `${Math.round(metrics.summary.maxTime / 1000)}秒` }
  ]);

  // 詳細シート
  const detailSheet = workbook.addWorksheet('詳細');
  detailSheet.columns = [
    { header: 'ユーザーID', key: 'userId', width: 12 },
    { header: 'ストーリータイトル', key: 'storyTitle', width: 30 },
    { header: 'ステータス', key: 'status', width: 12 },
    { header: '総処理時間(秒)', key: 'duration', width: 15 },
    { header: 'ストーリー作成(秒)', key: 'storyDuration', width: 18 },
    { header: '台本生成(秒)', key: 'scriptDuration', width: 15 },
    { header: '動画生成(秒)', key: 'videoDuration', width: 15 },
    { header: 'エラー', key: 'error', width: 40 }
  ];

  metrics.users.forEach(user => {
    detailSheet.addRow({
      userId: user.userId,
      storyTitle: user.storyTitle,
      status: user.status,
      duration: user.duration ? Math.round(user.duration / 1000) : '-',
      storyDuration: user.steps.storyCreation.duration ? Math.round(user.steps.storyCreation.duration / 1000) : '-',
      scriptDuration: user.steps.scriptGeneration.duration ? Math.round(user.steps.scriptGeneration.duration / 1000) : '-',
      videoDuration: user.steps.videoGeneration.duration ? Math.round(user.steps.videoGeneration.duration / 1000) : '-',
      error: user.error || '-'
    });
  });

  // ファイル保存
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `load_test_report_${timestamp}.xlsx`;
  const filepath = path.join(process.cwd(), filename);

  await workbook.xlsx.writeFile(filepath);
  console.log(`\n📊 Excelレポートを生成しました: ${filename}`);
}

// メイン処理
async function main() {
  console.log('🚀 負荷テストを開始します');
  console.log(`📊 設定: ${TEST_CONFIG.CONCURRENT_USERS}ユーザー同時実行\n`);

  try {
    // 全ユーザー同時実行
    console.log(`🔥 ${TEST_CONFIG.CONCURRENT_USERS}ユーザー全員を同時に開始します\n`);
    const promises = [];
    for (let i = 0; i < TEST_CONFIG.CONCURRENT_USERS; i++) {
      promises.push(runSingleUserFlow(i + 1));
    }
    await Promise.all(promises);

    // レポート生成
    await generateReport(exportExcel);

  } catch (error) {
    console.error('❌ テスト実行中にエラーが発生しました:', error);
  } finally {
    // 接続をクリーンアップ
    console.log('\n🧹 クリーンアップ中...');
    
    // HTTPSグローバルエージェントの接続を閉じる
    const https = require('https');
    if (https.globalAgent) {
      https.globalAgent.destroy();
    }
    
    // 少し待機してから終了
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// 実行
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ メイン処理が完了しました');
      process.exit(0); // 明示的に終了
    })
    .catch(error => {
      console.error('❌ メイン処理でエラー:', error);
      process.exit(1);
    });
}

module.exports = { main };