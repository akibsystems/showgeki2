import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, SupabaseStoryInsert, SupabaseStoryUpdate } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { 
  StorySchema,
  CreateStoryRequestSchema,
  MulmoscriptSchema,
  validateSchema,
  isValidUid
} from '@/lib/schemas';
import { ErrorType } from '@/types';
import OpenAI from 'openai';
import {
  generateMulmoscriptWithFallback,
  type ScriptGenerationOptions
} from '@/lib/openai-client';

// ================================================================
// OpenAI Client Configuration
// ================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================================================================
// Helper Functions
// ================================================================

/**
 * Generate title from story content using OpenAI
 */
async function generateTitle(text_raw: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `あなたは創作支援AIです。ユーザーが提供するストーリー内容から、魅力的で適切なタイトルを日本語で生成してください。

タイトル生成の要件：
- 日本語で生成
- 10-30文字程度
- ストーリーの核心を表現
- 魅力的で読み手の興味を引く
- 簡潔で覚えやすい
- 夢や希望的な内容の場合は前向きな表現を使用
- タイトル全体を引用符で囲まない

応答は、生成されたタイトルのみを返してください。説明や前置きは不要です。引用符は使用しないでください。`,
      },
      {
        role: 'user',
        content: `以下のストーリー内容から適切なタイトルを生成してください：

${text_raw}`,
      },
    ],
    max_tokens: 100,
    temperature: 0.7,
  });

  let generatedTitle = completion.choices[0]?.message?.content?.trim();

  if (!generatedTitle) {
    throw new Error('Failed to generate title from OpenAI');
  }

  // Remove surrounding quotes if present
  generatedTitle = generatedTitle.replace(/^["「『]|["」』]$/g, '');

  return generatedTitle;
}

// ================================================================
// GET /api/stories
// UID に紐づくストーリー一覧を取得
// Query parameters: workspace_id?, status?, limit?, offset?
// ================================================================

async function getStories(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const workspaceId = searchParams.get('workspace_id');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const supabase = createAdminClient();

    // Build query
    let query = supabase
      .from('stories')
      .select('*')
      .eq('uid', auth.uid);

    // Apply filters
    if (workspaceId) {
      if (!isValidUid(workspaceId)) {
        return NextResponse.json(
          {
            error: 'Invalid workspace_id format',
            type: ErrorType.VALIDATION,
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }

      // Verify workspace ownership
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .eq('uid', auth.uid)
        .single();

      if (workspaceError || !workspace) {
        return NextResponse.json(
          {
            error: 'Workspace not found or access denied',
            type: ErrorType.AUTHORIZATION,
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        );
      }

      query = query.eq('workspace_id', workspaceId);
    }

    if (status) {
      // Validate status value
      const validStatuses = ['draft', 'script_generated', 'processing', 'completed', 'error'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: 'Invalid status value',
            type: ErrorType.VALIDATION,
            details: { validStatuses },
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
      query = query.eq('status', status);
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Get total count for pagination
    let countQuery = supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('uid', auth.uid);

    if (workspaceId) {
      countQuery = countQuery.eq('workspace_id', workspaceId);
    }
    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const [{ data, error }, { count }] = await Promise.all([
      query,
      countQuery
    ]);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch stories',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Validate each story with schema
    const validatedStories = data.map(story => {
      const validation = validateSchema(StorySchema, story);
      if (!validation.success) {
        return story; // Return raw data if validation fails
      }
      return validation.data;
    });

    const response = {
      stories: validatedStories,
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get stories error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        type: ErrorType.INTERNAL,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ================================================================
// POST /api/stories
// 新規ストーリー作成
// ================================================================

async function createStory(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateSchema(CreateStoryRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          type: ErrorType.VALIDATION,
          details: validation.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const { workspace_id, title, text_raw, beats, auto_generate_script } = validation.data!;
    const supabase = createAdminClient();

    // Verify workspace ownership
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspace_id)
      .eq('uid', auth.uid)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        {
          error: 'Workspace not found or access denied',
          type: ErrorType.AUTHORIZATION,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Generate title if not provided
    let finalTitle = title?.trim();
    if (!finalTitle && text_raw) {
      try {
        finalTitle = await generateTitle(text_raw);
      } catch (error) {
        console.error('Title generation failed:', error);
        return NextResponse.json(
          {
            error: 'Failed to generate title',
            type: ErrorType.INTERNAL,
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        );
      }
    }

    // Prepare insert data
    const insertData: SupabaseStoryInsert = {
      workspace_id,
      uid: auth.uid,
      title: finalTitle || '無題のストーリー',
      text_raw: (text_raw || '').trim(),
      status: 'draft',
      beats: beats || 5
    };

    // Create story
    const { data, error } = await supabase
      .from('stories')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          {
            error: 'A story with this title already exists in the workspace',
            type: ErrorType.VALIDATION,
            timestamp: new Date().toISOString()
          },
          { status: 409 }
        );
      }

      if (error.code === '23503') { // Foreign key constraint violation
        return NextResponse.json(
          {
            error: 'Referenced workspace does not exist',
            type: ErrorType.VALIDATION,
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to create story',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Validate response data
    const storyValidation = validateSchema(StorySchema, data);
    let finalStory = storyValidation.success ? storyValidation.data : data;

    // If auto_generate_script is true, generate script immediately
    if (auto_generate_script) {
      try {
        console.log(`[Script Generation] Auto-generating script for story ${finalStory.id}`);

        const generationOptions: ScriptGenerationOptions = {
          targetDuration: 20,
          stylePreference: 'dramatic',
          language: 'ja',
          beats: beats || 5,
          retryCount: 2,
        };

        // Generate script using OpenAI integration
        const { script: generatedScript, generated_with_ai } = await generateMulmoscriptWithFallback(
          finalStory,
          generationOptions
        );

        // Validate generated script
        const scriptValidation = validateSchema(MulmoscriptSchema, generatedScript);
        if (!scriptValidation.success) {
          console.error('Generated script validation failed:', scriptValidation.errors);
          // Return story without script rather than failing completely
          return NextResponse.json(
            {
              success: true,
              data: finalStory,
              message: 'Story created but script generation failed',
              timestamp: new Date().toISOString()
            },
            { status: 201 }
          );
        }

        // Update story with generated script
        const updatePayload: SupabaseStoryUpdate = {
          script_json: scriptValidation.data,
          status: 'script_generated',
          updated_at: new Date().toISOString()
        };

        const { data: updatedStory, error: updateError } = await supabase
          .from('stories')
          .update(updatePayload)
          .eq('id', finalStory.id)
          .eq('uid', auth.uid)
          .select()
          .single();

        if (updateError) {
          console.error('Database error updating story with script:', updateError);
          // Return story without script rather than failing completely
          return NextResponse.json(
            {
              success: true,
              data: finalStory,
              message: 'Story created but script save failed',
              timestamp: new Date().toISOString()
            },
            { status: 201 }
          );
        }

        // Return story with generated script
        const finalStoryValidation = validateSchema(StorySchema, updatedStory);
        finalStory = finalStoryValidation.success ? finalStoryValidation.data : updatedStory;

        return NextResponse.json(
          {
            success: true,
            data: {
              story: finalStory,
              script_json: scriptValidation.data,
              generated_with_ai: generated_with_ai,
              generation_options: generationOptions
            },
            message: generated_with_ai 
              ? 'Story created and script generated successfully with AI'
              : 'Story created and script generated successfully with fallback method',
            timestamp: new Date().toISOString()
          },
          { status: 201 }
        );

      } catch (error) {
        console.error('Script generation failed during story creation:', error);
        // Return story without script rather than failing completely
        return NextResponse.json(
          {
            success: true,
            data: finalStory,
            message: 'Story created but script generation failed',
            timestamp: new Date().toISOString()
          },
          { status: 201 }
        );
      }
    }

    // Return story only (no script generation requested)
    return NextResponse.json(
      {
        success: true,
        data: finalStory,
        timestamp: new Date().toISOString()
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create story error:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        type: ErrorType.INTERNAL,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ================================================================
// Export HTTP handlers with authentication middleware
// ================================================================

export const GET = withAuth(getStories);
export const POST = withAuth(createStory);