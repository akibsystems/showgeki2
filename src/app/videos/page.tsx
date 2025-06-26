'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Spinner } from '@/components/ui';
import { VideoModal } from '@/components/video';
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
        return 'text-green-600 bg-green-100 border-green-200';
      case 'processing':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'queued':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'failed':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${hours}:${minutes}`;
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
  const handleWatchVideo = (video: Video) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const handleDownloadVideo = async (video: Video) => {
    if (!video.url) return;

    try {
      // Create download link
      const link = document.createElement('a');
      link.href = video.url;
      link.download = `video-${video.story_id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      success('Video download started');
    } catch (err) {
      console.error('Failed to download video:', err);
      error('Failed to download video');
    }
  };

  const handleRetryVideo = async (video: Video) => {
    try {
      // TODO: Implement API call to retry video generation when backend supports it
      success('Video retry will be available when backend supports it');
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
            <p className="mt-4 text-gray-600">Loading videos...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Your Videos</h1>
              <p className="mt-1 text-sm text-gray-600">
                View and manage your generated videos.
              </p>
            </div>
            <Link href="/stories/new">
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Story
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All', count: statusCounts.all },
                { key: 'completed', label: 'Completed', count: statusCounts.completed },
                { key: 'processing', label: 'Processing', count: statusCounts.processing },
                { key: 'queued', label: 'Queued', count: statusCounts.queued },
                { key: 'failed', label: 'Failed', count: statusCounts.failed },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key as StatusFilter)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    statusFilter === filter.key
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No videos found' : 'No videos yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Create a story and generate your first video.'
              }
            </p>
            {(!searchQuery && statusFilter === 'all') && (
              <Link href="/stories/new">
                <Button>Create Your First Story</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                      {getStoryTitle(video.story_id)}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(video.status)} ml-2 flex-shrink-0`}>
                      {video.status}
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
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white bg-opacity-80 rounded-full p-3">
                            <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                        {video.status === 'processing' ? (
                          <div className="text-center">
                            <Spinner size="lg" className="mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Processing...</p>
                          </div>
                        ) : video.status === 'failed' ? (
                          <div className="text-center">
                            <svg className="w-12 h-12 mx-auto text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <p className="text-xs text-red-500">Failed</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg className="w-12 h-12 mx-auto text-yellow-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-yellow-600">Queued</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Video Details */}
                  <div className="space-y-2">
                    {video.duration_sec && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{formatDuration(video.duration_sec)}</span>
                      </div>
                    )}
                    
                    {video.resolution && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Resolution:</span>
                        <span className="font-medium">{video.resolution}</span>
                      </div>
                    )}
                    
                    {video.size_mb && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">File Size:</span>
                        <span className="font-medium">{formatFileSize(video.size_mb)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">{formatDate(video.created_at)}</span>
                    </div>

                    {video.error_msg && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs text-red-600">{video.error_msg}</p>
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
                          Watch
                        </Button>
                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleDownloadVideo(video)}>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </Button>
                      </>
                    )}
                    
                    {video.status === 'failed' && (
                      <Button variant="secondary" size="sm" className="w-full" onClick={() => handleRetryVideo(video)}>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry
                      </Button>
                    )}

                    <Link href={`/stories/${video.story_id}`}>
                      <Button variant="ghost" size="sm">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Story
                      </Button>
                    </Link>
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
    </Layout>
  );
};

export default VideosPage;