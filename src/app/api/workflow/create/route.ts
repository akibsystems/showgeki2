import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, type AuthContext } from '@/lib/auth';

/**
 * POST /api/workflow/create
 * 新規ワークフローを作成
 */
export const POST = withAuth(async (request: NextRequest, auth: AuthContext) => {
  try {
    const { uid } = auth;
    const supabase = await createClient();

    // ユーザーのデフォルトワークスペースを取得
    const { data: workspaces, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('uid', uid)
      .order('created_at', { ascending: true })
      .limit(1);

    if (workspaceError) {
      console.error('Failed to fetch workspace:', workspaceError);
      return NextResponse.json(
        { error: 'Failed to fetch workspace' },
        { status: 500 }
      );
    }

    const workspaceId = workspaces?.[0]?.id || null;

    // 新しいワークフローを作成
    const { data: workflow, error: createError } = await supabase
      .from('workflows')
      .insert({
        uid: uid,
        workspace_id: workspaceId,
        title: null, // 初期状態ではタイトルは未設定
        current_step: 1,
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create workflow:', createError);
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      );
    }

    // リダイレクトURL
    const redirectUrl = `/workflow/${workflow.id}?step=1`;

    return NextResponse.json(
      { 
        success: true,
        workflow_id: workflow.id,
        redirect_url: redirectUrl 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in workflow creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});