import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVisionClient } from '@/lib/gcp/vision-client';
import { getImageProcessor } from '@/lib/face-detection/image-processor';
import { generateFaceImagePath, sortFacesByPosition, validateImageUrl } from '@/lib/face-detection/utils';
import type { DetectFacesRequest, DetectFacesResponse, DetectedFace } from '@/types/face-detection';

export async function POST(req: NextRequest) {
  console.log('[DetectFaces API] Request received');
  
  try {
    // 1. 認証チェック
    const uid = req.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 2. リクエストボディの取得とバリデーション
    const body: DetectFacesRequest = await req.json();
    
    if (!body.imageUrl) {
      return NextResponse.json(
        { success: false, error: '画像URLが必要です' },
        { status: 400 }
      );
    }

    // 画像URLの検証
    if (!validateImageUrl(body.imageUrl)) {
      return NextResponse.json(
        { success: false, error: '無効な画像URLです' },
        { status: 400 }
      );
    }

    console.log(`[DetectFaces API] Processing image: ${body.imageUrl}`);

    // 3. 必要なクライアントの初期化
    // サービスロールキーで直接Supabaseクライアントを作成（RLSをバイパス）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );
    const visionClient = getVisionClient();
    const imageProcessor = getImageProcessor();

    // 4. 画像のダウンロード
    console.log('[DetectFaces API] Downloading image...');
    const imageBuffer = await imageProcessor.downloadImage(body.imageUrl);
    
    // 画像の検証
    const isValid = await imageProcessor.validateImage(imageBuffer);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '対応していない画像形式です' },
        { status: 400 }
      );
    }

    // 5. Vision APIで顔検出
    console.log('[DetectFaces API] Detecting faces with Vision API...');
    const detectionResult = await visionClient.detectFaces(body.imageUrl);
    
    if (detectionResult.faces.length === 0) {
      console.log('[DetectFaces API] No faces detected');
      return NextResponse.json({
        success: true,
        faces: [],
        totalFaces: 0,
        originalImageUrl: body.imageUrl,
        processedAt: new Date().toISOString(),
      } as DetectFacesResponse);
    }

    console.log(`[DetectFaces API] Detected ${detectionResult.faces.length} faces`);

    // 6. 各顔を処理
    const processedFaces: DetectedFace[] = [];
    
    for (let i = 0; i < detectionResult.faces.length; i++) {
      const face = detectionResult.faces[i];
      console.log(`[DetectFaces API] Processing face ${i + 1}/${detectionResult.faces.length}`);

      try {
        // 顔を切り取る
        const faceBuffer = await imageProcessor.cropFace(imageBuffer, face.boundingBox);
        
        // サムネイルを生成
        const thumbnailBuffer = await imageProcessor.createThumbnail(faceBuffer);

        // Supabase Storageに保存
        const facePath = generateFaceImagePath(body.workflowId || 'temp', i, 'face');
        const thumbnailPath = generateFaceImagePath(body.workflowId || 'temp', i, 'thumbnail');

        // 顔画像をアップロード
        const { error: faceUploadError } = await supabase.storage
          .from('face-reference')
          .upload(facePath, faceBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (faceUploadError) {
          console.error(`[DetectFaces API] Failed to upload face image:`, faceUploadError);
          continue;
        }

        // サムネイルをアップロード
        const { error: thumbnailUploadError } = await supabase.storage
          .from('face-reference')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (thumbnailUploadError) {
          console.error(`[DetectFaces API] Failed to upload thumbnail:`, thumbnailUploadError);
        }

        // 公開URLを取得
        const { data: faceUrlData } = supabase.storage
          .from('face-reference')
          .getPublicUrl(facePath);

        const { data: thumbnailUrlData } = supabase.storage
          .from('face-reference')
          .getPublicUrl(thumbnailPath);

        // DetectedFace オブジェクトを作成
        const detectedFace: DetectedFace = {
          id: `face-${i}-${Date.now()}`,
          index: i,
          imageUrl: faceUrlData.publicUrl,
          thumbnailUrl: thumbnailUrlData.publicUrl,
          boundingBox: face.boundingBox,
          confidence: face.confidence,
          attributes: face.attributes,
        };

        processedFaces.push(detectedFace);

        // データベースに保存（workflowIdが指定されている場合）
        if (body.workflowId) {
          const { error: dbError } = await supabase
            .from('detected_faces')
            .insert({
              workflow_id: body.workflowId,
              storyboard_id: body.storyboardId,
              original_image_url: body.imageUrl,
              face_index: i,
              face_image_url: faceUrlData.publicUrl,
              thumbnail_url: thumbnailUrlData.publicUrl,
              bounding_box: face.boundingBox,
              detection_confidence: face.confidence,
              face_attributes: face.attributes,
              position_order: i,
            });

          if (dbError) {
            console.error(`[DetectFaces API] Failed to save to database:`, dbError);
          } else {
            // DBから生成されたIDを取得
            const { data: savedFace } = await supabase
              .from('detected_faces')
              .select('id')
              .eq('workflow_id', body.workflowId)
              .eq('face_index', i)
              .single();

            if (savedFace) {
              detectedFace.id = savedFace.id;
            }
          }
        }

      } catch (error) {
        console.error(`[DetectFaces API] Failed to process face ${i}:`, error);
        // エラーが発生してもの顔の処理を続ける
      }
    }

    // 7. 顔を位置順（左から右）にソート
    const sortedFaces = sortFacesByPosition(processedFaces);

    // 8. レスポンスを返却
    const response: DetectFacesResponse = {
      success: true,
      faces: sortedFaces,
      totalFaces: sortedFaces.length,
      originalImageUrl: body.imageUrl,
      processedAt: new Date().toISOString(),
    };

    console.log(`[DetectFaces API] Successfully processed ${sortedFaces.length} faces`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[DetectFaces API] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        faces: [],
        totalFaces: 0,
        originalImageUrl: '',
        processedAt: new Date().toISOString(),
      } as DetectFacesResponse,
      { status: 500 }
    );
  }
}