#!/usr/bin/env node

/**
 * Cloud Run Webhook 並列実行テストスクリプト
 * 
 * 複数の動画生成リクエストを同時に送信して、同時並列実行問題をテストします。
 */

const https = require('https');
const crypto = require('crypto');

// 設定
const CLOUD_RUN_URL = 'https://showgeki2-auto-process-mqku5oexhq-an.a.run.app';
const WEBHOOK_ENDPOINT = '/webhook';
const CONCURRENT_REQUESTS = 3; // 同時実行する動画生成リクエスト数

// UUIDv4生成関数
function generateUUID() {
  return crypto.randomUUID();
}

// テスト用の動画生成ペイロード作成
function createVideoGenerationPayload(index) {
  const video_id = generateUUID();
  const story_id = generateUUID();
  const uid = generateUUID();

  return {
    type: 'video_generation',
    payload: {
      video_id: video_id,
      story_id: story_id,
      uid: uid,
      title: `油ハムの奇跡の旅 (テスト ${index})`,
      text_raw: `これは同時並列実行テスト用のテキストです。テスト番号: ${index}`,
      script_json: {
        "lang": "ja",
        "beats": [
          {
            "text": "かつて、アブラハムの影から生まれた息子、油ハム。その名が運命を呼ぶ夜、風はささやき、世界は静かに息を潜めた。",
            "speaker": "Character",
            "imagePrompt": "薄曇りの夜明け、古代の荒野に立つ若き油ハム。光と影が交錯し、静けさの中に冒険の予感が漂う。"
          },
          {
            "text": "俺は油ハム。親父は偉大だったけど、俺は俺の道を探したいんだ。誰に何を言われても、自分で奇跡を見つけてやるよ。",
            "speaker": "Character",
            "imagePrompt": "自信に満ちた青年油ハムが、手に小さなランプを持ち、荒野の中で一歩踏み出す瞬間。希望に満ちた表情が印象的。"
          },
          {
            "text": "運命の旅路で、油ハムは迷い、涙し、ときに立ち止まった。しかし、彼の心に灯る炎は決して絶えることなく、進み続けた。",
            "speaker": "Narrator",
            "imagePrompt": "嵐の中、油ハムが雨に打たれながらも前を見据えて歩む。空には稲妻が走り、彼の足元には光と影が交錯している。"
          },
          {
            "text": "迷うことを恐れるな。迷いの中でこそ、真実の自分に出会うのだから。油ハム、お前の歩みが未来を照らす灯火となるだろう。",
            "speaker": "WiseCharacter",
            "imagePrompt": "旅の途中で出会った賢者が、油ハムの肩に手を置き、星空の下で静かに語りかける。温かな光が二人を包む。"
          },
          {
            "text": "そして夜明け。油ハムの足跡は黄金色に輝き、彼の心に新たな奇跡が芽生えた。彼の旅は、世界に小さな希望を残したのだった。",
            "speaker": "Narrator",
            "imagePrompt": "朝日が差し込む丘の上で、油ハムが振り返り穏やかに微笑む。背後に伸びる彼の足跡が光り輝く。"
          },
          {
            "text": "あいうえお",
            "speaker": "Character",
            "imagePrompt": "ドラえもんとフリーザが対決する"
          }
        ],
        "title": "油ハムの奇跡の旅",
        "$mulmocast": { "version": "1.0" },
        "imageParams": {
          "model": "gpt-image-1",
          "style": "リアル写真、高解像度、プロフェッショナル照明",
          "quality": "low"
        },
        "speechParams": {
          "provider": "openai",
          "speakers": {
            "Narrator": {
              "voiceId": "shimmer",
              "displayName": { "en": "Narrator", "ja": "語り手" }
            },
            "Character": {
              "voiceId": "alloy",
              "displayName": { "en": "Main Character", "ja": "主人公" }
            },
            "WiseCharacter": {
              "voiceId": "echo",
              "displayName": { "en": "Wise Character", "ja": "賢者" }
            }
          }
        }
      }
    }
  };
}

// HTTPSリクエスト送信
function sendWebhookRequest(payload, index) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: new URL(CLOUD_RUN_URL).hostname,
      port: 443,
      path: WEBHOOK_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'webhook-concurrent-test/1.0'
      }
    };

    const startTime = Date.now();

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          index: index,
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: responseTime,
          payload: payload.payload
        });
      });
    });

    req.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      reject({
        index: index,
        error: err.message,
        responseTime: responseTime
      });
    });

    req.write(postData);
    req.end();
  });
}

// ヘルスチェック実行
async function checkHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(CLOUD_RUN_URL).hostname,
      port: 443,
      path: '/health',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// メイン実行関数
async function runConcurrentTest() {
  console.log('🚀 Cloud Run Webhook 並列実行テスト開始');
  console.log(`📍 Target URL: ${CLOUD_RUN_URL}${WEBHOOK_ENDPOINT}`);
  console.log(`🔢 同時実行数: ${CONCURRENT_REQUESTS}`);
  console.log('');

  try {
    // ヘルスチェック
    console.log('🏥 ヘルスチェック実行中...');
    const health = await checkHealth();
    if (health.statusCode === 200) {
      console.log('✅ サービスは正常に動作しています');
    } else {
      console.log(`⚠️ ヘルスチェック異常: HTTP ${health.statusCode}`);
    }
    console.log('');

    // 並列リクエスト準備
    const requests = [];
    for (let i = 1; i <= CONCURRENT_REQUESTS; i++) {
      const payload = createVideoGenerationPayload(i);
      console.log(`📦 リクエスト ${i} 準備完了 (video_id: ${payload.payload.video_id})`);
      requests.push(sendWebhookRequest(payload, i));
    }
    console.log('');

    // 並列実行開始
    console.log('🎯 並列リクエスト実行開始...');
    const testStartTime = Date.now();

    const results = await Promise.allSettled(requests);

    const totalTime = Date.now() - testStartTime;
    console.log(`⏱️ 全リクエスト完了: ${totalTime}ms`);
    console.log('');

    // 結果分析
    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const res = result.value;
        successCount++;
        console.log(`✅ リクエスト ${res.index}:`);
        console.log(`   HTTP ${res.statusCode} - ${res.responseTime}ms`);
        console.log(`   video_id: ${res.payload.video_id}`);
        try {
          const responseData = JSON.parse(res.body);
          console.log(`   Response: ${JSON.stringify(responseData)}`);
        } catch (e) {
          console.log(`   Response: ${res.body.substring(0, 100)}...`);
        }
      } else {
        const err = result.reason;
        errorCount++;
        console.log(`❌ リクエスト ${err.index}:`);
        console.log(`   エラー: ${err.error} - ${err.responseTime}ms`);
      }
      console.log('');
    });

    // サマリー
    console.log('📊 テスト結果サマリー:');
    console.log(`   成功: ${successCount}/${CONCURRENT_REQUESTS}`);
    console.log(`   失敗: ${errorCount}/${CONCURRENT_REQUESTS}`);
    console.log(`   総実行時間: ${totalTime}ms`);
    console.log('');

    if (successCount === CONCURRENT_REQUESTS) {
      console.log('🎉 全リクエスト成功！並列処理が正常に動作しています。');
    } else {
      console.log('⚠️ 一部のリクエストが失敗しました。Cloud Runのログを確認してください。');
    }

    // Cloud Runログ確認コマンド
    console.log('');
    console.log('📋 Cloud Runログ確認コマンド:');
    console.log('gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=showgeki2-auto-process" --limit=50 --project=showgeki2 --format="table(timestamp,jsonPayload.message)"');

  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  // Cloud Run URLの確認（不要になったがサンプルとして残す）
  console.log('🔗 Cloud Run URL:', CLOUD_RUN_URL);

  runConcurrentTest().catch(console.error);
}

module.exports = {
  runConcurrentTest,
  createVideoGenerationPayload,
  sendWebhookRequest
};