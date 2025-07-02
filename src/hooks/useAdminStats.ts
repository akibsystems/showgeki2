import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';

// ================================================================
// Types
// ================================================================

export interface StatsOverview {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  total_stories: number;
  stories_24h: number;
  stories_7d: number;
  total_videos: number;
  completed_videos: number;
  processing_videos: number;
  failed_videos: number;
  total_storage_mb: number;
}

export interface DailyStats {
  date: string;
  stories_created: number;
  videos_created: number;
  unique_users: number;
}

export interface AdminStatsData {
  overview: StatsOverview;
  daily: DailyStats[];
}

interface UseAdminStatsReturn {
  data: AdminStatsData | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
}

// ================================================================
// Hook
// ================================================================

/**
 * Hook to fetch admin statistics
 */
export function useAdminStats(): UseAdminStatsReturn {
  const { data, error, isLoading, mutate } = useSWR<AdminStatsData>(
    '/api/admin/stats',
    {
      revalidateOnFocus: true,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  return {
    data,
    isLoading,
    error,
    mutate,
  };
}