/**
 * 顔検出機能のユーティリティ関数
 */

/**
 * バウンディングボックスをスケーリング
 * @param box 元のバウンディングボックス
 * @param scale スケール倍率
 */
export function scaleBoundingBox(
  box: { x: number; y: number; width: number; height: number },
  scale: number
): { x: number; y: number; width: number; height: number } {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  
  const newWidth = box.width * scale;
  const newHeight = box.height * scale;
  
  return {
    x: centerX - newWidth / 2,
    y: centerY - newHeight / 2,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * バウンディングボックスが画像の範囲内に収まるように調整
 * @param box バウンディングボックス
 * @param imageSize 画像のサイズ
 */
export function clampBoundingBox(
  box: { x: number; y: number; width: number; height: number },
  imageSize: { width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  const x = Math.max(0, Math.min(box.x, imageSize.width));
  const y = Math.max(0, Math.min(box.y, imageSize.height));
  const width = Math.min(box.width, imageSize.width - x);
  const height = Math.min(box.height, imageSize.height - y);
  
  return { x, y, width, height };
}

/**
 * 画像URLの検証
 * @param url 検証するURL
 */
export function validateImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // HTTPSチェック（開発環境ではHTTPも許可）
    if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
      return false;
    }
    
    // 画像拡張子チェック
    const pathname = parsedUrl.pathname.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    
    // Supabase Storageの場合は拡張子チェックをスキップ
    if (parsedUrl.hostname.includes('supabase.co')) {
      return true;
    }
    
    return hasImageExtension;
  } catch {
    return false;
  }
}

/**
 * 顔画像の保存パスを生成
 * @param workflowId ワークフローID
 * @param faceIndex 顔のインデックス
 * @param type 画像タイプ（'face' or 'thumbnail'）
 */
export function generateFaceImagePath(
  workflowId: string,
  faceIndex: number,
  type: 'face' | 'thumbnail' = 'face'
): string {
  const timestamp = Date.now();
  const suffix = type === 'thumbnail' ? '_thumb' : '';
  return `faces/${workflowId}/${faceIndex}_${timestamp}${suffix}.jpg`;
}

/**
 * 感情スコアから主要な感情を判定
 * @param attributes 顔の属性情報
 */
export function getDominantEmotion(attributes: {
  joy: number;
  sorrow: number;
  anger: number;
  surprise: number;
}): { emotion: string; score: number } | null {
  const emotions = [
    { emotion: 'joy', score: attributes.joy },
    { emotion: 'sorrow', score: attributes.sorrow },
    { emotion: 'anger', score: attributes.anger },
    { emotion: 'surprise', score: attributes.surprise },
  ];
  
  // 最も高いスコアの感情を取得
  const dominant = emotions.reduce((max, current) => 
    current.score > max.score ? current : max
  );
  
  // スコアが0.5以上の場合のみ有効とする
  if (dominant.score >= 0.5) {
    return dominant;
  }
  
  return null;
}

/**
 * 感情を日本語に変換
 */
export const EMOTION_LABELS: Record<string, string> = {
  joy: '喜び',
  sorrow: '悲しみ',
  anger: '怒り',
  surprise: '驚き',
};

/**
 * 顔検出の信頼度をパーセンテージ文字列に変換
 * @param confidence 信頼度（0-1）
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * 顔の位置から並び順を推定（左から右へ）
 * @param faces 顔情報の配列
 */
export function sortFacesByPosition<T extends { boundingBox: { x: number } }>(
  faces: T[]
): T[] {
  return [...faces].sort((a, b) => a.boundingBox.x - b.boundingBox.x);
}

/**
 * バウンディングボックスの重なりを検出
 * @param box1 バウンディングボックス1
 * @param box2 バウンディングボックス2
 */
export function detectOverlap(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): boolean {
  const x1Min = box1.x;
  const x1Max = box1.x + box1.width;
  const y1Min = box1.y;
  const y1Max = box1.y + box1.height;
  
  const x2Min = box2.x;
  const x2Max = box2.x + box2.width;
  const y2Min = box2.y;
  const y2Max = box2.y + box2.height;
  
  return !(x1Max < x2Min || x2Max < x1Min || y1Max < y2Min || y2Max < y1Min);
}

/**
 * エラーメッセージを日本語に変換
 */
export function translateErrorMessage(error: string): string {
  const errorMap: Record<string, string> = {
    'No faces detected': '顔が検出されませんでした',
    'Failed to download image': '画像のダウンロードに失敗しました',
    'Failed to process image': '画像の処理に失敗しました',
    'Image too large': '画像サイズが大きすぎます',
    'Invalid image format': '対応していない画像形式です',
    'API quota exceeded': 'API使用量の上限に達しました',
  };
  
  // 部分一致で検索
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.includes(key)) {
      return value;
    }
  }
  
  return 'エラーが発生しました';
}