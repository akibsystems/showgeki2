import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, SupabaseWorkspaceInsert } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { 
  WorkspaceSchema,
  CreateWorkspaceRequestSchema,
  validateSchema
} from '@/lib/schemas';
import { ErrorType } from '@/types';

// ================================================================
// GET /api/workspaces
// UID に紐づくワークスペース一覧を取得
// ================================================================

async function getWorkspaces(
  _request: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('uid', auth.uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch workspaces',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Validate each workspace with schema
    const validatedWorkspaces = data.map(workspace => {
      const validation = validateSchema(WorkspaceSchema, workspace);
      if (!validation.success) {
        // Return the raw data if validation fails, let client handle it
        return workspace;
      }
      return validation.data;
    });

    return NextResponse.json({
      success: true,
      data: validatedWorkspaces,
      total: validatedWorkspaces.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get workspaces error:', error);
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
// POST /api/workspaces
// 新規ワークスペース作成
// ================================================================

async function createWorkspace(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateSchema(CreateWorkspaceRequestSchema, body);
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

    const { name } = validation.data!;
    const supabase = createAdminClient();

    // Prepare insert data
    const insertData: SupabaseWorkspaceInsert = {
      uid: auth.uid,
      name: name.trim()
    };

    // Create workspace
    const { data, error } = await supabase
      .from('workspaces')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          {
            error: 'A workspace with this name already exists',
            type: ErrorType.VALIDATION,
            timestamp: new Date().toISOString()
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to create workspace',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Validate response data
    const workspaceValidation = validateSchema(WorkspaceSchema, data);

    return NextResponse.json(
      {
        success: true,
        data: workspaceValidation.success ? workspaceValidation.data : data,
        timestamp: new Date().toISOString()
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create workspace error:', error);
    
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

export const GET = withAuth(getWorkspaces);
export const POST = withAuth(createWorkspace);