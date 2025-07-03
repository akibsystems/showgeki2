import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts';

// ================================================================
// Types
// ================================================================

export interface VideoWithRelations {
  id: string;
  story_id: string;
  uid: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  url?: string;
  duration_sec?: number;
  resolution?: string;
  size_mb?: number;
  error_msg?: string;
  created_at: string;
  story?: {
    id: string;
    title: string;
    uid: string;
    created_at: string;
  };
  profile?: {
    email?: string;
    display_name?: string;
  };
}

export interface VideoFilters {
  page: number;
  limit: number;
  status?: 'queued' | 'processing' | 'completed' | 'error';
  from?: string;
  to?: string;
  uid?: string;
  search?: string;
}

export interface VideoPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminVideosData {
  videos: VideoWithRelations[];
  pagination: VideoPagination;
}

interface UseAdminVideosReturn {
  data: AdminVideosData | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
  filters: VideoFilters;
  setFilters: (filters: VideoFilters) => void;
  deleteVideos: (videoIds: string[]) => Promise<boolean>;
  isDeleting: boolean;
}

// ================================================================
// Hook
// ================================================================

/**
 * Hook to manage admin videos with filtering and pagination
 */
export function useAdminVideos(): UseAdminVideosReturn {
  const { success, error: showError } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState<VideoFilters>({
    page: 1,
    limit: 50,
  });

  // Build query string from filters
  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)])
  ).toString();

  // Fetch videos with SWR
  const { data, error, isLoading, mutate } = useSWR<AdminVideosData>(
    `/api/admin/videos?${queryString}`,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // Delete videos
  const deleteVideos = useCallback(async (videoIds: string[]): Promise<boolean> => {
    setIsDeleting(true);
    
    try {
      // Make custom DELETE request with body
      const response = await fetch('/api/admin/videos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete videos: ${response.statusText}`);
      }
      
      success(`${videoIds.length}件の動画を削除しました`);
      
      // Refresh the list
      await mutate();
      
      return true;
    } catch (error: any) {
      console.error('Failed to delete videos:', error);
      
      // Show more specific error message
      if (error.response?.status === 403) {
        showError('動画を削除する権限がありません');
      } else if (error.response?.status === 404) {
        showError('削除対象の動画が見つかりませんでした');
      } else if (error.response?.data?.message) {
        showError(`削除エラー: ${error.response.data.message}`);
      } else {
        showError('動画の削除に失敗しました。しばらくしてから再試行してください。');
      }
      
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [mutate, success, showError]);

  return {
    data,
    isLoading,
    error,
    mutate,
    filters,
    setFilters,
    deleteVideos,
    isDeleting,
  };
}