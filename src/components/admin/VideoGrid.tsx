'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { VideoWithRelations } from '@/hooks/useAdminVideos';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { Button } from '@/components/ui';
import { VideoThumbnail } from './VideoThumbnail';
import { GridSkeleton, CardSkeleton } from '@/components/ui/skeleton';
import { VideoPlayer } from '@/components/video';

// ================================================================
// Types
// ================================================================

interface VideoGridProps {
  videos: VideoWithRelations[];
  selectedVideos: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onVideoPreview?: (video: VideoWithRelations) => void;
  loading?: boolean;
}

// ================================================================
// Component
// ================================================================

export function VideoGrid({ 
  videos, 
  selectedVideos, 
  onSelectionChange,
  onVideoPreview,
  loading = false 
}: VideoGridProps) {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  // Handle individual selection
  const handleSelectVideo = useCallback((videoId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedVideos, videoId]);
    } else {
      onSelectionChange(selectedVideos.filter(id => id !== videoId));
    }
  }, [selectedVideos, onSelectionChange]);

  // Handle select all
  const isAllSelected = videos.length > 0 && selectedVideos.length === videos.length;
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(videos.map(v => v.id));
    }
  }, [isAllSelected, videos, onSelectionChange]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'queued':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Format file size
  const formatFileSize = (mb?: number) => {
    if (!mb) return '-';
    return `${mb.toFixed(1)} MB`;
  };

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <GridSkeleton
        count={8}
        columns={{ default: 1, sm: 2, lg: 3, xl: 4 }}
        component={<CardSkeleton />}
      />
    );
  }

  if (videos.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
        <div className="text-center">
          <p className="text-gray-400">動画が見つかりませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Select all button for grid view */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={handleSelectAll}
          className="rounded border-gray-600 text-purple-500 focus:ring-purple-500 cursor-pointer"
        />
        <label 
          onClick={handleSelectAll}
          className="text-sm text-gray-400 cursor-pointer hover:text-gray-300"
        >
          すべて選択
        </label>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
        <div
          key={video.id}
          className={`bg-gray-900 border rounded-lg overflow-hidden transition-all duration-200 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 ${
            selectedVideos.includes(video.id) ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-gray-800'
          }`}
        >
          {/* Thumbnail Area */}
          <div className="relative aspect-video bg-gray-800 group overflow-hidden">
            {video.status === 'completed' && video.url ? (
              <>
                {playingVideo === video.id ? (
                  /* Video Player */
                  <div className="absolute inset-0 bg-black">
                    <VideoPlayer
                      src={video.url}
                      poster=""
                      title={video.story?.title || '無題'}
                      className="w-full h-full"
                      controls
                      autoPlay
                    />
                    {/* Close button */}
                    <button
                      onClick={() => setPlayingVideo(null)}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-colors z-20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Video thumbnail */}
                    <VideoThumbnail
                      src={video.url}
                      alt={video.story?.title || '動画サムネイル'}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    
                    {/* Play button overlay */}
                    <button
                      onClick={() => setPlayingVideo(video.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors z-10"
                    >
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </button>

                    {/* Duration badge */}
                    {video.duration_sec && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
                        {formatDuration(video.duration_sec)}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-sm px-3 py-1 rounded-full ${getStatusColor(video.status)}`}>
                  {video.status}
                </div>
              </div>
            )}

            {/* Selection checkbox */}
            <div className="absolute top-2 left-2 z-20">
              <input
                type="checkbox"
                checked={selectedVideos.includes(video.id)}
                onChange={(e) => handleSelectVideo(video.id, e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-purple-500 focus:ring-purple-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Title */}
            <h3 className="text-sm font-medium text-gray-100 truncate mb-1">
              {video.story?.title || '無題'}
            </h3>

            {/* User info */}
            <p className="text-xs text-gray-400 truncate mb-3">
              {video.profile?.display_name || video.profile?.email?.split('@')[0] || 'Unknown'}
            </p>

            {/* Meta info */}
            <div className="space-y-1 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <span>サイズ:</span>
                <span className="text-gray-400">{formatFileSize(video.size_mb)}</span>
              </div>
              {video.resolution && (
                <div className="flex items-center justify-between">
                  <span>解像度:</span>
                  <span className="text-gray-400">{video.resolution}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>作成日:</span>
                <span className="text-gray-400">
                  {format(new Date(video.created_at), 'MM/dd', { locale: ja })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center mt-4 pt-3 border-t border-gray-800">
              <Link href={`/admin/videos/${video.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1"
                  title="詳細を表示"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}