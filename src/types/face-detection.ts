// 顔検出機能の型定義

/**
 * 検出された顔の情報
 */
export interface DetectedFace {
  id: string;
  index: number;
  imageUrl: string;
  thumbnailUrl?: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    vertices?: Array<{ x: number; y: number }>; // Vision APIから取得した頂点情報
  };
  confidence: number;
  attributes?: FaceAttributes;
  tag?: FaceTag;
}

/**
 * 顔の属性情報（感情、年齢など）
 */
export interface FaceAttributes {
  // 感情スコア (0-1)
  joy: number;
  sorrow: number;
  anger: number;
  surprise: number;
  
  // その他の属性
  ageRange?: string; // 例: "20-30"
  gender?: 'male' | 'female' | 'unknown';
  
  // Vision APIの生データ
  raw?: any;
}

/**
 * 顔に付けられたタグ情報
 */
export interface FaceTag {
  name: string;
  role: FaceRole;
  description?: string;
  order?: number;
}

/**
 * キャラクターの役割
 */
export type FaceRole = 'protagonist' | 'friend' | 'family' | 'colleague' | 'other';

/**
 * 役割の日本語表示用マップ
 */
export const FACE_ROLE_LABELS: Record<FaceRole, string> = {
  protagonist: '主人公',
  friend: '友人',
  family: '家族',
  colleague: '同僚',
  other: 'その他'
};

/**
 * 顔検出APIのリクエスト
 */
export interface DetectFacesRequest {
  imageUrl: string;
  workflowId?: string;
  storyboardId?: string;
}

/**
 * 顔検出APIのレスポンス
 */
export interface DetectFacesResponse {
  success: boolean;
  faces: DetectedFace[];
  totalFaces: number;
  originalImageUrl: string;
  processedAt: string;
  error?: string;
}

/**
 * タグ更新APIのリクエスト
 */
export interface UpdateFaceTagRequest {
  faceId: string;
  tag: FaceTag;
}

/**
 * タグ更新APIのレスポンス
 */
export interface UpdateFaceTagResponse {
  success: boolean;
  face?: DetectedFace;
  error?: string;
}

/**
 * 顔の並び順更新リクエスト
 */
export interface UpdateFaceOrderRequest {
  faceIds: string[];
}

/**
 * データベースの detected_faces テーブルの型
 */
export interface DetectedFaceDB {
  id: string;
  workflow_id: string | null;
  storyboard_id: string | null;
  original_image_url: string;
  face_index: number;
  face_image_url: string;
  thumbnail_url: string | null;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
    vertices?: Array<{ x: number; y: number }>;
  };
  detection_confidence: number | null;
  face_attributes: FaceAttributes | null;
  tag_name: string | null;
  tag_role: FaceRole | null;
  tag_description: string | null;
  position_order: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Vision API のレスポンス型（簡略版）
 */
export interface VisionAPIFaceAnnotation {
  boundingPoly: {
    vertices: Array<{ x?: number; y?: number }>;
  };
  detectionConfidence: number;
  joyLikelihood: string;
  sorrowLikelihood: string;
  angerLikelihood: string;
  surpriseLikelihood: string;
}

/**
 * 感情の尤度を数値に変換するマップ
 */
export const LIKELIHOOD_SCORES: Record<string, number> = {
  VERY_UNLIKELY: 0.0,
  UNLIKELY: 0.25,
  POSSIBLE: 0.5,
  LIKELY: 0.75,
  VERY_LIKELY: 1.0,
  UNKNOWN: 0.5
};