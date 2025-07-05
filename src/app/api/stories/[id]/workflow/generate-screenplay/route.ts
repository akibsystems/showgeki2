import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { authMiddleware, type AuthResult } from '@/lib/auth';
import { StorySchema, validateSchema, type Story, type StoryElements } from '@/lib/schemas';
import { ErrorType } from '@/types';
import OpenAI from 'openai';

// ================================================================
// Route Parameters Type
// ================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ================================================================
// OpenAI Client
// ================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================================================================
// Helper Functions
// ================================================================

function isValidStoryId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
}

async function getStoryWithAuth(storyId: string, uid: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .eq('uid', uid)
    .single();

  if (error || !data) {
    throw new Error('Story not found');
  }

  return data;
}

/**
 * ステップ1完了時：キャラクタと幕場構成の初期SCREENPLAY脚本案生成
 */
async function generateInitialScreenplay(storyElements: StoryElements) {
  const prompt = `
あなたはシェイクスピア風の劇作家です。以下のストーリー要素から、感動的な5幕構成の劇の構成案を作成してください。

【ストーリー要素】
主ストーリー: ${storyElements.main_story}
ドラマチック転換点: ${storyElements.dramatic_turning_point || 'なし'}
未来イメージ: ${storyElements.future_image || 'なし'}
学び: ${storyElements.learnings || 'なし'}
全体場数: ${storyElements.total_scenes}場

【要求事項】
1. 必ず5幕構成にする
2. 全体で${storyElements.total_scenes}場になるように配分
3. 各幕には明確なテーマと役割を持たせる
4. 主要キャラクター（3-5名）を設定
5. ドラマチックな展開と感動的な結末

以下のJSON形式で出力してください：
{
  "acts": [
    {
      "id": "act1",
      "title": "第一幕：〇〇",
      "description": "幕の説明",
      "scenes": [
        {
          "id": "scene1",
          "title": "シーンタイトル",
          "description": "シーンの内容"
        }
      ]
    }
  ],
  "characters": [
    {
      "id": "char1",
      "name": "キャラクター名",
      "description": "キャラクターの説明",
      "personality": "性格・特徴",
      "role": "物語での役割"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'あなたは感動的なシェイクスピア風の劇を作る専門家です。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(response);
  } catch (error) {
    console.error('Failed to generate screenplay:', error);
    throw error;
  }
}

// ================================================================
// POST /api/stories/[id]/workflow/generate-screenplay
// ================================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id: storyId } = await context.params;

  // Validate story ID
  if (!isValidStoryId(storyId)) {
    return NextResponse.json(
      { error: 'Invalid story ID format' },
      { status: 400 }
    );
  }

  // Authenticate request
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error || 'Authentication failed' },
      { status: 401 }
    );
  }

  const uid = authResult.uid!;

  try {
    // Get story with ownership check
    const story = await getStoryWithAuth(storyId, uid);

    // Validate story elements exist
    if (!story.story_elements) {
      return NextResponse.json(
        { error: 'Story elements not found. Please complete step 1 first.' },
        { status: 400 }
      );
    }

    // Generate initial screenplay
    const screenplay = await generateInitialScreenplay(story.story_elements);

    // Update workflow state
    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from('stories')
      .update({
        workflow_state: {
          ...story.workflow_state,
          ai_generations: {
            ...story.workflow_state?.ai_generations,
            screenplay,
          },
          metadata: {
            ...story.workflow_state?.metadata,
            acts: screenplay.acts,
            characters: screenplay.characters,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId)
      .eq('uid', uid);

    if (updateError) {
      console.error('Failed to update story:', updateError);
      throw new Error('Failed to save screenplay');
    }

    // Save to workflow data table for large data
    const { error: dataError } = await supabase
      .from('story_workflow_data')
      .upsert({
        story_id: storyId,
        data_type: 'ai_screenplay',
        data: screenplay,
        updated_at: new Date().toISOString(),
      });

    if (dataError) {
      console.error('Failed to save workflow data:', dataError);
    }

    return NextResponse.json({
      success: true,
      screenplay,
    });
  } catch (error: any) {
    console.error('Generate screenplay error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate screenplay' },
      { status: 500 }
    );
  }
}