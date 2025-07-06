import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Project } from '@/types/workflow';

// SERVICE_ROLEキーを使用してSupabaseクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // UIDをヘッダーから取得
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { name, description } = body;

    // バリデーション
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'プロジェクト名は必須です' },
        { status: 400 }
      );
    }

    // プロジェクトを作成
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        uid,
        name: name.trim(),
        description: description?.trim() || null,
        status: 'active'
      })
      .select()
      .single();

    if (projectError) {
      console.error('プロジェクト作成エラー:', projectError);
      return NextResponse.json(
        { error: 'プロジェクトの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        project_id: project.id,
        message: 'プロジェクトが正常に作成されました' 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('プロジェクト作成API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}