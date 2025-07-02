'use client';

import React, { useRef, useEffect, useState } from 'react';
import { thumbnailQueue } from '@/lib/thumbnail-queue';

// ================================================================
// Types
// ================================================================

interface VideoThumbnailProps {
  src: string;
  alt?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// ================================================================
// Component
// ================================================================

export function VideoThumbnail({ src, alt = 'Video thumbnail', className = '', onLoad, onError }: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const hasSeekedRef = useRef(false);
  const isGeneratingRef = useRef(false);
  const thumbnailUrlRef = useRef<string | null>(null);

  // Intersection Observer to detect when component is in viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInView) {
            setIsInView(true);
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [isInView]);

  useEffect(() => {
    // Only load video when in view
    if (!isInView) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !src) return;
    
    // Reset refs for new video
    hasSeekedRef.current = false;
    isGeneratingRef.current = false;
    
    // Set a timeout to automatically clean up if thumbnail generation takes too long
    const timeoutId = setTimeout(() => {
      if (!thumbnailUrlRef.current && !hasError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Thumbnail generation timeout for:', src);
        }
        setHasError(true);
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    const generateThumbnail = () => {
      if (isGeneratingRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Already generating thumbnail, skipping...');
        }
        return;
      }
      
      isGeneratingRef.current = true;
      
      try {
        const context = canvas.getContext('2d');
        if (!context) {
          console.warn('Failed to get canvas context');
          setHasError(true);
          setIsLoading(false);
          return;
        }

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (process.env.NODE_ENV === 'development') {
          console.log(`Generating thumbnail for video: ${src}, dimensions: ${video.videoWidth}x${video.videoHeight}`);
        }

        // Draw the current frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        thumbnailUrlRef.current = dataUrl;
        setThumbnailUrl(dataUrl);
        setIsLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.log('Thumbnail generated successfully');
        }
        onLoad?.();
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error);
        setHasError(true);
        setIsLoading(false);
        onError?.();
      }
    };

    const handleLoadedMetadata = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Video metadata loaded, duration: ${video.duration}s`);
      }
      // Don't seek immediately, wait for canplay event
    };

    const handleCanPlay = () => {
      if (hasSeekedRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Already seeked, skipping...');
        }
        return;
      }
      
      // Seek to 1 second or 10% of the video duration
      const seekTime = Math.min(1, video.duration * 0.1);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Video can play, seeking to: ${seekTime}s`);
      }
      hasSeekedRef.current = true;
      video.currentTime = seekTime;
    };

    const handleSeeked = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Video seeked, generating thumbnail...');
      }
      generateThumbnail();
    };

    const handleError = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      
      // Ignore error if thumbnail was already generated successfully
      if (thumbnailUrlRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Ignoring video error - thumbnail already generated');
        }
        return;
      }
      
      // Ignore empty src errors (happens during cleanup)
      if (video.error?.code === 4 && !video.src) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Ignoring empty src error during cleanup');
        }
        return;
      }
      
      const errorDetails = {
        error: video.error,
        errorCode: video.error?.code,
        errorMessage: video.error?.message,
        networkState: video.networkState,
        readyState: video.readyState,
        src: video.src,
        currentSrc: video.currentSrc,
      };
      
      // Network state codes
      const networkStates = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];
      const readyStates = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('Video error details:', {
          ...errorDetails,
          networkStateText: networkStates[video.networkState] || 'UNKNOWN',
          readyStateText: readyStates[video.readyState] || 'UNKNOWN',
        });
      }
      
      setHasError(true);
      setIsLoading(false);
      onError?.();
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    // Load video through queue to limit concurrent processing
    thumbnailQueue.add(async () => {
      return new Promise<void>((resolve) => {
        const cleanup = () => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onVideoError);
          resolve();
        };

        const onLoadedData = () => {
          cleanup();
        };

        const onVideoError = () => {
          cleanup();
        };

        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('error', onVideoError);
        
        video.load();
      });
    }).catch(error => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to queue video load:', error);
      }
    });

    return () => {
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Remove event listeners first to prevent errors during cleanup
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      
      // Pause video to stop loading
      if (video) {
        video.pause();
      }
      
      // Clean up object URL
      if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [src, onLoad, onError, isInView]);

  if (hasError) {
    return (
      <div ref={containerRef} className={`flex items-center justify-center bg-gray-800 ${className}`}>
        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      {/* Hidden video element for thumbnail generation */}
      {isInView && (
        <>
          <video
            ref={videoRef}
            src={src}
            crossOrigin="anonymous"
            style={{ display: 'none' }}
            preload="metadata"
          />
          
          {/* Hidden canvas for thumbnail generation */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
        </>
      )}
      
      {/* Display thumbnail or loading state */}
      {!isInView || isLoading ? (
        <div className={`flex items-center justify-center bg-gray-800 w-full h-full`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={alt}
            className="w-full h-full object-cover"
          />
        )
      )}
    </div>
  );
}