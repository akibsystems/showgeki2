'use client';

import React from 'react';
import { Modal } from '@/components/ui';
import { VideoPlayer } from '@/components/video';
import { VideoWithRelations } from '@/hooks/useAdminVideos';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';

// ================================================================
// Types
// ================================================================

interface VideoPreviewModalProps {
  video: VideoWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

// ================================================================
// Component
// ================================================================

export function VideoPreviewModal({ video, isOpen, onClose }: VideoPreviewModalProps) {
  if (!video) return null;

  const formatFileSize = (mb?: number) => {
    if (!mb) return '-';
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="動画プレビュー"
      size="xl"
    >
      <div className="space-y-6">
        {/* Video Player */}
        {video.url && (
          <div className="bg-black rounded-lg overflow-hidden">
            <VideoPlayer
              src={video.url}
              poster=""
              title={video.story?.title || '無題'}
            />
          </div>
        )}

        {/* Video Information */}
        <div className="bg-gray-900 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-100 mb-2">
              {video.story?.title || '無題'}
            </h3>
            <p className="text-sm text-gray-400">
              ID: {video.id}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">ユーザー</p>
              <p className="text-gray-100 mt-1">
                {video.profile?.display_name || video.profile?.email || 'Unknown'}
              </p>
            </div>
            
            <div>
              <p className="text-gray-400">作成日時</p>
              <p className="text-gray-100 mt-1">
                {format(new Date(video.created_at), 'yyyy年M月d日 HH:mm', { locale: ja })}
              </p>
            </div>

            <div>
              <p className="text-gray-400">動画時間</p>
              <p className="text-gray-100 mt-1">
                {formatDuration(video.duration_sec)}
              </p>
            </div>

            <div>
              <p className="text-gray-400">ファイルサイズ</p>
              <p className="text-gray-100 mt-1">
                {formatFileSize(video.size_mb)}
              </p>
            </div>

            {video.resolution && (
              <div>
                <p className="text-gray-400">解像度</p>
                <p className="text-gray-100 mt-1">
                  {video.resolution}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-800">
            <a
              href={video.url}
              download
              className="inline-flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ダウンロード
            </a>

            <a
              href={`/stories/${video.story_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              ストーリーを見る
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}