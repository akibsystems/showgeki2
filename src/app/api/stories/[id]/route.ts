import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, SupabaseStoryUpdate } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { 
  StorySchema,
  UpdateStoryRequestSchema,
  validateSchema
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

// ================================================================
// GET /api/stories/[id]
// 特定ストーリーの詳細を取得
// ================================================================

async function getStory(
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
    const { data, error } = await getStoryWithAuth(storyId, auth.uid);

    if (error) {
      console.error('Database error:', error);
      
      if (error.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          {
            error: 'Story not found or access denied',
            type: ErrorType.NOT_FOUND,
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch story',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error: 'Story not found or access denied',
          type: ErrorType.NOT_FOUND,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Validate response data
    const validation = validateSchema(StorySchema, data);

    return NextResponse.json({
      success: true,
      data: validation.success ? validation.data : data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get story error:', error);
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
// PUT /api/stories/[id]
// ストーリーの更新
// ================================================================

async function updateStory(
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

    const body = await request.json();
    
    // Validate request body
    const validation = validateSchema(UpdateStoryRequestSchema, body);
    if (!validation.success) {
      console.error('Validation errors:', validation.errors);
      console.error('Request body:', body);
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

    const updateData = validation.data!;
    const supabase = createAdminClient();

    // First, verify story exists and user owns it
    const { data: existingStory, error: getError } = await getStoryWithAuth(storyId, auth.uid);
    
    if (getError || !existingStory) {
      return NextResponse.json(
        {
          error: 'Story not found or access denied',
          type: ErrorType.NOT_FOUND,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Prepare update data
    const updatePayload: SupabaseStoryUpdate = {};
    
    if (updateData.title) {
      updatePayload.title = updateData.title.trim();
    }
    if (updateData.text_raw) {
      updatePayload.text_raw = updateData.text_raw.trim();
    }
    if (updateData.script_json) {
      updatePayload.script_json = updateData.script_json;
    }
    if (updateData.beats !== undefined) {
      updatePayload.beats = updateData.beats;
    }
    
    // ScriptDirector V2 fields
    if (updateData.story_elements !== undefined) {
      updatePayload.story_elements = updateData.story_elements;
    }
    if (updateData.workflow_state !== undefined) {
      updatePayload.workflow_state = updateData.workflow_state;
    }
    if (updateData.custom_assets !== undefined) {
      updatePayload.custom_assets = updateData.custom_assets;
    }

    // Set updated_at timestamp
    updatePayload.updated_at = new Date().toISOString();

    // Update story
    const { data, error } = await supabase
      .from('stories')
      .update(updatePayload)
      .eq('id', storyId)
      .eq('uid', auth.uid)
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

      return NextResponse.json(
        {
          error: 'Failed to update story',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Validate response data
    const storyValidation = validateSchema(StorySchema, data);

    return NextResponse.json({
      success: true,
      data: storyValidation.success ? storyValidation.data : data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update story error:', error);
    
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
// DELETE /api/stories/[id]
// ストーリーの削除（関連動画も削除）
// ================================================================

async function deleteStory(
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

    const supabase = createAdminClient();

    // First, verify story exists and user owns it
    const { data: existingStory, error: getError } = await getStoryWithAuth(storyId, auth.uid);
    
    if (getError || !existingStory) {
      return NextResponse.json(
        {
          error: 'Story not found or access denied',
          type: ErrorType.NOT_FOUND,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Delete related videos first (if any)
    const { error: videosDeleteError } = await supabase
      .from('videos')
      .delete()
      .eq('story_id', storyId)
      .eq('uid', auth.uid);

    if (videosDeleteError) {
      console.error('Error deleting related videos:', videosDeleteError);
      // Continue with story deletion even if video deletion fails
    }

    // Delete story
    const { error: deleteError } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('uid', auth.uid);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        {
          error: 'Failed to delete story',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Story deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete story error:', error);
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
// PATCH /api/stories/[id]
// ストーリーの部分更新（PUTのエイリアス）
// ================================================================
export const PATCH = withAuth(updateStory);

// ================================================================
// Export HTTP handlers with authentication middleware
// ================================================================

export const GET = withAuth(getStory);
export const PUT = withAuth(updateStory);
export const DELETE = withAuth(deleteStory);