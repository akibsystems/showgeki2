import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authMiddleware } from '@/lib/auth';
import type { 
  Step1Json, Step2Json, Step3Json, Step4Json, Step5Json, Step6Json, 
  Workflow 
} from '@/types/workflow';

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;
type StepJson = Step1Json | Step2Json | Step3Json | Step4Json | Step5Json | Step6Json;

interface RouteParams {
  params: Promise<{
    workflow_id: string;
    step: string;
  }>;
}

/**
 * GET /api/workflow/[workflow_id]/step/[step]
 * ステップデータを取得
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  try {
    const { workflow_id, step } = await params;
    const uid = authResult.uid!;
    const stepNumber = parseInt(step, 10) as StepNumber;
    
    console.log(`[GET] /api/workflow/${workflow_id}/step/${step}`);
    console.log(`[GET] uid: ${uid}, stepNumber: ${stepNumber}`);

    // バリデーション
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 6) {
      return NextResponse.json(
        { error: 'Invalid step number' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // ワークフローを取得
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflow_id)
      .eq('uid', uid)
      .single();

    if (fetchError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // ステップデータを取得
    const stepColumnName = `step${stepNumber}_json` as keyof Workflow;
    const stepData = workflow[stepColumnName] as StepJson | null;

    // 編集可能かどうかを判定
    const canEdit = workflow.status === 'active' && workflow.current_step >= stepNumber;

    // ワークフロー全体のデータを返す
    const response = {
      data: stepData,
      canEdit,
      workflow: {
        id: workflow.id,
        title: workflow.title,
        current_step: workflow.current_step,
        status: workflow.status,
        // 全てのステップデータを含める
        step1_json: workflow.step1_json,
        step2_json: workflow.step2_json,
        step3_json: workflow.step3_json,
        step4_json: workflow.step4_json,
        step5_json: workflow.step5_json,
        step6_json: workflow.step6_json,
      }
    };
    
    console.log(`[GET] Response:`, JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching step data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflow/[workflow_id]/step/[step]
 * ステップデータを保存
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  try {
    const { workflow_id, step } = await params;
    const uid = authResult.uid!;
    const stepNumber = parseInt(step, 10) as StepNumber;
    
    console.log(`[POST] /api/workflow/${workflow_id}/step/${step}`);
    console.log(`[POST] uid: ${uid}, stepNumber: ${stepNumber}`);

    // バリデーション
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 6) {
      return NextResponse.json(
        { error: 'Invalid step number' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // リクエストボディを取得
    const body = await request.json();
    const { data } = body;
    
    console.log(`[POST] Request body:`, JSON.stringify(body, null, 2));

    if (!data) {
      return NextResponse.json(
        { error: 'Data is required' },
        { status: 400 }
      );
    }

    // ワークフローの現在の状態を確認
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflow_id)
      .eq('uid', uid)
      .single();

    if (fetchError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // ワークフローがアクティブでない場合は編集不可
    if (workflow.status !== 'active') {
      return NextResponse.json(
        { error: 'Workflow is not active' },
        { status: 400 }
      );
    }

    // ステップ1-3を編集した場合、後続のステップをリセット
    const updateData: any = {
      [`step${stepNumber}_json`]: data,
      current_step: Math.max(workflow.current_step, stepNumber),
    };

    // ステップ1-3の編集時は後続ステップをリセット
    if (stepNumber <= 3) {
      for (let i = stepNumber + 1; i <= 6; i++) {
        updateData[`step${i}_json`] = null;
      }
      // script_jsonもリセット
      updateData.script_json = null;
    }

    // タイトルの更新（ステップ2の場合）
    if (stepNumber === 2 && data.userInput?.title) {
      updateData.title = data.userInput.title;
    }

    // ステップ1またはステップ2の場合、generatedContentを追加
    if (stepNumber === 1 || stepNumber === 2) {
      const generatedContent = await generateContentForNextStep(stepNumber, data);
      updateData[`step${stepNumber}_json`] = {
        ...data,
        generatedContent
      };
    }

    console.log(`[POST] Update data:`, JSON.stringify(updateData, null, 2));

    // ワークフローを更新
    const { error: updateError } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', workflow_id)
      .eq('uid', uid);

    if (updateError) {
      console.error('Failed to update workflow:', updateError);
      return NextResponse.json(
        { error: 'Failed to save data' },
        { status: 500 }
      );
    }

    // LLMで次ステップ用のコンテンツを生成（モック実装）
    // TODO: 実際のLLM呼び出しを実装
    const generatedContent = await generateContentForNextStep(stepNumber, data);
    
    console.log(`[POST] Generated content:`, JSON.stringify(generatedContent, null, 2));

    const response = {
      success: true,
      generatedContent,
    };
    
    console.log(`[POST] Response:`, JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error saving step data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 次ステップ用のコンテンツを生成（モック実装）
 * TODO: 実際のLLM呼び出しに置き換える
 */
async function generateContentForNextStep(
  stepNumber: StepNumber,
  data: StepJson
): Promise<any> {
  // モック実装
  switch (stepNumber) {
    case 1:
      const step1Data = data as Step1Json;
      const totalScenes = step1Data.userInput.totalScenes || 5;
      
      // シーン数に基づいて幕場構成を動的に生成
      const acts = [];
      const actTitles = ['運命の出会い', '試練と成長', '挫折と再起', '決戦への道', '新たな始まり'];
      const sceneTitles = [
        ['序章 - 平凡な日常', '転機の訪れ', '新たな世界へ'],
        ['最初の壁', '仲間との出会い', '力の目覚め'],
        ['大きな失敗', '内なる声', '再起への決意'],
        ['最後の準備', '運命の対決', '激闘の果てに'],
        ['勝利と別れ', '未来への扉', 'エピローグ']
      ];
      const sceneSummaries = [
        ['主人公の日常生活と内に秘めた夢への憧れ', '運命的な出会いが主人公の人生を大きく変える', '新しい世界への第一歩を踏み出す'],
        ['新しい世界での困難と戸惑い', '共に困難を乗り越える仲間との絆', '隠された力が目覚め始める'],
        ['自信を失い、夢を諦めかける主人公', '自分自身と向き合い、真の目的を見つける', '新たな決意と共に立ち上がる'],
        ['仲間と共に最終決戦への準備を整える', '全てを賭けた最後の挑戦', '激しい戦いの中で真の強さを発揮'],
        ['目標を達成し、それぞれの道へ', '成長した主人公が新たな冒険へ旅立つ', '物語の終わりと新たな始まり']
      ];
      
      // 5幕構成で、各幕のシーン数を計算
      let totalScenesAssigned = 0;
      const scenesPerAct = Math.ceil(totalScenes / 5);
      
      for (let actIndex = 0; actIndex < 5; actIndex++) {
        const actScenes = [];
        const actualScenesInAct = Math.min(scenesPerAct, totalScenes - totalScenesAssigned);
        
        for (let sceneIndex = 0; sceneIndex < actualScenesInAct; sceneIndex++) {
          actScenes.push({
            sceneNumber: sceneIndex + 1,  // 各幕で1から始める
            sceneTitle: sceneTitles[actIndex][sceneIndex] || `第${sceneIndex + 1}場`,
            summary: sceneSummaries[actIndex][sceneIndex] || `第${actIndex + 1}幕第${sceneIndex + 1}場の内容`
          });
          totalScenesAssigned++;
        }
        
        if (actScenes.length > 0) {
          acts.push({
            actNumber: actIndex + 1,
            actTitle: actTitles[actIndex],
            scenes: actScenes
          });
        }
      }
      
      return {
        suggestedTitle: '未来への挑戦 〜夢を追う若者の物語〜',
        acts,
        charactersList: [
          { name: '太郎', role: '主人公', personality: '情熱的で前向き、時に無鉄砲だが仲間思い' },
          { name: '花子', role: '親友', personality: '優しく思慮深い、主人公を支える存在' },
          { name: '師匠', role: 'メンター', personality: '厳格だが温かい心を持つ指導者' },
          { name: 'ライバル', role: '好敵手', personality: '誇り高く実力者、最後は良き理解者に' },
        ],
      };

    case 2:
      const step2Data = data as Step2Json;
      return {
        detailedCharacters: [
          {
            id: 'taro',
            name: '太郎',
            personality: '情熱的で前向き、時に無鉄砲だが仲間思い',
            visualDescription: '黒髪の短髪、明るく元気な表情、スポーティな服装',
            role: '主人公',
          },
          {
            id: 'hanako',
            name: '花子',
            personality: '優しく思慮深い、芯が強く、主人公を支える存在',
            visualDescription: '茶髪のロングヘア、優しい眼差し、清楚な雰囲気',
            role: '親友',
          },
          {
            id: 'shisho',
            name: '師匠',
            personality: '厳格だが温かい心を持つ指導者、深い知恵と経験',
            visualDescription: '白髪混じりの髪、威厳のある風貌、和装または格式ある服装',
            role: 'メンター',
          },
          {
            id: 'rival',
            name: 'ライバル',
            personality: '誇り高く実力者、最初は敵対的だが最後は良き理解者に',
            visualDescription: '銀髪または金髪、鋭い眼光、クールで洗練された外見',
            role: '好敵手',
          },
        ],
        suggestedImageStyle: {
          preset: 'anime',
          description: 'アニメ風、ソフトパステルカラー、繊細な線画、シネマティックな構図',
        },
      };

    // 他のステップも同様にモック実装
    default:
      return {};
  }
}