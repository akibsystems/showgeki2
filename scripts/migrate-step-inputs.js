#!/usr/bin/env node

/**
 * 既存のワークフローデータをstepN_inputカラムに移行するスクリプト
 * 
 * このスクリプトは既存のstepN_inとstepN_outデータを新しいstepN_inputカラムに統合します。
 * storyboardからの生成は行わず、既存のデータのみを使用します。
 * 
 * 実行方法:
 * node scripts/migrate-step-inputs.js
 * 
 * --dry-run オプションで実際の更新を行わずに確認
 * node scripts/migrate-step-inputs.js --dry-run
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
 * 既存のstepN_outデータとマージ
 */
function mergeWithExistingOutput(stepNumber, baseInput, stepOutput) {
  if (!stepOutput?.userInput) {
    return baseInput;
  }

  switch (stepNumber) {
    case 1:
      // Step1はuserInputがそのまま画面データ
      return stepOutput.userInput;

    case 2:
      // Step2はtitleとactsをマージ
      return {
        ...baseInput,
        ...stepOutput.userInput
      };

    case 3:
      // Step3はcharactersとimageStyleをマージ
      return {
        ...baseInput,
        ...stepOutput.userInput
      };

    case 4:
      // Step4はシーンをマージ（特別処理）
      const mergedScenes = baseInput.scenes?.map(scene => {
        const savedScene = stepOutput.userInput.scenes?.find(s => s.id === scene.id);
        if (savedScene) {
          return {
            ...scene,
            imagePrompt: savedScene.imagePrompt || scene.imagePrompt,
            dialogue: savedScene.dialogue || scene.dialogue,
            customImage: savedScene.customImage,
            charactersInScene: savedScene.charactersInScene
          };
        }
        return scene;
      }) || [];

      return {
        ...baseInput,
        scenes: mergedScenes
      };

    case 5:
      // Step5はvoiceSettingsをマージ
      return {
        ...baseInput,
        ...stepOutput.userInput
      };

    case 6:
      // Step6はbgmとcaptionをマージ
      return {
        ...baseInput,
        ...stepOutput.userInput
      };

    case 7:
      // Step7はtitle, description, tagsをマージ
      return {
        ...baseInput,
        ...stepOutput.userInput
      };

    default:
      return baseInput;
  }
}

async function migrateWorkflows(dryRun = false) {
  console.log('🚀 ワークフローデータの移行を開始します...');
  if (dryRun) {
    console.log('📝 DRY RUNモード: 実際の更新は行いません');
  }

  try {
    // 全ワークフローを取得（ストーリーボードも含む）
    const { data: workflows, error: fetchError } = await supabase
      .from('workflows')
      .select(`
        *,
        storyboard:storyboards(*)
      `)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ ワークフローの取得に失敗しました:', fetchError);
      return;
    }

    console.log(`📊 ${workflows.length}件のワークフローを処理します`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // 統計情報
    const stats = {
      stepInUsed: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
      stepOutUsed: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
      skippedSteps: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
    };

    for (const workflow of workflows) {
      console.log(`\n🔄 ワークフロー ${workflow.id} を処理中...`);
      
      // 既にstepN_inputが設定されているかチェック
      const hasStepInputs = [1, 2, 3, 4, 5, 6, 7].some(n => workflow[`step${n}_input`]);
      if (hasStepInputs) {
        console.log(`⏭️  既にstepN_inputが設定されているためスキップ`);
        skipCount++;
        continue;
      }

      const updates = {};
      
      // 各ステップのデータを生成
      for (let stepNumber = 1; stepNumber <= 7; stepNumber++) {
        const columnName = `step${stepNumber}_input`;
        const stepIn = workflow[`step${stepNumber}_in`];
        const stepOut = workflow[`step${stepNumber}_out`];
        
        // stepN_inもstepN_outもない場合はスキップ（未使用のステップ）
        if (!stepIn && !stepOut) {
          console.log(`  ⏭️  Step${stepNumber}: データなし（スキップ）`);
          stats.skippedSteps[stepNumber]++;
          continue;
        }
        
        // 既存のstepN_inを使用
        let baseInput = stepIn;
        
        // Step1の特殊ケース: step1_inにはuserInputが保存されている場合がある
        if (stepNumber === 1 && baseInput && !baseInput.storyText && stepOut?.userInput) {
          baseInput = stepOut.userInput;
          console.log(`  🔄 Step1: step1_outから復元`);
          stats.stepInUsed[1]++;
        } else if (!baseInput && stepOut?.userInput) {
          // stepN_inがないがstepN_outにuserInputがある場合はそれを使用
          baseInput = stepOut.userInput;
          console.log(`  📦 Step${stepNumber}: step${stepNumber}_out.userInputを使用`);
          stats.stepOutUsed[stepNumber]++;
        } else if (baseInput) {
          console.log(`  ♻️  Step${stepNumber}: 既存のstep${stepNumber}_inを使用`);
          stats.stepInUsed[stepNumber]++;
        }
        
        // baseInputがまだない場合はスキップ
        if (!baseInput) {
          console.log(`  ⏭️  Step${stepNumber}: 有効なデータがないためスキップ`);
          stats.skippedSteps[stepNumber]++;
          continue;
        }
        
        // 既存のstepN_outがあればマージ（ユーザーの編集内容を反映）
        const mergedInput = mergeWithExistingOutput(stepNumber, baseInput, stepOut);
        
        updates[columnName] = mergedInput;
        
        const hasUserEdits = stepOut?.userInput ? '(ユーザー編集あり)' : '';
        console.log(`  ✅ Step${stepNumber}: ${Object.keys(mergedInput).length}個のフィールドを設定 ${hasUserEdits}`);
      }

      // 更新するデータがない場合はスキップ
      if (Object.keys(updates).length === 0) {
        console.log(`  ⏭️  更新するデータがないためスキップ`);
        skipCount++;
        continue;
      }

      if (!dryRun) {
        // データベースを更新
        const { error: updateError } = await supabase
          .from('workflows')
          .update(updates)
          .eq('id', workflow.id);

        if (updateError) {
          console.error(`  ❌ 更新エラー:`, updateError);
          errorCount++;
        } else {
          console.log(`  ✅ 更新完了（${Object.keys(updates).length}個のフィールド）`);
          successCount++;
        }
      } else {
        console.log(`  📝 DRY RUN: ${Object.keys(updates).length}個のフィールドを更新予定`);
        successCount++;
      }
    }

    console.log('\n📊 移行結果:');
    console.log(`  ✅ 成功: ${successCount}件`);
    console.log(`  ⏭️  スキップ: ${skipCount}件`);
    console.log(`  ❌ エラー: ${errorCount}件`);
    console.log(`  📝 合計: ${workflows.length}件`);
    
    console.log('\n📈 データソース統計:');
    console.log('  各ステップのデータソース:');
    for (let step = 1; step <= 7; step++) {
      const total = stats.stepInUsed[step] + stats.stepOutUsed[step] + stats.skippedSteps[step];
      console.log(`    Step${step}: (合計: ${total}件)`);
      console.log(`      - stepN_in使用: ${stats.stepInUsed[step]}件`);
      console.log(`      - stepN_out使用: ${stats.stepOutUsed[step]}件`);
      console.log(`      - スキップ: ${stats.skippedSteps[step]}件`);
    }

    if (dryRun) {
      console.log('\n💡 実際に移行を実行するには、--dry-runオプションを外して再実行してください');
    }

  } catch (error) {
    console.error('❌ 予期しないエラーが発生しました:', error);
  }
}

// コマンドライン引数の処理
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// 実行
migrateWorkflows(dryRun);