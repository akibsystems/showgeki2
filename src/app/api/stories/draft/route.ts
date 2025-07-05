import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, SupabaseStoryInsert } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { StorySchema, validateSchema, WorkflowStateSchema } from '@/lib/schemas';
import { ErrorType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// ================================================================
// POST /api/stories/draft
// Create a minimal draft story for workflow
// ================================================================

async function createDraftStory(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Extract workspace_id from request body
    const { workspace_id } = body;
    
    if (!workspace_id) {
      return NextResponse.json(
        {
          error: 'workspace_id is required',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

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

    // Initialize workflow state
    const workflowState = {
      current_step: 1,
      completed_steps: [],
      ai_generations: {},
      metadata: {}
    };

    // Validate workflow state
    const workflowValidation = validateSchema(WorkflowStateSchema, workflowState);
    if (!workflowValidation.success) {
      console.error('Workflow state validation failed:', workflowValidation.errors);
      return NextResponse.json(
        {
          error: 'Invalid workflow state',
          type: ErrorType.INTERNAL,
          details: workflowValidation.errors,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Prepare draft story data
    const storyId = uuidv4();
    const insertData: SupabaseStoryInsert = {
      id: storyId,
      workspace_id,
      uid: auth.uid,
      title: '下書き',
      text_raw: '',
      status: 'draft',
      beats: 5,
      workflow_state: workflowValidation.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create draft story
    const { data, error } = await supabase
      .from('stories')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Handle specific database errors
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
          error: 'Failed to create draft story',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Validate response data
    const storyValidation = validateSchema(StorySchema, data);
    const finalStory = storyValidation.success ? storyValidation.data : data;

    return NextResponse.json(
      {
        success: true,
        story: finalStory,
        timestamp: new Date().toISOString()
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create draft story error:', error);
    
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
// Export HTTP handler with authentication middleware
// ================================================================

export const POST = withAuth(createDraftStory);