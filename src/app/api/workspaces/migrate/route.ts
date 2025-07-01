import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { ErrorType } from '@/types';

// ================================================================
// POST /api/workspaces/migrate
// Migrate existing workspace to authenticated user
// ================================================================

async function migrateWorkspace(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { oldUid } = body;
    
    if (!oldUid) {
      return NextResponse.json(
        {
          error: 'oldUid is required',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    // Check if user already has workspaces
    const { data: existingWorkspaces } = await supabase
      .from('workspaces')
      .select('*')
      .eq('uid', auth.uid);
      
    if (existingWorkspaces && existingWorkspaces.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'User already has workspaces',
          workspaces: existingWorkspaces
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Update old workspaces to new uid
    const { data: updatedWorkspaces, error } = await supabase
      .from('workspaces')
      .update({ uid: auth.uid })
      .eq('uid', oldUid)
      .select();
      
    if (error) {
      console.error('[migrateWorkspace] Database error:', error);
      return NextResponse.json(
        {
          error: 'Failed to migrate workspaces',
          type: ErrorType.INTERNAL,
          details: error,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
    
    // Also update related stories and videos
    if (updatedWorkspaces && updatedWorkspaces.length > 0) {
      // Update stories
      await supabase
        .from('stories')
        .update({ uid: auth.uid })
        .eq('uid', oldUid);
        
      // Update videos
      await supabase
        .from('videos')
        .update({ uid: auth.uid })
        .eq('uid', oldUid);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Workspaces migrated successfully',
        workspaces: updatedWorkspaces || [],
        migratedCount: updatedWorkspaces?.length || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[migrateWorkspace] Error:', error);
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

export const POST = withAuth(migrateWorkspace);