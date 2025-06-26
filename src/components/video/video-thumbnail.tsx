'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Spinner } from '@/components/ui';

// ================================================================
// Video Thumbnail Component Types
// ================================================================

interface VideoThumbnailProps {
  src: string;
  width?: number;
  height?: number;
  timeOffset?: number; // seconds from start to capture thumbnail
  alt?: string;
  className?: string;
  onLoad?: (thumbnailUrl: string) => void;
  onError?: (error: any) => void;
}

// ================================================================
// Video Thumbnail Component
// ================================================================

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  src,
  width = 320,
  height = 180,
  timeOffset = 2,
  alt = 'Video thumbnail',
  className = '',
  onLoad,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const generateThumbnail = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) return;

      try {
        setIsLoading(true);
        setHasError(false);

        // Wait for video metadata to load
        await new Promise<void>((resolve, reject) => {
          const handleLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            resolve();
          };

          const handleError = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            reject(new Error('Failed to load video metadata'));
          };

          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);
        });

        // Seek to the desired time offset
        video.currentTime = Math.min(timeOffset, video.duration - 1);

        // Wait for the frame to be available
        await new Promise<void>((resolve, reject) => {
          const handleSeeked = () => {
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('error', handleError);
            resolve();
          };

          const handleError = () => {
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('error', handleError);
            reject(new Error('Failed to seek video'));
          };

          video.addEventListener('seeked', handleSeeked);
          video.addEventListener('error', handleError);
        });

        // Draw the current frame to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);

        // Convert canvas to blob URL
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail blob'));
            }
          }, 'image/jpeg', 0.8);
        });

        const thumbnailUrl = URL.createObjectURL(blob);
        setThumbnailUrl(thumbnailUrl);
        onLoad?.(thumbnailUrl);
      } catch (error) {
        console.error('Thumbnail generation failed:', error);
        setHasError(true);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    generateThumbnail();

    // Cleanup function
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [src, timeOffset, width, height, onLoad, onError]);

  if (hasError) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center p-4">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-xs text-gray-500">Thumbnail failed</p>
        </div>
      </div>
    );
  }

  if (isLoading || !thumbnailUrl) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <Spinner size="sm" className="mx-auto mb-2" />
          <p className="text-xs text-gray-500">Generating thumbnail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Hidden video element for thumbnail generation */}
      <video
        ref={videoRef}
        src={src}
        style={{ display: 'none' }}
        muted
        preload="metadata"
        crossOrigin="anonymous"
      />
      
      {/* Hidden canvas for frame capture */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
      
      {/* Thumbnail image */}
      <img
        src={thumbnailUrl}
        alt={alt}
        className="w-full h-full object-cover rounded-lg"
        style={{ width, height }}
      />
      
      {/* Play overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-lg opacity-0 hover:opacity-100 transition-opacity">
        <div className="bg-white bg-opacity-80 rounded-full p-3">
          <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// Video Thumbnail Cache
// ================================================================

interface ThumbnailCacheEntry {
  url: string;
  timestamp: number;
}

class VideoThumbnailCache {
  private cache = new Map<string, ThumbnailCacheEntry>();
  private readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours

  set(videoUrl: string, thumbnailUrl: string): void {
    this.cache.set(videoUrl, {
      url: thumbnailUrl,
      timestamp: Date.now(),
    });
  }

  get(videoUrl: string): string | null {
    const entry = this.cache.get(videoUrl);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      URL.revokeObjectURL(entry.url);
      this.cache.delete(videoUrl);
      return null;
    }

    return entry.url;
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      URL.revokeObjectURL(entry.url);
    }
    this.cache.clear();
  }
}

export const thumbnailCache = new VideoThumbnailCache();

// ================================================================
// Export
// ================================================================

export default VideoThumbnail;