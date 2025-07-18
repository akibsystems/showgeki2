'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { VideoWithRelations } from '@/hooks/useAdminVideos';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { Button } from '@/components/ui';
import { TableSkeleton } from '@/components/ui/skeleton';

// ================================================================
// Types
// ================================================================

interface VideoTableProps {
  videos: VideoWithRelations[];
  selectedVideos: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  loading?: boolean;
}

// ================================================================
// Component
// ================================================================

export function VideoTable({ 
  videos, 
  selectedVideos, 
  onSelectionChange,
  loading = false 
}: VideoTableProps) {
  const [sortField, setSortField] = useState<keyof VideoWithRelations>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      onSelectionChange(videos.map(v => v.id));
    } else {
      onSelectionChange([]);
    }
  }, [videos, onSelectionChange]);

  // Handle individual selection
  const handleSelectVideo = useCallback((videoId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedVideos, videoId]);
    } else {
      onSelectionChange(selectedVideos.filter(id => id !== videoId));
    }
  }, [selectedVideos, onSelectionChange]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'processing':
        return 'bg-amber-500/20 text-amber-400';
      case 'error':
        return 'bg-red-500/20 text-red-400';
      case 'queued':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
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
    return <TableSkeleton rows={10} columns={7} />;
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
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[768px]">
          <thead className="bg-gray-800/50 border-b border-gray-700">
            <tr>
              <th className="px-3 lg:px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedVideos.length === videos.length && videos.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                />
              </th>
              <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-300">
                動画情報
              </th>
              <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-300 hidden lg:table-cell">
                ユーザー
              </th>
              <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-300">
                ステータス
              </th>
              <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-300 hidden md:table-cell">
                詳細
              </th>
              <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-300">
                作成日時
              </th>
              <th className="px-3 lg:px-4 py-3 text-right text-xs lg:text-sm font-medium text-gray-300">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {videos.map((video) => (
              <tr key={video.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-3 lg:px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedVideos.includes(video.id)}
                    onChange={(e) => handleSelectVideo(video.id, e.target.checked)}
                    className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                  />
                </td>
                <td className="px-3 lg:px-4 py-3">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-100 truncate max-w-[200px]">
                      {video.story?.title || '無題'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {video.id.slice(0, 8)}...
                    </p>
                  </div>
                </td>
                <td className="px-3 lg:px-4 py-3 hidden lg:table-cell">
                  <div>
                    <p className="text-xs lg:text-sm text-gray-300">
                      {video.profile?.display_name || video.profile?.email?.split('@')[0] || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {video.uid.slice(0, 8)}...
                    </p>
                  </div>
                </td>
                <td className="px-3 lg:px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(video.status)}`}>
                    {video.status}
                  </span>
                </td>
                <td className="px-3 lg:px-4 py-3 hidden md:table-cell">
                  <div className="text-xs lg:text-sm text-gray-400">
                    <p>時間: {formatDuration(video.duration_sec)}</p>
                    <p>サイズ: {formatFileSize(video.size_mb)}</p>
                    {video.resolution && (
                      <p className="hidden xl:block">解像度: {video.resolution}</p>
                    )}
                  </div>
                </td>
                <td className="px-3 lg:px-4 py-3">
                  <p className="text-xs lg:text-sm text-gray-300">
                    {format(new Date(video.created_at), 'yyyy/MM/dd', { locale: ja })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(video.created_at), 'HH:mm', { locale: ja })}
                  </p>
                </td>
                <td className="px-3 lg:px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/videos/${video.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="詳細を表示"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}