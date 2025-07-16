'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import type { DetectedFace } from '@/types/face-detection';

interface FaceDetectionOverlayProps {
  originalImage: string;
  detectedFaces: DetectedFace[];
  onFaceClick?: (face: DetectedFace) => void;
  selectedFaceId?: string;
}

export function FaceDetectionOverlay({
  originalImage,
  detectedFaces,
  onFaceClick,
  selectedFaceId,
}: FaceDetectionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  // コンテナサイズを監視
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    
    return () => {
      window.removeEventListener('resize', updateContainerSize);
    };
  }, []);

  // 画像のアスペクト比に基づいてスケールを計算
  const getScale = () => {
    if (!imageSize || !containerSize) return 1;
    
    const scaleX = containerSize.width / imageSize.width;
    const scaleY = containerSize.height / imageSize.height;
    
    // コンテナに収まるように小さい方のスケールを使用
    return Math.min(scaleX, scaleY, 1);
  };

  const scale = getScale();

  // 検出枠の位置とサイズを計算
  const getBoxStyle = (face: DetectedFace) => {
    if (!imageSize || !containerSize) return {};
    
    const box = face.boundingBox;
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;
    
    // 中央配置のオフセットを計算
    const offsetX = (containerSize.width - scaledWidth) / 2;
    const offsetY = (containerSize.height - scaledHeight) / 2;
    
    return {
      left: `${offsetX + box.x * scale}px`,
      top: `${offsetY + box.y * scale}px`,
      width: `${box.width * scale}px`,
      height: `${box.height * scale}px`,
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden"
    >
      {/* 元画像 */}
      <div className="relative w-full h-full flex items-center justify-center">
        <Image
          src={originalImage}
          alt="検出対象画像"
          fill
          style={{ objectFit: 'contain' }}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            setImageSize({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }}
        />
      </div>

      {/* 検出枠のオーバーレイ */}
      {imageSize && containerSize && detectedFaces.map((face, index) => {
        const isSelected = selectedFaceId === face.id;
        const boxStyle = getBoxStyle(face);

        return (
          <div
            key={face.id}
            className={`
              absolute border-2 transition-all duration-200 cursor-pointer
              ${isSelected
                ? 'border-purple-600 shadow-lg'
                : 'border-green-500 hover:border-green-400'
              }
            `}
            style={boxStyle}
            onClick={() => onFaceClick?.(face)}
          >
            {/* 顔番号のラベル */}
            <div
              className={`
                absolute -top-6 left-0 px-2 py-1 text-xs font-medium rounded
                ${isSelected
                  ? 'bg-purple-600 text-white'
                  : 'bg-green-500 text-white'
                }
              `}
            >
              {face.tag?.name || `人物 ${index + 1}`}
            </div>

            {/* 信頼度表示 */}
            {face.confidence > 0 && (
              <div
                className={`
                  absolute -bottom-6 left-0 px-2 py-1 text-xs rounded
                  ${isSelected
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-green-100 text-green-700'
                  }
                `}
              >
                {Math.round(face.confidence * 100)}%
              </div>
            )}

            {/* ホバー時のオーバーレイ */}
            <div
              className={`
                absolute inset-0 transition-opacity
                ${isSelected
                  ? 'bg-purple-600 opacity-10'
                  : 'bg-green-500 opacity-0 hover:opacity-10'
                }
              `}
            />
          </div>
        );
      })}

      {/* 検出結果のサマリー */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg">
        <p className="text-sm font-medium">
          {detectedFaces.length}人の顔を検出
        </p>
      </div>
    </div>
  );
}