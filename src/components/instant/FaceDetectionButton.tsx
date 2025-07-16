'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { DetectedFace, DetectFacesResponse } from '@/types/face-detection';

interface FaceDetectionButtonProps {
  imageUrl: string;
  workflowId?: string;
  storyboardId?: string;
  onDetectionComplete: (faces: DetectedFace[]) => void;
  disabled?: boolean;
}

export function FaceDetectionButton({
  imageUrl,
  workflowId,
  storyboardId,
  onDetectionComplete,
  disabled = false,
}: FaceDetectionButtonProps) {
  const { user } = useAuth();
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetectFaces = async () => {
    setIsDetecting(true);
    setError(null);

    try {
      const response = await fetch('/api/instant/detect-faces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user?.id || '',
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
        onDetectionComplete(data.faces);
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
  };

  // 顔検出機能が無効の場合は表示しない
  if (process.env.NEXT_PUBLIC_ENABLE_FACE_DETECTION !== 'true') {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleDetectFaces}
        disabled={disabled || isDetecting}
        className={`
          w-full py-2 px-4 rounded-lg font-medium transition-all
          ${isDetecting
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : disabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }
        `}
      >
        {isDetecting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            顔を検出中...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            顔を検出してキャラクターを作成
          </span>
        )}
      </button>
      
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}