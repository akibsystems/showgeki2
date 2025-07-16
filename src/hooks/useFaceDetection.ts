import { useState, useCallback } from 'react';
import type { DetectedFace, FaceTag, DetectFacesResponse } from '@/types/face-detection';

export interface UseFaceDetectionResult {
  // State
  detectedFaces: DetectedFace[];
  characterTags: Record<string, FaceTag>;
  isDetecting: boolean;
  error: string | null;
  
  // Actions
  detectFaces: (imageUrl: string, workflowId?: string, storyboardId?: string) => Promise<void>;
  updateTag: (faceId: string, tag: FaceTag) => void;
  reorderFaces: (faces: DetectedFace[]) => void;
  deleteFace: (faceId: string) => void;
  getCharactersWithTags: () => Array<{ face: DetectedFace; tag: FaceTag }>;
  reset: () => void;
}

export function useFaceDetection(userId?: string): UseFaceDetectionResult {
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [characterTags, setCharacterTags] = useState<Record<string, FaceTag>>({});
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 顔検出を実行
  const detectFaces = useCallback(async (
    imageUrl: string,
    workflowId?: string,
    storyboardId?: string
  ) => {
    setIsDetecting(true);
    setError(null);

    try {
      const response = await fetch('/api/instant/detect-faces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': userId || localStorage.getItem('user-id') || '',
        },
        body: JSON.stringify({
          imageUrl,
          workflowId,
          storyboardId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '顔検出に失敗しました');
      }

      const data: DetectFacesResponse = await response.json();

      if (data.success && data.faces.length > 0) {
        setDetectedFaces(data.faces);
      } else if (data.faces.length === 0) {
        setError('顔が検出されませんでした');
      } else {
        throw new Error(data.error || '顔検出に失敗しました');
      }
    } catch (err) {
      console.error('Face detection error:', err);
      setError(err instanceof Error ? err.message : '顔検出中にエラーが発生しました');
    } finally {
      setIsDetecting(false);
    }
  }, [userId]);

  // タグを更新
  const updateTag = useCallback((faceId: string, tag: FaceTag) => {
    setCharacterTags(prev => ({
      ...prev,
      [faceId]: tag
    }));

    // サーバーに保存（オプション）
    if (userId) {
      fetch('/api/instant/update-face-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': userId,
        },
        body: JSON.stringify({
          faceId,
          tag,
        }),
      }).catch(console.error);
    }
  }, [userId]);

  // 顔の並び順を変更
  const reorderFaces = useCallback((faces: DetectedFace[]) => {
    setDetectedFaces(faces);

    // サーバーに保存（オプション）
    if (userId) {
      fetch('/api/instant/update-face-tags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': userId,
        },
        body: JSON.stringify({
          faceIds: faces.map(f => f.id),
        }),
      }).catch(console.error);
    }
  }, [userId]);

  // 顔を削除
  const deleteFace = useCallback((faceId: string) => {
    setDetectedFaces(prev => prev.filter(f => f.id !== faceId));
    setCharacterTags(prev => {
      const newTags = { ...prev };
      delete newTags[faceId];
      return newTags;
    });

    // サーバーから削除（オプション）
    if (userId) {
      fetch(`/api/instant/update-face-tags?faceId=${faceId}`, {
        method: 'DELETE',
        headers: {
          'X-User-UID': userId,
        },
      }).catch(console.error);
    }
  }, [userId]);

  // タグ付けされたキャラクターを取得
  const getCharactersWithTags = useCallback(() => {
    return detectedFaces
      .filter(face => characterTags[face.id]?.name)
      .map(face => ({
        face,
        tag: characterTags[face.id]
      }));
  }, [detectedFaces, characterTags]);

  // リセット
  const reset = useCallback(() => {
    setDetectedFaces([]);
    setCharacterTags({});
    setError(null);
  }, []);

  return {
    detectedFaces,
    characterTags,
    isDetecting,
    error,
    detectFaces,
    updateTag,
    reorderFaces,
    deleteFace,
    getCharactersWithTags,
    reset,
  };
}