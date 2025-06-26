'use client';

import React, { useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, Button } from '@/components/ui';
import { VideoPlayer } from './video-player';

// ================================================================
// Video Modal Component Types
// ================================================================

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  poster?: string;
  storyTitle?: string;
  duration?: number;
  onDownload?: () => void;
}

// ================================================================
// Video Modal Component
// ================================================================

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  title,
  poster,
  storyTitle,
  duration,
  onDownload,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-90 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-black rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                {storyTitle && (
                  <p className="text-sm text-gray-300">From: {storyTitle}</p>
                )}
                {duration && (
                  <p className="text-xs text-gray-400">Duration: {formatDuration(duration)}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Download Button */}
              {onDownload && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onDownload}
                  className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </Button>
              )}
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Video Player */}
          <div className="p-4">
            <VideoPlayer
              src={videoUrl}
              title={title}
              poster={poster}
              controls={true}
              width="100%"
              height="600px"
              autoPlay={false}
              className="rounded-lg"
              onError={(error) => {
                console.error('Video playback error:', error);
              }}
            />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                <p>Video controls: Spacebar to play/pause, Arrow keys to seek, F for fullscreen</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// Export
// ================================================================

export default VideoModal;