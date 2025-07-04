import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, SupabaseStoryUpdate } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import {
  StorySchema,
  MulmoscriptSchema,
  GenerateScriptResponseSchema,
  validateSchema,
  type Mulmoscript,
  type Story
} from '@/lib/schemas';
import { ErrorType } from '@/types';
import {
  generateMulmoscriptWithFallback,
  testOpenAIConnection,
  type ScriptGenerationOptions
} from '@/lib/openai-client';

// ================================================================
// Route Parameters Type
// ================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ================================================================
// Helper Functions
// ================================================================

/**
 * Validate story ID format
 */
function isValidStoryId(id: string): boolean {
  // Story IDs are now UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
}

/**
 * Get story with ownership verification
 */
async function getStoryWithAuth(storyId: string, uid: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .eq('uid', uid)
    .single();

  return { data, error };
}

/**
 * Parse request body for script generation options
 */
async function parseScriptGenerationOptions(request: NextRequest): Promise<ScriptGenerationOptions & { scenes?: Array<{ number: number; title: string }> }> {
  try {
    const body = await request.json();

    return {
      templateId: body.template_id,
      targetDuration: typeof body.target_duration === 'number' ? body.target_duration : 20,
      stylePreference: ['dramatic', 'comedic', 'adventure', 'romantic', 'mystery'].includes(body.style_preference)
        ? body.style_preference
        : 'dramatic',
      language: ['ja', 'en'].includes(body.language) ? body.language : 'ja',
      beats: typeof body.beats === 'number' ? body.beats : 5,
      retryCount: typeof body.retry_count === 'number' ? Math.min(body.retry_count, 3) : 2,
      enableCaptions: typeof body.enable_captions === 'boolean' ? body.enable_captions : false,
      captionStyles: Array.isArray(body.caption_styles) ? body.caption_styles : undefined,
      scenes: Array.isArray(body.scenes) ? body.scenes : undefined,
    };
  } catch {
    // If no body or invalid JSON, return defaults
    return {
      targetDuration: 20,
      stylePreference: 'dramatic',
      language: 'ja',
      retryCount: 2,
      enableCaptions: false,
    };
  }
}

// ================================================================
// POST /api/stories/[id]/generate-script
// ストーリーのスクリプト生成
// ================================================================

async function generateScript(
  request: NextRequest,
  auth: AuthContext,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: storyId } = await context.params;

    // Validate story ID format
    if (!isValidStoryId(storyId)) {
      return NextResponse.json(
        {
          error: 'Invalid story ID format',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Get story with ownership verification
    const { data: story, error: getError } = await getStoryWithAuth(storyId, auth.uid);

    if (getError || !story) {
      return NextResponse.json(
        {
          error: 'Story not found or access denied',
          type: ErrorType.NOT_FOUND,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Check if script already exists
    if (story.script_json && story.status === 'script_generated') {
      // Script already exists, return it

      // Validate existing script
      const scriptValidation = validateSchema(MulmoscriptSchema, story.script_json);
      if (scriptValidation.success) {
        return NextResponse.json({
          success: true,
          data: {
            script_json: scriptValidation.data,
            status: story.status,
            story: story
          },
          message: 'Script already exists',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Parse generation options from request body
    const generationOptions = await parseScriptGenerationOptions(request);

    console.log(`[Script Generation] Starting for story ${storyId} with options:`, {
      ...generationOptions,
      story_title: story.title,
      story_length: story.text_raw.length
    });

    // Generate script using OpenAI integration with fallback
    const { script: generatedScript, generated_with_ai } = await generateMulmoscriptWithFallback(
      story,
      generationOptions
    );

    // Validate generated script (already validated in generateMulmoscriptWithFallback, but double-check)
    const scriptValidation = validateSchema(MulmoscriptSchema, generatedScript);
    if (!scriptValidation.success) {
      console.error('Generated script validation failed:', scriptValidation.errors);
      return NextResponse.json(
        {
          error: 'Script generation failed - invalid format',
          type: ErrorType.INTERNAL,
          details: scriptValidation.errors,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    console.log(`[Script Generation] Completed for story ${storyId}`, {
      generated_with_ai,
      beat_count: generatedScript.beats.length,
      has_speech_params: !!generatedScript.speechParams,
      has_image_params: !!generatedScript.imageParams,
      language: generatedScript.lang || 'en'
    });

    const supabase = createAdminClient();

    // Update story with generated script
    const updatePayload: SupabaseStoryUpdate = {
      script_json: scriptValidation.data,
      status: 'script_generated',
      updated_at: new Date().toISOString()
    };

    const { data: updatedStory, error: updateError } = await supabase
      .from('stories')
      .update(updatePayload)
      .eq('id', storyId)
      .eq('uid', auth.uid)
      .select()
      .single();

    if (updateError) {
      console.error('Database error updating story:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to save generated script',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Validate updated story
    const storyValidation = validateSchema(StorySchema, updatedStory);

    // Prepare response
    const responseData = {
      script_json: scriptValidation.data,
      status: updatedStory.status as 'script_generated',
      story: storyValidation.success ? storyValidation.data : updatedStory,
      generated_with_ai: generated_with_ai,
      generation_options: generationOptions
    };

    // Validate response format - ensuring type consistency
    validateSchema(GenerateScriptResponseSchema, {
      script_json: responseData.script_json,
      status: responseData.status
    });

    return NextResponse.json({
      success: true,
      data: responseData,
      message: generated_with_ai
        ? 'Script generated successfully with AI'
        : 'Script generated successfully with fallback method',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generate script error:', error);

    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error during script generation',
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

export const POST = withAuth(generateScript);