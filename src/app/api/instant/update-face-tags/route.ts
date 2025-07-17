import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { UpdateFaceTagRequest, UpdateFaceTagResponse, UpdateFaceOrderRequest, DetectedFace } from '@/types/face-detection';

/**
 * 顔のタグ情報を更新
 */
export async function POST(req: NextRequest) {
  console.log('[UpdateFaceTags API] POST request received');
  
  try {
    // 認証チェック
    const uid = req.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body: UpdateFaceTagRequest = await req.json();
    
    if (!body.faceId || !body.tag) {
      return NextResponse.json(
        { success: false, error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 所有権の確認（ユーザーが所有するワークフローの顔かチェック）
    const { data: face, error: fetchError } = await supabase
      .from('detected_faces')
      .select('*, workflows!inner(uid)')
      .eq('id', body.faceId)
      .single();

    if (fetchError || !face) {
      return NextResponse.json(
        { success: false, error: '顔情報が見つかりません' },
        { status: 404 }
      );
    }

    if (face.workflows[0].uid !== uid) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    // タグ情報を更新
    const { error: updateError } = await supabase
      .from('detected_faces')
      .update({
        tag_name: body.tag.name,
        tag_role: body.tag.role,
        tag_description: body.tag.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.faceId);

    if (updateError) {
      console.error('[UpdateFaceTags API] Update failed:', updateError);
      return NextResponse.json(
        { success: false, error: 'タグの更新に失敗しました' },
        { status: 500 }
      );
    }

    // 更新後のデータを取得
    const { data: updatedFace, error: refetchError } = await supabase
      .from('detected_faces')
      .select('*')
      .eq('id', body.faceId)
      .single();

    if (refetchError || !updatedFace) {
      return NextResponse.json(
        { success: false, error: '更新後のデータ取得に失敗しました' },
        { status: 500 }
      );
    }

    // DetectedFace形式に変換
    const detectedFace: DetectedFace = {
      id: updatedFace.id,
      index: updatedFace.face_index,
      imageUrl: updatedFace.face_image_url,
      thumbnailUrl: updatedFace.thumbnail_url || undefined,
      boundingBox: updatedFace.bounding_box,
      confidence: updatedFace.detection_confidence || 0,
      attributes: updatedFace.face_attributes || undefined,
      tag: updatedFace.tag_name ? {
        name: updatedFace.tag_name,
        role: updatedFace.tag_role,
        description: updatedFace.tag_description || undefined,
        order: updatedFace.position_order || undefined,
      } : undefined,
    };

    const response: UpdateFaceTagResponse = {
      success: true,
      face: detectedFace,
    };

    console.log('[UpdateFaceTags API] Tag updated successfully');
    return NextResponse.json(response);

  } catch (error) {
    console.error('[UpdateFaceTags API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      } as UpdateFaceTagResponse,
      { status: 500 }
    );
  }
}

/**
 * 顔の並び順を更新
 */
export async function PUT(req: NextRequest) {
  console.log('[UpdateFaceTags API] PUT request received');
  
  try {
    // 認証チェック
    const uid = req.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body: UpdateFaceOrderRequest = await req.json();
    
    if (!body.faceIds || !Array.isArray(body.faceIds)) {
      return NextResponse.json(
        { success: false, error: '顔IDのリストが必要です' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 全ての顔が同じワークフローに属しているか確認
    const { data: faces, error: fetchError } = await supabase
      .from('detected_faces')
      .select('id, workflow_id, workflows!inner(uid)')
      .in('id', body.faceIds);

    if (fetchError || !faces || faces.length !== body.faceIds.length) {
      return NextResponse.json(
        { success: false, error: '指定された顔情報が見つかりません' },
        { status: 404 }
      );
    }

    // 所有権とワークフローの一貫性をチェック
    const workflowId = faces[0].workflow_id;
    const isValid = faces.every(face => 
      face.workflows[0].uid === uid && face.workflow_id === workflowId
    );

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    // 並び順を更新
    const updates = body.faceIds.map((faceId, index) => 
      supabase
        .from('detected_faces')
        .update({ position_order: index })
        .eq('id', faceId)
    );

    const results = await Promise.all(updates);
    const hasError = results.some(result => result.error);

    if (hasError) {
      console.error('[UpdateFaceTags API] Failed to update order');
      return NextResponse.json(
        { success: false, error: '並び順の更新に失敗しました' },
        { status: 500 }
      );
    }

    console.log('[UpdateFaceTags API] Order updated successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[UpdateFaceTags API] Error:', error);
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * 顔情報を削除
 */
export async function DELETE(req: NextRequest) {
  console.log('[UpdateFaceTags API] DELETE request received');
  
  try {
    // 認証チェック
    const uid = req.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const faceId = searchParams.get('faceId');
    
    if (!faceId) {
      return NextResponse.json(
        { success: false, error: '顔IDが必要です' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 所有権の確認
    const { data: face, error: fetchError } = await supabase
      .from('detected_faces')
      .select('face_image_url, thumbnail_url, workflows!inner(uid)')
      .eq('id', faceId)
      .single();

    if (fetchError || !face) {
      return NextResponse.json(
        { success: false, error: '顔情報が見つかりません' },
        { status: 404 }
      );
    }

    if (face.workflows[0].uid !== uid) {
      return NextResponse.json(
        { success: false, error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    // Storageから画像を削除
    const filesToDelete = [];
    
    if (face.face_image_url) {
      const facePath = face.face_image_url.split('/').pop();
      if (facePath) filesToDelete.push(facePath);
    }
    
    if (face.thumbnail_url) {
      const thumbnailPath = face.thumbnail_url.split('/').pop();
      if (thumbnailPath) filesToDelete.push(thumbnailPath);
    }

    if (filesToDelete.length > 0) {
      const { error: deleteStorageError } = await supabase.storage
        .from('face-reference')
        .remove(filesToDelete);

      if (deleteStorageError) {
        console.error('[UpdateFaceTags API] Failed to delete images from storage:', deleteStorageError);
      }
    }

    // データベースから削除
    const { error: deleteError } = await supabase
      .from('detected_faces')
      .delete()
      .eq('id', faceId);

    if (deleteError) {
      console.error('[UpdateFaceTags API] Delete failed:', deleteError);
      return NextResponse.json(
        { success: false, error: '削除に失敗しました' },
        { status: 500 }
      );
    }

    console.log('[UpdateFaceTags API] Face deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[UpdateFaceTags API] Error:', error);
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}