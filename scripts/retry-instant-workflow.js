#!/usr/bin/env node

/**
 * インスタントモードで中断されたワークフローを再実行するスクリプト
 * 
 * 使用方法:
 * node scripts/retry-instant-workflow.js <workflow_id>
 * 
 * オプション:
 * --dry-run: 実行せずに状態確認のみ
 * --from-step <N>: 特定のステップから開始（デフォルト: 1）
 * 
 * 例:
 * node scripts/retry-instant-workflow.js 123e4567-e89b-12d3-a456-426614174000
 * node scripts/retry-instant-workflow.js 123e4567-e89b-12d3-a456-426614174000 --from-step 3
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

// APIベースURL（ローカル開発環境用）
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Webhook URLを選択
 */
function selectWebhookUrl(target) {
  const webhookUrls = {
    'local': 'http://localhost:8080/webhook',
    'production': 'https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/webhook',
    'debug': 'https://showgeki2-auto-process-debug-mqku5oexhq-an.a.run.app/webhook'
  };

  // targetが指定されていない場合は環境変数から読み取り、それもなければローカル
  if (!target) {
    const envUrl = process.env.CLOUD_RUN_WEBHOOK_URL || process.env.WEBHOOK_URL;
    if (envUrl) {
      return envUrl;
    }
    return webhookUrls.local;
  }

  return webhookUrls[target] || webhookUrls.local;
}

/**
 * 直接Webhookを送信
 */
async function sendWebhookDirectly(videoId, storyId, uid, title, textRaw, scriptJson, webhookTarget) {
  const webhookUrl = selectWebhookUrl(webhookTarget);
  
  console.log(`🚀 Webhook直接送信: ${webhookUrl}`);
  
  const webhookPayload = {
    type: 'video_generation',
    payload: {
      video_id: videoId,
      story_id: storyId,
      uid: uid,
      title: title || '無題の作品',
      text_raw: textRaw || '',
      script_json: scriptJson
    }
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Webhook送信失敗: ${response.status} ${errorText}`);
  }

  return response;
}

/**
 * ワークフローの現在の状態を確認
 */
async function checkWorkflowStatus(workflowId) {
  const { data: workflow, error } = await supabase
    .from('workflows')
    .select(`
      *,
      storyboard:storyboards(*)
    `)
    .eq('id', workflowId)
    .single();

  if (error || !workflow) {
    throw new Error(`ワークフローが見つかりません: ${workflowId}`);
  }

  return workflow;
}

/**
 * 各ステップのAPIを呼び出す
 */
async function executeStep(workflowId, stepNumber, uid, storyboardId, webhookTarget) {
  console.log(`\n📝 Step ${stepNumber} を実行中...`);
  const startTime = Date.now();

  try {
    // 1. Step1の場合は、ストーリーボードのoriginalTextを使用
    let stepInput;
    if (stepNumber === 1) {
      console.log(`  📖 ストーリーボードからoriginalTextを取得中...`);
      const { data: storyboard, error: storyboardError } = await supabase
        .from('storyboards')
        .select('story_data')
        .eq('id', storyboardId)
        .single();

      if (storyboardError || !storyboard) {
        throw new Error(`ストーリーボード取得失敗: ${storyboardError?.message || 'データが見つかりません'}`);
      }

      if (!storyboard.story_data?.originalText) {
        throw new Error('originalTextが見つかりません。インスタントモードで作成されたワークフローではない可能性があります。');
      }

      stepInput = {
        storyText: storyboard.story_data.originalText,
        characters: storyboard.story_data.characters || '',
        dramaticTurningPoint: storyboard.story_data.dramaticTurningPoint || '',
        futureVision: storyboard.story_data.futureVision || '',
        learnings: storyboard.story_data.learnings || '',
        totalScenes: storyboard.story_data.totalScenes || 5,
        settings: storyboard.story_data.settings || {
          style: 'shakespeare',
          language: 'ja'
        }
      };
      console.log(`  ✅ originalText取得完了: "${stepInput.storyText.substring(0, 50)}..."`);
    } else {
      // Step2以降は従来通りAPIから取得
      const getResponse = await fetch(`${API_BASE_URL}/api/workflow/${workflowId}/step/${stepNumber}`, {
        method: 'GET',
        headers: {
          'X-User-UID': uid,
        },
      });

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        throw new Error(`Step ${stepNumber} データ取得失敗: ${getResponse.status} ${errorText}`);
      }

      stepInput = await getResponse.json();
      console.log(`  ✅ Step ${stepNumber} 入力データ取得完了`);
    }

    // 2. ステップに応じたuserInputを構築
    let stepOutput;
    switch (stepNumber) {
      case 1:
        // Step1: ストーリーボードのoriginalTextを使用
        stepOutput = {
          userInput: {
            storyText: stepInput.storyText,
            characters: stepInput.characters,
            dramaticTurningPoint: stepInput.dramaticTurningPoint,
            futureVision: stepInput.futureVision,
            learnings: stepInput.learnings,
            totalScenes: stepInput.totalScenes,
            settings: stepInput.settings
          }
        };
        break;

      case 2:
        // Step2: タイトルと幕場構成
        stepOutput = {
          userInput: {
            title: stepInput.suggestedTitle || '未来への扉',
            acts: stepInput.acts || []
          }
        };
        break;

      case 3:
        // Step3: キャラクター設定（変更なし）
        stepOutput = {
          userInput: {
            characters: stepInput.detailedCharacters?.map(char => ({
              id: char.id,
              name: char.name,
              description: `${char.personality}\n${char.visualDescription}`,
              faceReference: undefined
            })) || [],
            imageStyle: {
              preset: 'anime',
              customPrompt: ''
            }
          }
        };
        break;

      case 4:
        // Step4: 台本（変更なし）
        stepOutput = {
          userInput: {
            scenes: stepInput.scenes?.map(scene => ({
              id: scene.id,
              imagePrompt: scene.imagePrompt,
              dialogue: scene.dialogue
            })) || []
          }
        };
        break;

      case 5:
        // Step5: 音声設定
        stepOutput = {
          userInput: {
            voiceSettings: {}
          }
        };
        // デフォルトの音声設定
        if (stepInput.characters) {
          stepInput.characters.forEach(char => {
            stepOutput.userInput.voiceSettings[char.id] = {
              voiceType: char.suggestedVoice || 'alloy'
            };
          });
        }
        break;

      case 6:
        // Step6: BGM・字幕設定
        stepOutput = {
          userInput: {
            bgm: {
              selected: stepInput.suggestedBgm || 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3',
              volume: 0.5
            },
            caption: {
              enabled: true,
              language: 'ja',
              styles: []
            }
          }
        };
        break;

      case 7:
        // Step7: 最終確認
        stepOutput = {
          userInput: {
            title: stepInput.title || '未来への扉',
            description: stepInput.description || 'AIが生成した物語',
            tags: ['AI生成', 'インスタントモード'],
            confirmed: true
          }
        };
        break;

      default:
        throw new Error(`不明なステップ番号: ${stepNumber}`);
    }

    // 3. ステップを実行
    const postResponse = await fetch(`${API_BASE_URL}/api/workflow/${workflowId}/step/${stepNumber}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-UID': uid,
      },
      body: JSON.stringify(stepOutput),
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      throw new Error(`Step ${stepNumber} 実行失敗: ${postResponse.status} ${errorText}`);
    }

    const result = await postResponse.json();
    console.log(`  ✅ Step ${stepNumber} 完了`);

    // Step7完了後は動画生成（Webhook指定がある場合は直接送信）
    if (stepNumber === 7) {
      console.log('\n🎬 動画生成を開始...');
      
      if (webhookTarget) {
        // 直接Webhookを送信
        // 実際のストーリーボード情報をデータベースから取得
        const { data: storyboard, error: storyboardError } = await supabase
          .from('storyboards')
          .select('id, title, mulmoscript, summary_data, story_data')
          .eq('id', storyboardId)
          .single();

        if (storyboardError || !storyboard) {
          throw new Error(`ストーリーボード取得失敗: ${storyboardError?.message || 'データが見つかりません'}`);
        }

        if (!storyboard.mulmoscript) {
          throw new Error('MulmoScriptが見つかりません。ワークフローが完了していない可能性があります。');
        }
        
        // 動画レコードを作成
        const { data: video, error: videoError } = await supabase
          .from('videos')
          .insert({
            story_id: storyboardId,
            uid: uid,
            status: 'queued',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (videoError || !video) {
          throw new Error(`動画レコード作成失敗: ${videoError?.message}`);
        }

        // 直接Webhookを送信
        await sendWebhookDirectly(
          video.id,
          storyboardId,
          uid,
          storyboard.title || '未来への扉',
          storyboard.summary_data?.description || storyboard.story_data?.originalText || 'AIが生成した物語',
          storyboard.mulmoscript, // 正しいMulmoScript
          webhookTarget
        );
        
        console.log('  ✅ Webhook送信完了:', video.id);
      } else {
        // 通常のAPI経由
        const generateResponse = await fetch(`${API_BASE_URL}/api/workflow/${workflowId}/generate-script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-UID': uid,
          },
          body: JSON.stringify({
            mode: 'video'
          }),
        });

        if (!generateResponse.ok) {
          const errorText = await generateResponse.text();
          throw new Error(`動画生成失敗: ${generateResponse.status} ${errorText}`);
        }

        const generateResult = await generateResponse.json();
        console.log('  ✅ 動画生成開始:', generateResult);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ⏱️  実行時間: ${duration}秒`);
    
    return result;
  } catch (error) {
    console.error(`  ❌ Step ${stepNumber} エラー:`, error.message);
    throw error;
  }
}

/**
 * ワークフローを最初から再実行
 */
async function retryWorkflow(workflowId, options = {}) {
  const { fromStep = 1, dryRun = false, webhookTarget = null } = options;
  
  console.log('🚀 ワークフロー再実行を開始します...');
  console.log(`  ワークフローID: ${workflowId}`);
  console.log(`  開始ステップ: ${fromStep}`);
  console.log(`  モード: ${dryRun ? 'DRY RUN' : '実行'}`);
  if (webhookTarget) {
    console.log(`  Webhook宛先: ${webhookTarget}`);
  }

  try {
    // 1. ワークフローの状態確認
    const workflow = await checkWorkflowStatus(workflowId);
    console.log('\n📊 現在の状態:');
    console.log(`  ステータス: ${workflow.status}`);
    console.log(`  現在のステップ: ${workflow.current_step}`);
    console.log(`  作成日時: ${workflow.created_at}`);
    console.log(`  UID: ${workflow.uid}`);

    if (workflow.status === 'completed') {
      console.log('\n✅ このワークフローは既に完了しています');
      return;
    }

    if (dryRun) {
      console.log('\n📝 DRY RUNモード: 実際の実行は行いません');
      
      // 各ステップの状態を確認
      for (let step = 1; step <= 7; step++) {
        const hasIn = workflow[`step${step}_in`] ? '✓' : '✗';
        const hasOut = workflow[`step${step}_out`] ? '✓' : '✗';
        console.log(`  Step${step}: in=${hasIn}, out=${hasOut}`);
      }
      
      return;
    }

    // 2. 各ステップを順番に実行
    const totalStartTime = Date.now();
    for (let step = fromStep; step <= 7; step++) {
      await executeStep(workflowId, step, workflow.uid, workflow.storyboard_id, webhookTarget);
      
      // ステップ間で少し待機（API負荷軽減）
      if (step < 7) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. ワークフローのステータスを更新
    const { error: updateError } = await supabase
      .from('workflows')
      .update({ 
        status: 'completed',
        current_step: 7
      })
      .eq('id', workflowId);

    if (updateError) {
      console.error('⚠️  ワークフローステータス更新エラー:', updateError);
    } else {
      console.log('\n✅ ワークフロー完了！');
    }

    // 合計実行時間を表示
    const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(1);
    console.log(`\n⏱️  合計実行時間: ${totalDuration}秒 (${Math.floor(totalDuration / 60)}分${(totalDuration % 60).toFixed(0)}秒)`);

    // 4. 最終的な状態を確認
    const finalWorkflow = await checkWorkflowStatus(workflowId);
    console.log('\n📊 最終状態:');
    console.log(`  ステータス: ${finalWorkflow.status}`);
    console.log(`  現在のステップ: ${finalWorkflow.current_step}`);

    // 動画URLがあれば表示
    const { data: videos } = await supabase
      .from('videos')
      .select('*')
      .eq('story_id', finalWorkflow.storyboard_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (videos && videos.length > 0) {
      console.log(`  動画URL: ${videos[0].video_url}`);
      console.log(`  動画ステータス: ${videos[0].status}`);
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    throw error;
  }
}

// コマンドライン引数の処理
const args = process.argv.slice(2);
const workflowId = args.find(arg => !arg.startsWith('--'));

// オプション解析
const dryRun = args.includes('--dry-run');
const listWebhooks = args.includes('--list-webhooks');

// Webhook宛先の解析
let webhookTarget = null;
const webhookIndex = args.indexOf('--webhook');
if (webhookIndex !== -1 && args[webhookIndex + 1]) {
  webhookTarget = args[webhookIndex + 1];
}

// --from-step オプション
let fromStep = 1;
const fromStepIndex = args.indexOf('--from-step');
if (fromStepIndex !== -1 && args[fromStepIndex + 1]) {
  fromStep = parseInt(args[fromStepIndex + 1], 10);
  if (isNaN(fromStep) || fromStep < 1 || fromStep > 7) {
    console.error('❌ --from-step は1-7の数値を指定してください');
    process.exit(1);
  }
}

// Webhook一覧表示モード
if (listWebhooks) {
  console.log('🔧 利用可能なWebhook宛先:');
  console.log('  local      : http://localhost:8080/webhook (デフォルト)');
  console.log('  production : https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/webhook');
  console.log('  debug      : https://showgeki2-auto-process-debug-mqku5oexhq-an.a.run.app/webhook');
  console.log('\n使用例:');
  console.log('  node scripts/retry-instant-workflow.js <workflow_id> --webhook production');
  console.log('  node scripts/retry-instant-workflow.js <workflow_id> --webhook debug');
  process.exit(0);
}

if (!workflowId) {
  console.error('❌ ワークフローIDを指定してください');
  console.log('\n使用方法:');
  console.log('  node scripts/retry-instant-workflow.js <workflow_id>');
  console.log('  node scripts/retry-instant-workflow.js <workflow_id> --dry-run');
  console.log('  node scripts/retry-instant-workflow.js <workflow_id> --from-step 3');
  console.log('  node scripts/retry-instant-workflow.js <workflow_id> --webhook <target>');
  console.log('  node scripts/retry-instant-workflow.js --list-webhooks');
  process.exit(1);
}

// 実行
retryWorkflow(workflowId, { fromStep, dryRun, webhookTarget })
  .then(() => {
    console.log('\n🎉 処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 処理が失敗しました:', error);
    process.exit(1);
  });