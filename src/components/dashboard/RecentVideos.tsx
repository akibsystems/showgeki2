'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface VideoItem {
  id: string;
  title: string;
  status: string;
  url: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
}

export function RecentVideos() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchVideos = async () => {
      try {
        const response = await fetch('/api/dashboard/recent-videos', {
          headers: {
            'X-User-UID': user.id,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('動画取得APIエラー:', errorData);
          throw new Error(errorData.error || 'Failed to fetch videos');
        }

        const data = await response.json();
        setVideos(data.videos || []);
      } catch (error) {
        console.error('Failed to fetch recent videos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [user]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '完成';
      case 'processing':
        return '生成中';
      case 'queued':
        return '待機中';
      case 'failed':
        return 'エラー';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'queued':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-400">まだ動画がありません</p>
          <p className="text-sm text-gray-500 mt-2">脚本から動画を生成してみましょう</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => (
        <Link key={video.id} href={`/videos/${video.id}`}>
          <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden">
            <div className="relative aspect-video bg-gray-900">
              {video.thumbnailUrl ? (
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {video.status === 'completed' ? (
                    <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <Spinner size="lg" />
                  )}
                </div>
              )}
              
              {/* ステータスバッジ */}
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(video.status)}`}>
                  {getStatusLabel(video.status)}
                </span>
              </div>
              
              {/* 動画時間 */}
              {video.duration && (
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                  {formatDuration(video.duration)}
                </div>
              )}
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-semibold text-white truncate">{video.title}</h3>
              <p className="text-sm text-gray-400 mt-1">
                {new Date(video.createdAt).toLocaleDateString('ja-JP')}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}