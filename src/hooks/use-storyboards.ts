import useSWR from 'swr';
import { swrKeys } from '@/lib/swr-config';
import { supabase } from '@/lib/supabase/client';
import type { Storyboard } from '@/types/workflow';

// ================================================================
// Types
// ================================================================

interface UseStoryboardsReturn {
  storyboards: (Storyboard & { 
    hasVideo?: boolean;
    workflow?: { id: string; status: string } | null;
  })[] | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
  copyStoryboard: (id: string) => Promise<{ storyboard: any; workflow: any }>;
}

// ================================================================
// Hooks
// ================================================================

/**
 * Hook to fetch all storyboards with workflow and video status
 */
export function useStoryboards(): UseStoryboardsReturn {
  const { data: response, error, isLoading, mutate } = useSWR<any>(
    '/api/storyboards',
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );
  
  // APIレスポンスからstoryboardsを取得
  const storyboards = response?.data?.storyboards || response;

  // ストーリーボードをコピー
  const copyStoryboard = async (id: string): Promise<{ storyboard: any; workflow: any }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(`/api/storyboards/${id}/copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-UID': user.id,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to copy storyboard');
    }

    const result = await response.json();
    
    // キャッシュを更新
    await mutate();
    
    return result.data;
  };

  return {
    storyboards,
    isLoading,
    error,
    mutate,
    copyStoryboard,
  };
}

// Add key to swrKeys
export const storyboardsKey = () => '/api/storyboards';

// ================================================================
// Export
// ================================================================

export default useStoryboards;