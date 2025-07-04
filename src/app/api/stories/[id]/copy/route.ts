import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { 
  StorySchema,
  validateSchema,
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
// POST /api/stories/[id]/copy
// ストーリーをコピーして新しいストーリーを作成
// ================================================================

async function copyStory(
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

    // Get original story with ownership verification
    const { data: originalStory, error: getError } = await getStoryWithAuth(storyId, auth.uid);

    if (getError || !originalStory) {
      return NextResponse.json(
        {
          error: 'Story not found or access denied',
          type: ErrorType.NOT_FOUND,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Check if story is completed (video generated)
    if (originalStory.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Only completed stories with generated videos can be copied',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Double check that script_json exists
    if (!originalStory.script_json) {
      return NextResponse.json(
        {
          error: 'Story must have a generated script to be copied',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create new story based on the original
    const newStoryData = {
      workspace_id: originalStory.workspace_id,
      uid: auth.uid,
      title: `${originalStory.title} (コピー)`,
      text_raw: originalStory.text_raw,
      script_json: originalStory.script_json,
      status: 'script_generated', // Set as script_generated so it can be used for video generation immediately
      beats: originalStory.beats || 10,
    };

    const { data: newStory, error: insertError } = await supabase
      .from('stories')
      .insert(newStoryData)
      .select()
      .single();

    if (insertError) {
      console.error('Database error creating story copy:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to create story copy',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Convert timestamps to ISO format for validation
    const storyWithISODates = {
      ...newStory,
      created_at: new Date(newStory.created_at).toISOString(),
      updated_at: new Date(newStory.updated_at).toISOString()
    };

    // Validate the new story
    const validation = validateSchema(StorySchema, storyWithISODates);
    if (!validation.success) {
      console.error('Story validation failed:', validation.errors);
      // Even if validation fails, return the created story
      // This ensures the copy operation succeeds
      return NextResponse.json({
        success: true,
        data: {
          story: storyWithISODates as Story
        },
        message: 'Story copied successfully',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[Story Copy] Successfully copied story ${storyId} to ${newStory.id} for user ${auth.uid}`);

    return NextResponse.json({
      success: true,
      data: {
        story: validation.data
      },
      message: 'Story copied successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Copy story error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error during story copy',
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

export const POST = withAuth(copyStory);