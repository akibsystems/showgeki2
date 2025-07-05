import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { authMiddleware, type AuthResult } from '@/lib/auth';
import { StorySchema, validateSchema, type Story } from '@/lib/schemas';
import { ErrorType } from '@/types';
import OpenAI from 'openai';

// ================================================================
// Route Parameters Type
// ================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ================================================================
// Types
// ================================================================

interface SceneScript {
  sceneId: string;
  actId: string;
  title: string;
  speaker: string;
  dialogue: string;
  imagePrompt: string;
  narration?: string;
  duration?: number;
}

interface CharacterInfo {
  id: string;
  name: string;
  voiceId: string;
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
 * ステップ3完了時：シーンごとのSCRIPT台本と画像案生成
 */
async function generateSceneScripts(story: Story, screenplay: any, characters: CharacterInfo[]) {
  const prompt = `
あなたはシェイクスピア風の劇作家です。以下の劇構成から、各シーンの詳細な台本と画像案を作成してください。

【元のストーリー】
${story.story_elements?.main_story || story.text_raw}

【劇の構成】
${JSON.stringify(screenplay.acts, null, 2)}

【登場人物】
${JSON.stringify(characters, null, 2)}

【要求事項】
1. 各シーンに感動的で詩的な台詞を作成
2. シェイクスピア風の格調高い日本語で
3. 各シーンの画像プロンプトは具体的かつ視覚的に
4. アニメ風の美しいビジュアルを想定
5. 全体の流れに一貫性を持たせる

以下のJSON形式で出力してください：
{
  "scenes": [
    {
      "sceneId": "scene1",
      "actId": "act1",
      "title": "シーンタイトル",
      "speaker": "話者のキャラクターID",
      "dialogue": "このシーンの台詞（詩的で感動的に）",
      "imagePrompt": "アニメ風の画像生成プロンプト（英語で具体的に）",
      "narration": "ナレーション（必要な場合）",
      "duration": 7.5
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'あなたは感動的なシェイクスピア風の劇を作る専門家です。日本語の美しさと詩的表現を大切にしてください。' },
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
    console.error('Failed to generate scene scripts:', error);
    throw error;
  }
}

// ================================================================
// POST /api/stories/[id]/workflow/generate-scene-scripts
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
    // Get request body
    const body = await request.json();
    const { characters } = body;

    if (!characters || !Array.isArray(characters)) {
      return NextResponse.json(
        { error: 'Characters information is required' },
        { status: 400 }
      );
    }

    // Get story with ownership check
    const story = await getStoryWithAuth(storyId, uid);

    // Get screenplay from workflow state
    const screenplay = story.workflow_state?.ai_generations?.screenplay;
    if (!screenplay) {
      return NextResponse.json(
        { error: 'Screenplay not found. Please generate screenplay first.' },
        { status: 400 }
      );
    }

    // Generate scene scripts
    const sceneScripts = await generateSceneScripts(story, screenplay, characters);

    // Update workflow state
    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from('stories')
      .update({
        workflow_state: {
          ...story.workflow_state,
          ai_generations: {
            ...story.workflow_state?.ai_generations,
            scene_scripts: sceneScripts,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId)
      .eq('uid', uid);

    if (updateError) {
      console.error('Failed to update story:', updateError);
      throw new Error('Failed to save scene scripts');
    }

    // Save to workflow data table
    const { error: dataError } = await supabase
      .from('story_workflow_data')
      .upsert({
        story_id: storyId,
        data_type: 'scene_scripts',
        data: sceneScripts,
        updated_at: new Date().toISOString(),
      });

    if (dataError) {
      console.error('Failed to save workflow data:', dataError);
    }

    return NextResponse.json({
      success: true,
      sceneScripts,
    });
  } catch (error: any) {
    console.error('Generate scene scripts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate scene scripts' },
      { status: 500 }
    );
  }
}