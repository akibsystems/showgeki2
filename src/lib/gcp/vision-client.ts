import { ImageAnnotatorClient } from '@google-cloud/vision';
import type { VisionAPIFaceAnnotation, FaceAttributes, LIKELIHOOD_SCORES } from '@/types/face-detection';

/**
 * Google Cloud Vision APIクライアント
 */
export class VisionClient {
  private client: ImageAnnotatorClient | null = null;
  
  constructor() {
    // 環境変数チェック
    if (!process.env.GCP_PROJECT_ID || !process.env.GCP_CLIENT_EMAIL || !process.env.GCP_PRIVATE_KEY) {
      console.warn('[VisionClient] GCP credentials not found in environment variables');
      return;
    }

    try {
      this.client = new ImageAnnotatorClient({
        projectId: process.env.GCP_PROJECT_ID,
        credentials: {
          client_email: process.env.GCP_CLIENT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      });
      console.log('[VisionClient] Initialized successfully');
    } catch (error) {
      console.error('[VisionClient] Failed to initialize:', error);
      throw new Error('Failed to initialize Vision API client');
    }
  }

  /**
   * 画像から顔を検出
   */
  async detectFaces(imageUrl: string): Promise<{
    faces: Array<{
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
        vertices: Array<{ x: number; y: number }>;
      };
      confidence: number;
      attributes: FaceAttributes;
    }>;
    imageSize?: { width: number; height: number };
  }> {
    if (!this.client) {
      throw new Error('Vision API client not initialized');
    }

    console.log(`[VisionClient] Detecting faces in image: ${imageUrl}`);

    try {
      // Vision APIを呼び出し
      const [result] = await this.client.faceDetection({
        image: {
          source: {
            imageUri: imageUrl,
          },
        },
        imageContext: {
          faceRecognitionParams: {
            celebritySet: [], // 有名人認識は使用しない
          },
        },
      });

      if (!result.faceAnnotations || result.faceAnnotations.length === 0) {
        console.log('[VisionClient] No faces detected');
        return { faces: [] };
      }

      console.log(`[VisionClient] Detected ${result.faceAnnotations.length} faces`);

      // 画像のサイズを取得（もし利用可能なら）
      let imageSize: { width: number; height: number } | undefined;
      if (result.fullTextAnnotation?.pages?.[0]) {
        const page = result.fullTextAnnotation.pages[0];
        if (page.width && page.height) {
          imageSize = { width: page.width, height: page.height };
        }
      }

      // 顔情報を整形
      const faces = result.faceAnnotations.map((face, index) => {
        console.log(`[VisionClient] Processing face ${index + 1}`);
        
        // バウンディングボックスを計算
        const boundingBox = this.calculateBoundingBox(face.boundingPoly?.vertices || []);
        
        // 属性情報を抽出
        const attributes = this.extractFaceAttributes(face);

        return {
          boundingBox,
          confidence: face.detectionConfidence || 0,
          attributes,
        };
      });

      return { faces, imageSize };

    } catch (error) {
      console.error('[VisionClient] Face detection failed:', error);
      if (error instanceof Error) {
        throw new Error(`Face detection failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 頂点情報からバウンディングボックスを計算
   */
  private calculateBoundingBox(vertices: Array<{ x?: number; y?: number }>): {
    x: number;
    y: number;
    width: number;
    height: number;
    vertices: Array<{ x: number; y: number }>;
  } {
    if (!vertices || vertices.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0, vertices: [] };
    }

    // 頂点座標を正規化（undefinedを0として扱う）
    const normalizedVertices = vertices.map(v => ({
      x: v.x || 0,
      y: v.y || 0,
    }));

    // 最小・最大座標を見つける
    const xs = normalizedVertices.map(v => v.x);
    const ys = normalizedVertices.map(v => v.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      vertices: normalizedVertices,
    };
  }

  /**
   * 顔の属性情報を抽出
   */
  private extractFaceAttributes(face: any): FaceAttributes {
    // 感情の尤度マップ
    const likelihoodScores: Record<string, number> = {
      VERY_UNLIKELY: 0.0,
      UNLIKELY: 0.25,
      POSSIBLE: 0.5,
      LIKELY: 0.75,
      VERY_LIKELY: 1.0,
      UNKNOWN: 0.5,
    };

    return {
      joy: likelihoodScores[face.joyLikelihood || 'UNKNOWN'],
      sorrow: likelihoodScores[face.sorrowLikelihood || 'UNKNOWN'],
      anger: likelihoodScores[face.angerLikelihood || 'UNKNOWN'],
      surprise: likelihoodScores[face.surpriseLikelihood || 'UNKNOWN'],
      // 年齢や性別は標準のFace Detection APIでは提供されない
      // 必要な場合は、Face Detection APIの代わりにFace APIを使用
      raw: {
        joyLikelihood: face.joyLikelihood,
        sorrowLikelihood: face.sorrowLikelihood,
        angerLikelihood: face.angerLikelihood,
        surpriseLikelihood: face.surpriseLikelihood,
        headwearLikelihood: face.headwearLikelihood,
        blurredLikelihood: face.blurredLikelihood,
      },
    };
  }

  /**
   * クライアントを閉じる
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}

// シングルトンインスタンス
let visionClientInstance: VisionClient | null = null;

/**
 * Vision APIクライアントのシングルトンインスタンスを取得
 */
export function getVisionClient(): VisionClient {
  if (!visionClientInstance) {
    visionClientInstance = new VisionClient();
  }
  return visionClientInstance;
}