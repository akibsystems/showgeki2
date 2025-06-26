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
  return typeof id === 'string' && id.length === 8 && /^[A-Z0-9]+$/.test(id);
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
 * Generate mock script for testing
 * TODO: Replace with actual LLM integration
 */
function generateMockMulmoscript(story: Story): Mulmoscript {
  const scenes = [
    {
      id: 'scene_001',
      type: 'narration' as const,
      content: `Once upon a time, in the world of "${story.title}"...`,
      duration: 3.0,
      voice: {
        character: 'narrator',
        emotion: 'neutral'
      }
    },
    {
      id: 'scene_002', 
      type: 'dialogue' as const,
      content: story.text_raw.slice(0, 200) + '...',
      duration: 8.0,
      voice: {
        character: 'protagonist',
        emotion: 'excited'
      }
    },
    {
      id: 'scene_003',
      type: 'action' as const,
      content: 'Visual transition showing the story development',
      duration: 2.0
    },
    {
      id: 'scene_004',
      type: 'dialogue' as const,
      content: 'And thus our tale unfolds with wisdom and wonder...',
      duration: 4.0,
      voice: {
        character: 'wise_character',
        emotion: 'contemplative'
      }
    },
    {
      id: 'scene_005',
      type: 'narration' as const,
      content: 'The end of our magical story.',
      duration: 3.0,
      voice: {
        character: 'narrator',
        emotion: 'peaceful'
      }
    }
  ];

  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

  return {
    version: 'v1.0',
    title: story.title,
    scenes,
    metadata: {
      duration_total: totalDuration,
      resolution: '1920x1080',
      fps: 30
    }
  };
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

    // Generate script for story

    // Generate script (currently mock, replace with actual LLM integration)
    const generatedScript = generateMockMulmoscript(story);

    // Validate generated script
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
      story: storyValidation.success ? storyValidation.data : updatedStory
    };

    // Validate response format - ensuring type consistency
    validateSchema(GenerateScriptResponseSchema, {
      script_json: responseData.script_json,
      status: responseData.status
    });

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Script generated successfully',
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