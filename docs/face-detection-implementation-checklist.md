# 顔検出・タグ付け機能 実装チェックリスト

## 概要
集合写真から複数の顔を自動検出し、切り取り、タグ付けする機能の実装チェックリスト。
GCP Vision APIを使用して実装。

## 1. 環境設定・設定ファイル

### ✅ `.env.local`
```env
# GCP Vision API設定
GCP_PROJECT_ID=your-project-id
GCP_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_ENABLE_FACE_DETECTION=true
```
- [ ] GCPプロジェクトID設定
- [ ] サービスアカウントのメールアドレス設定
- [ ] サービスアカウントの秘密鍵設定
- [ ] 顔検出機能の有効化フラグ設定

### ✅ `package.json`
```json
{
  "dependencies": {
    "@google-cloud/vision": "^4.0.0",
    "sharp": "^0.33.0"
  }
}
```
- [ ] Google Cloud Vision APIクライアントライブラリ追加
- [ ] Sharp（画像処理ライブラリ）追加

## 2. データベース関連

### ✅ `/migrations/004_add_face_detection_tables.sql`
```sql
-- 顔検出結果テーブル
CREATE TABLE detected_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  storyboard_id UUID REFERENCES storyboards(id) ON DELETE CASCADE,
  original_image_url TEXT NOT NULL,
  face_index INTEGER NOT NULL,
  face_image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  bounding_box JSONB NOT NULL,
  detection_confidence FLOAT,
  face_attributes JSONB,
  tag_name TEXT,
  tag_role TEXT,
  tag_description TEXT,
  position_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, face_index)
);

-- インデックス
CREATE INDEX idx_detected_faces_workflow_id ON detected_faces(workflow_id);
CREATE INDEX idx_detected_faces_storyboard_id ON detected_faces(storyboard_id);

-- RLSポリシー
ALTER TABLE detected_faces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own detected faces" ON detected_faces
  FOR SELECT USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE uid = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all detected faces" ON detected_faces
  FOR ALL USING (auth.role() = 'service_role');
```
- [ ] テーブル作成
- [ ] インデックス作成
- [ ] RLSポリシー設定

## 3. 型定義

### ✅ `/src/types/face-detection.ts`
```typescript
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
  };
  confidence: number;
  attributes?: {
    joy: number;
    sorrow: number;
    anger: number;
    surprise: number;
    ageRange?: string;
    gender?: string;
  };
  tag?: {
    name: string;
    role: string;
    description?: string;
  };
}

export interface FaceDetectionResult {
  faces: DetectedFace[];
  totalFaces: number;
  originalImageUrl: string;
  processedAt: string;
}

export interface FaceTag {
  faceId: string;
  name: string;
  role: 'protagonist' | 'friend' | 'family' | 'colleague' | 'other';
  description?: string;
  order: number;
}
```
- [ ] DetectedFace インターフェース定義
- [ ] FaceDetectionResult インターフェース定義
- [ ] FaceTag インターフェース定義

## 4. バックエンドAPI

### ✅ `/src/lib/gcp/vision-client.ts`
```typescript
import { ImageAnnotatorClient } from '@google-cloud/vision';

export class VisionClient {
  private client: ImageAnnotatorClient;

  constructor() {
    this.client = new ImageAnnotatorClient({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });
  }

  async detectFaces(imageUrl: string) {
    // 実装
  }
}
```
- [ ] GCP Vision APIクライアント初期化
- [ ] 認証設定
- [ ] 顔検出メソッド実装
- [ ] エラーハンドリング

### ✅ `/src/lib/face-detection/image-processor.ts`
```typescript
import sharp from 'sharp';

export class ImageProcessor {
  async cropFace(imageBuffer: Buffer, boundingBox: BoundingBox): Promise<Buffer> {
    // 実装
  }

  async createThumbnail(imageBuffer: Buffer, size: number = 150): Promise<Buffer> {
    // 実装
  }

  async downloadImage(url: string): Promise<Buffer> {
    // 実装
  }
}
```
- [ ] 画像ダウンロード機能
- [ ] 顔領域切り取り機能
- [ ] サムネイル生成機能
- [ ] 画像フォーマット変換

### ✅ `/src/app/api/instant/detect-faces/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { VisionClient } from '@/lib/gcp/vision-client';
import { ImageProcessor } from '@/lib/face-detection/image-processor';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // 実装内容:
  // 1. 認証チェック
  // 2. リクエストボディから画像URL取得
  // 3. Vision APIで顔検出
  // 4. 各顔を切り取り
  // 5. Supabase Storageに保存
  // 6. DBに検出結果を保存
  // 7. レスポンス返却
}
```
- [ ] 認証チェック
- [ ] リクエストバリデーション
- [ ] Vision API呼び出し
- [ ] 画像処理（切り取り）
- [ ] Storage保存
- [ ] DB保存
- [ ] エラーハンドリング
- [ ] レスポンス整形

### ✅ `/src/app/api/instant/update-face-tags/route.ts`
```typescript
export async function POST(req: NextRequest) {
  // 実装内容:
  // 1. 認証チェック
  // 2. タグ情報の更新
  // 3. 順序の更新
}

export async function DELETE(req: NextRequest) {
  // 実装内容:
  // 1. 認証チェック
  // 2. 顔画像の削除
  // 3. Storage/DBクリーンアップ
}
```
- [ ] タグ更新API
- [ ] 順序変更API
- [ ] 削除API
- [ ] バリデーション

## 5. フロントエンドコンポーネント

### ✅ `/src/components/instant/FaceDetectionButton.tsx`
```typescript
interface FaceDetectionButtonProps {
  imageUrl: string;
  onDetectionComplete: (faces: DetectedFace[]) => void;
  disabled?: boolean;
}

export function FaceDetectionButton({ imageUrl, onDetectionComplete, disabled }: FaceDetectionButtonProps) {
  // 実装内容:
  // 1. 検出開始ボタン
  // 2. ローディング状態
  // 3. エラー表示
  // 4. 成功時のコールバック
}
```
- [ ] ボタンコンポーネント
- [ ] ローディング状態管理
- [ ] API呼び出し
- [ ] エラーハンドリング
- [ ] 成功時の処理

### ✅ `/src/components/instant/FaceDetectionOverlay.tsx`
```typescript
interface FaceDetectionOverlayProps {
  originalImage: string;
  detectedFaces: DetectedFace[];
  onFaceClick?: (face: DetectedFace) => void;
}

export function FaceDetectionOverlay({ originalImage, detectedFaces, onFaceClick }: FaceDetectionOverlayProps) {
  // 実装内容:
  // 1. 元画像表示
  // 2. 検出枠のオーバーレイ
  // 3. インタラクション
  // 4. レスポンシブ対応
}
```
- [ ] 画像表示
- [ ] 検出枠描画
- [ ] クリックイベント
- [ ] ホバーエフェクト
- [ ] モバイル対応

### ✅ `/src/components/instant/FaceTaggingPanel.tsx`
```typescript
interface FaceTaggingPanelProps {
  faces: DetectedFace[];
  onTagUpdate: (faceId: string, tag: FaceTag) => void;
  onReorder: (faces: DetectedFace[]) => void;
  onDelete: (faceId: string) => void;
}

export function FaceTaggingPanel({ faces, onTagUpdate, onReorder, onDelete }: FaceTaggingPanelProps) {
  // 実装内容:
  // 1. 顔画像一覧表示
  // 2. タグ入力フォーム
  // 3. ドラッグ&ドロップ
  // 4. 削除機能
}
```
- [ ] 顔画像グリッド表示
- [ ] タグ入力UI
- [ ] 役割選択ドロップダウン
- [ ] ドラッグ&ドロップ実装
- [ ] 削除確認ダイアログ
- [ ] 保存状態表示

### ✅ `/src/components/instant/CharacterPreview.tsx`
```typescript
interface CharacterPreviewProps {
  characters: Array<{
    face: DetectedFace;
    tag: FaceTag;
  }>;
}

export function CharacterPreview({ characters }: CharacterPreviewProps) {
  // 実装内容:
  // 1. キャラクター一覧表示
  // 2. プロフィール形式
  // 3. ストーリー生成への連携
}
```
- [ ] キャラクターカード表示
- [ ] プロフィール情報
- [ ] 画像表示
- [ ] アニメーション

### ✅ `/src/app/instant/create/page.tsx` (更新)
```typescript
// 既存のコンポーネントに追加:
// 1. 顔検出機能の統合
// 2. タグ付けUIの追加
// 3. キャラクター情報の管理
// 4. ストーリー生成APIへの連携
```
- [ ] FaceDetectionButton統合
- [ ] 検出結果の状態管理
- [ ] タグ付けパネル表示
- [ ] キャラクター情報をAPIに送信
- [ ] UIフローの調整

## 6. ユーティリティ・ヘルパー

### ✅ `/src/lib/face-detection/utils.ts`
```typescript
export function calculateBoundingBox(vertices: any[]): BoundingBox {
  // 頂点座標から矩形領域を計算
}

export function scaleBoundingBox(box: BoundingBox, scale: number): BoundingBox {
  // バウンディングボックスをスケーリング
}

export function validateImageUrl(url: string): boolean {
  // 画像URLの検証
}

export function generateFaceImagePath(workflowId: string, faceIndex: number): string {
  // 顔画像の保存パス生成
}
```
- [ ] バウンディングボックス計算
- [ ] 座標変換ユーティリティ
- [ ] バリデーション関数
- [ ] パス生成関数

### ✅ `/src/hooks/useFaceDetection.ts`
```typescript
export function useFaceDetection() {
  // 実装内容:
  // 1. 顔検出API呼び出し
  // 2. 状態管理
  // 3. エラーハンドリング
  // 4. キャッシュ管理
}
```
- [ ] カスタムフック実装
- [ ] 状態管理
- [ ] API統合
- [ ] エラー処理
- [ ] ローディング状態

## 7. スタイル・UI

### ✅ `/src/styles/face-detection.module.css`
```css
/* 顔検出UI用のスタイル */
.detectionOverlay { }
.boundingBox { }
.faceTag { }
.characterCard { }
```
- [ ] オーバーレイスタイル
- [ ] バウンディングボックススタイル
- [ ] タグ入力スタイル
- [ ] レスポンシブ対応

## 8. テスト

### ✅ `/tests/face-detection/vision-client.test.ts`
- [ ] Vision APIクライアントのモック
- [ ] 顔検出のユニットテスト
- [ ] エラーケースのテスト

### ✅ `/tests/face-detection/image-processor.test.ts`
- [ ] 画像切り取りテスト
- [ ] サムネイル生成テスト
- [ ] 各種画像フォーマット対応テスト

## 9. ドキュメント

### ✅ `/docs/face-detection-setup.md`
- [ ] GCP設定手順
- [ ] 環境変数設定
- [ ] 使用方法
- [ ] トラブルシューティング

### ✅ `/docs/face-detection-api.md`
- [ ] API仕様
- [ ] リクエスト/レスポンス例
- [ ] エラーコード一覧

## 実装優先順位

1. **Phase 1: 基盤整備**（1-2日）
   - [ ] 環境設定
   - [ ] データベース構築
   - [ ] 型定義

2. **Phase 2: バックエンド実装**（2-3日）
   - [ ] Vision APIクライアント
   - [ ] 画像処理
   - [ ] API実装

3. **Phase 3: フロントエンド基本機能**（2-3日）
   - [ ] 顔検出ボタン
   - [ ] 検出結果表示
   - [ ] 基本的なタグ付け

4. **Phase 4: 高度な機能**（1-2日）
   - [ ] ドラッグ&ドロップ
   - [ ] キャラクタープレビュー
   - [ ] ストーリー生成統合

5. **Phase 5: 仕上げ**（1日）
   - [ ] エラーハンドリング強化
   - [ ] パフォーマンス最適化
   - [ ] ドキュメント作成

## 完了基準

- [ ] 集合写真から顔を自動検出できる
- [ ] 検出された顔を個別に切り取って保存できる
- [ ] 各顔にタグ（名前、役割）を付けられる
- [ ] タグ付けされた情報がストーリー生成に反映される
- [ ] エラー時の適切なフィードバック
- [ ] モバイルでも使いやすいUI