'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Spinner } from '@/components/ui';
import { VideoModal, FullscreenVideoPlayer } from '@/components/video';
import { useApp, useToast } from '@/contexts';
import { useVideos, useStories } from '@/hooks';
import type { VideoStatus, Video } from '@/types';

// ================================================================
// Types
// ================================================================

type StatusFilter = 'all' | VideoStatus;

// ================================================================
// Videos Page Component
// ================================================================

const VideosPage: React.FC = () => {
  const { state } = useApp();
  const { error, success } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showFullscreenPlayer, setShowFullscreenPlayer] = useState(false);

  // Fetch videos using SWR hook
  const { videos, isLoading } = useVideos();

  // Fetch stories to get titles
  const { stories } = useStories();


  // Filter and search videos
  const filteredVideos = (videos || []).filter(video => {
    // Note: Video schema doesn't have story_title, need to use story data for title
    const searchText = video.story_id.toLowerCase();
    const matchesSearch = searchText.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || video.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400 bg-emerald-900/30 border-emerald-500/50';
      case 'processing':
        return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
      case 'queued':
        return 'text-amber-400 bg-amber-900/30 border-amber-500/50';
      case 'failed':
        return 'text-red-400 bg-red-900/30 border-red-500/50';
      default:
        return 'text-gray-400 bg-gray-800/30 border-gray-600/50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'processing':
        return '処理中';
      case 'queued':
        return '待機中';
      case 'failed':
        return '失敗';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (sizeMb: number) => {
    if (sizeMb < 1) {
      return `${(sizeMb * 1024).toFixed(0)} KB`;
    }
    return `${sizeMb.toFixed(1)} MB`;
  };

  const getStatusCounts = () => {
    const videoList = videos || [];
    return {
      all: videoList.length,
      queued: videoList.filter(v => v.status === 'queued').length,
      processing: videoList.filter(v => v.status === 'processing').length,
      completed: videoList.filter(v => v.status === 'completed').length,
      failed: videoList.filter(v => v.status === 'failed').length,
    };
  };

  const statusCounts = getStatusCounts();

  // Get story title by story_id
  const getStoryTitle = (storyId: string): string => {
    const story = stories?.find(s => s.id === storyId);
    return story?.title || `Story ${storyId}`;
  };

  // Handler functions
  // Handler functions
  const handleWatchVideo = (video: Video) => {
    if (!video.url) return;

    try {
      // Create download link
      const link = document.createElement('a');
      link.href = video.url;
      link.download = `video-${video.story_id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // success('Video download started');
    } catch (err) {
      console.error('Failed to download video:', err);
      error('Failed to download video');
    }
  };

  const handleDownloadVideo = async (video: Video) => {
    if (!video.url) return;

    try {
      // Get story title for filename
      const storyTitle = getStoryTitle(video.story_id);
      const filename = `${storyTitle.replace(/[^a-zA-Z0-9ぁ-ゖァ-ヶー一-龯]/g, '_')}.mp4`;

      // Add download parameter to Supabase Storage URL
      // Supabase Storage uses ?download parameter to force download
      const downloadUrl = video.url.includes('?')
        ? `${video.url}&download`
        : `${video.url}?download`;

      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';

      // Add to body before clicking (required for Firefox)
      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

    } catch (err) {
      console.error('Failed to download video:', err);
      error('動画の保存に失敗しました。もう一度お試しください。');
    }
  };

  const handleRetryVideo = async (video: Video) => {
    try {
      // TODO: Implement API call to retry video generation when backend supports it
      // success('Video retry will be available when backend supports it');
    } catch (err) {
      console.error('Failed to retry video:', err);
      error('Failed to retry video generation');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-400">動画を読み込み中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-100">動画一覧</h1>
              <p className="mt-1 text-sm text-gray-400">
                生成された動画を表示・管理します
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'すべて', count: statusCounts.all },
                { key: 'completed', label: '完了', count: statusCounts.completed },
                { key: 'processing', label: '処理中', count: statusCounts.processing },
                { key: 'queued', label: '待機中', count: statusCounts.queued },
                { key: 'failed', label: '失敗', count: statusCounts.failed },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key as StatusFilter)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${statusFilter === filter.key
                    ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                    : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-purple-500/10 hover:text-purple-300'
                    }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="動画を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 bg-gray-800/50 border border-purple-500/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-100 placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-100 mb-2">
              {searchQuery || statusFilter !== 'all' ? '動画が見つかりません' : 'まだ動画がありません'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? '検索条件やフィルターを変更してみてください'
                : '台本を作成して最初の動画を生成しましょう'
              }
            </p>
            {(!searchQuery && statusFilter === 'all') && (
              <Link href="/stories/new">
                <Button>最初の台本を作成</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-medium text-gray-100 line-clamp-2">
                      {getStoryTitle(video.story_id)}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(video.status)} ml-2 flex-shrink-0`}>
                      {getStatusText(video.status)}
                    </span>
                  </div>

                  {/* Video Thumbnail */}
                  <div className="aspect-video mb-4">
                    {video.status === 'completed' && video.url ? (
                      <div
                        className="cursor-pointer relative group"
                        onClick={() => handleWatchVideo(video)}
                      >
                        <video
                          src={video.url}
                          className="w-full h-full object-cover rounded-lg"
                          preload="metadata"
                          muted
                          onLoadedMetadata={(e) => {
                            // Set the video to show frame at 2 seconds for thumbnail
                            const video = e.target as HTMLVideoElement;
                            video.currentTime = Math.min(2, video.duration - 1);
                          }}
                        />
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-purple-600/80 backdrop-blur-sm rounded-full p-3 shadow-lg">
                            <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-800/50 rounded-lg flex items-center justify-center border border-purple-500/10">
                        {video.status === 'processing' ? (
                          <div className="text-center">
                            <Spinner size="lg" className="mx-auto mb-2 text-purple-400" />
                            <p className="text-xs text-gray-400">処理中...</p>
                          </div>
                        ) : video.status === 'failed' ? (
                          <div className="text-center">
                            <svg className="w-12 h-12 mx-auto text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <p className="text-xs text-red-500">失敗</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg className="w-12 h-12 mx-auto text-amber-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-amber-400">待機中</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Video Details */}
                  <div className="space-y-2">
                    {video.duration_sec && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">再生時間:</span>
                        <span className="font-medium">{formatDuration(video.duration_sec)}</span>
                      </div>
                    )}

                    {video.resolution && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">解像度:</span>
                        <span className="font-medium">{video.resolution}</span>
                      </div>
                    )}

                    {video.size_mb && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">ファイルサイズ:</span>
                        <span className="font-medium">{formatFileSize(video.size_mb)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">作成日:</span>
                      <span className="font-medium">{formatDate(video.created_at)}</span>
                    </div>

                    {video.error_msg && (
                      <div className="mt-3 p-2 bg-red-900/30 border border-red-500/30 rounded">
                        <p className="text-xs text-red-400">{video.error_msg}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex space-x-2">
                    {video.status === 'completed' && video.url && (
                      <>
                        <Button size="sm" className="flex-1" onClick={() => handleWatchVideo(video)}>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          見る
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleDownloadVideo(video)}>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          保存
                        </Button>
                      </>
                    )}

                    {video.status === 'failed' && (
                      <Button variant="secondary" size="sm" className="w-full" onClick={() => handleRetryVideo(video)}>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        再試行
                      </Button>
                    )}

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo?.url && (
        <VideoModal
          isOpen={showVideoModal}
          onClose={() => {
            setShowVideoModal(false);
            setSelectedVideo(null);
          }}
          videoUrl={selectedVideo.url}
          title={getStoryTitle(selectedVideo.story_id)}
          storyTitle={getStoryTitle(selectedVideo.story_id)}
          duration={selectedVideo.duration_sec}
          onDownload={() => handleDownloadVideo(selectedVideo)}
        />
      )}

      {/* Fullscreen Video Player */}
      {selectedVideo?.url && (
        <FullscreenVideoPlayer
          isOpen={showFullscreenPlayer}
          onClose={() => {
            setShowFullscreenPlayer(false);
            setSelectedVideo(null);
          }}
          videoUrl={selectedVideo.url}
          title={getStoryTitle(selectedVideo.story_id)}
        />
      )}
    </Layout>
  );
};

export default VideosPage;