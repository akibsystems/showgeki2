import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, SupabaseStoryInsert } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { 
  StorySchema,
  CreateStoryRequestSchema,
  validateSchema,
  isValidUid
} from '@/lib/schemas';
import { ErrorType } from '@/types';

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

    const { workspace_id, title, text_raw, beats } = validation.data!;
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

    // Prepare insert data
    const insertData: SupabaseStoryInsert = {
      workspace_id,
      uid: auth.uid,
      title: title.trim(),
      text_raw: text_raw.trim(),
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

    return NextResponse.json(
      {
        success: true,
        data: storyValidation.success ? storyValidation.data : data,
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