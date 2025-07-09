import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { ErrorType } from '@/types';

/**
 * POST /api/upload/face-reference
 * 顔参照画像をアップロード
 */
async function uploadFaceReference(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const characterName = formData.get('characterName') as string;

    if (!file) {
      return NextResponse.json(
        {
          error: 'ファイルが指定されていません',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: 'ファイルサイズは5MB以下にしてください',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'JPEG、PNG、WebP、GIF形式のファイルのみアップロード可能です',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ファイル名を生成（ユーザーID + タイムスタンプ + 元のファイル名）
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${auth.uid}/${timestamp}_${characterName}.${extension}`;

    // Supabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from('face-references')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return NextResponse.json(
        {
          error: '画像のアップロードに失敗しました',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('face-references')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        storagePath: fileName
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Face reference upload error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error during face reference upload',
        type: ErrorType.INTERNAL,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload/face-reference
 * 顔参照画像を削除
 */
async function deleteFaceReference(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        {
          error: 'URLが指定されていません',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // URLからストレージパスを抽出
    const urlParts = url.split('/');
    const storagePath = urlParts.slice(urlParts.indexOf('face-references') + 1).join('/');

    // ファイルがユーザーのものか確認
    if (!storagePath.startsWith(auth.uid)) {
      return NextResponse.json(
        {
          error: '権限がありません',
          type: ErrorType.AUTHORIZATION,
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      );
    }

    // Supabase Storageから削除
    const { error } = await supabase.storage
      .from('face-references')
      .remove([storagePath]);

    if (error) {
      console.error('Supabase storage delete error:', error);
      return NextResponse.json(
        {
          error: '画像の削除に失敗しました',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '画像を削除しました',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Face reference delete error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error during face reference deletion',
        type: ErrorType.INTERNAL,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(uploadFaceReference);
export const DELETE = withAuth(deleteFaceReference);