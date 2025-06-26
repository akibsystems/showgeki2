import useSWR, { mutate } from 'swr';
import { swrKeys, createCacheKey, createMutatePattern } from '@/lib/swr-config';
import { apiClient } from '@/lib/api-client';
import type { Video } from '@/types';

// ================================================================
// Types
// ================================================================

type VideoInsert = Omit<Video, 'id' | 'created_at'>;
type VideoUpdate = Partial<Omit<Video, 'id' | 'created_at'>>;

interface VideosQueryParams {
  storyId?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
  search?: string;
}

interface UseVideosReturn {
  videos: Video[] | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
  createVideo: (data: VideoInsert) => Promise<Video>;
  updateVideo: (id: string, data: VideoUpdate) => Promise<Video>;
  deleteVideo: (id: string) => Promise<void>;
  retryVideo: (id: string) => Promise<Video>;
}

interface UseVideoReturn {
  video: Video | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
  updateVideo: (data: VideoUpdate) => Promise<Video>;
  deleteVideo: () => Promise<void>;
  retryVideo: () => Promise<Video>;
}

interface UseStoryVideosReturn {
  videos: Video[] | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
  createVideo: () => Promise<Video>;
}

// ================================================================
// Hooks
// ================================================================

/**
 * Hook to fetch all videos with optional filtering
 */
export function useVideos(params?: VideosQueryParams): UseVideosReturn {
  // Convert storyId to story_id for API compatibility
  const apiParams = params ? {
    ...params,
    ...(params.storyId && { story_id: params.storyId }),
    storyId: undefined, // Remove storyId as it's not a valid API parameter
  } : undefined;
  
  const cacheKey = createCacheKey(swrKeys.videos(), apiParams);
  
  const { data: videos, error, isLoading, mutate: swrMutate } = useSWR<Video[]>(
    cacheKey,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      refreshInterval: 10000, // Refresh every 10 seconds for processing videos
      refreshWhenHidden: false,
    }
  );

  // Create a new video
  const createVideo = async (data: VideoInsert): Promise<Video> => {
    try {
      const newVideo = await apiClient.post<Video>(swrKeys.videos(), data);
      
      // Invalidate all videos cache
      await mutate(createMutatePattern(swrKeys.videos()));
      
      return newVideo;
    } catch (error) {
      console.error('Failed to create video:', error);
      throw error;
    }
  };

  // Update an existing video
  const updateVideo = async (id: string, data: VideoUpdate): Promise<Video> => {
    try {
      const updatedVideo = await apiClient.put<Video>(swrKeys.video(id), data);
      
      // Update cache optimistically
      await mutate(swrKeys.video(id), updatedVideo, false);
      await mutate(createMutatePattern(swrKeys.videos()));
      
      return updatedVideo;
    } catch (error) {
      console.error('Failed to update video:', error);
      throw error;
    }
  };

  // Delete a video
  const deleteVideo = async (id: string): Promise<void> => {
    try {
      await apiClient.delete(swrKeys.video(id));
      
      // Remove from cache
      await mutate(swrKeys.video(id), undefined, false);
      await mutate(createMutatePattern(swrKeys.videos()));
    } catch (error) {
      console.error('Failed to delete video:', error);
      throw error;
    }
  };

  // Retry video generation
  const retryVideo = async (id: string): Promise<Video> => {
    try {
      const updatedVideo = await apiClient.post<Video>(`${swrKeys.video(id)}/retry`, {});
      
      // Update cache
      await mutate(swrKeys.video(id), updatedVideo, false);
      await mutate(createMutatePattern(swrKeys.videos()));
      
      return updatedVideo;
    } catch (error) {
      console.error('Failed to retry video:', error);
      throw error;
    }
  };

  return {
    videos,
    isLoading,
    error,
    mutate: swrMutate,
    createVideo,
    updateVideo,
    deleteVideo,
    retryVideo,
  };
}

/**
 * Hook to fetch a single video by ID
 */
export function useVideo(id: string): UseVideoReturn {
  const { data: video, error, isLoading, mutate: swrMutate } = useSWR<Video>(
    id ? swrKeys.video(id) : null,
    {
      revalidateOnFocus: true,
      refreshInterval: 5000, // Refresh every 5 seconds for processing videos
      refreshWhenHidden: false,
    }
  );

  // Update the video
  const updateVideo = async (data: VideoUpdate): Promise<Video> => {
    try {
      const updatedVideo = await apiClient.put<Video>(swrKeys.video(id), data);
      
      // Update cache optimistically
      await mutate(swrKeys.video(id), updatedVideo, false);
      await mutate(createMutatePattern(swrKeys.videos()));
      
      return updatedVideo;
    } catch (error) {
      console.error('Failed to update video:', error);
      throw error;
    }
  };

  // Delete the video
  const deleteVideo = async (): Promise<void> => {
    try {
      await apiClient.delete(swrKeys.video(id));
      
      // Remove from cache
      await mutate(swrKeys.video(id), undefined, false);
      await mutate(createMutatePattern(swrKeys.videos()));
    } catch (error) {
      console.error('Failed to delete video:', error);
      throw error;
    }
  };

  // Retry video generation
  const retryVideo = async (): Promise<Video> => {
    try {
      const updatedVideo = await apiClient.post<Video>(`${swrKeys.video(id)}/retry`, {});
      
      // Update cache
      await mutate(swrKeys.video(id), updatedVideo, false);
      await mutate(createMutatePattern(swrKeys.videos()));
      
      return updatedVideo;
    } catch (error) {
      console.error('Failed to retry video:', error);
      throw error;
    }
  };

  return {
    video,
    isLoading,
    error,
    mutate: swrMutate,
    updateVideo,
    deleteVideo,
    retryVideo,
  };
}

/**
 * Hook to fetch videos for a specific story
 */
export function useStoryVideos(storyId: string): UseStoryVideosReturn {
  const { data: videos, error, isLoading, mutate: swrMutate } = useSWR<Video[]>(
    storyId ? swrKeys.storyVideos(storyId) : null,
    {
      revalidateOnFocus: true,
      refreshInterval: 10000, // Refresh every 10 seconds for processing videos
      refreshWhenHidden: false,
    }
  );

  // Create a video for the story
  const createVideo = async (): Promise<Video> => {
    try {
      const newVideo = await apiClient.post<Video>(swrKeys.storyVideos(storyId), {});
      
      // Invalidate related caches
      await mutate(swrKeys.storyVideos(storyId));
      await mutate(createMutatePattern(swrKeys.videos()));
      
      return newVideo;
    } catch (error) {
      console.error('Failed to create video for story:', error);
      throw error;
    }
  };

  return {
    videos,
    isLoading,
    error,
    mutate: swrMutate,
    createVideo,
  };
}

// ================================================================
// Export
// ================================================================

export default useVideos;