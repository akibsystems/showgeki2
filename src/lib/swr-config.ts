import { SWRConfiguration } from 'swr';
import { supabase } from '@/lib/supabase/client';

// ================================================================
// SWR Fetcher
// ================================================================

const swrFetcher = async (url: string) => {
  try {
    // Get current user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    const uid = user.id;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-UID': uid,
      },
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    const result = await response.json();

    // Extract data from API response format { success: true, data: ... }
    if (result.success && result.data !== undefined) {
      const data = result.data;

      // For list endpoints, extract the array from the data object
      if (url.match(/^\/api\/videos(\?.*)?$/) && data.videos) {
        return data.videos;
      }
      if (url.match(/^\/api\/admin\/videos(\?.*)?$/) && (data.videos || data.pagination)) {
        // Admin videos endpoint returns both videos and pagination
        return data;
      }
      if (url.match(/^\/api\/stories(\?.*)?$/) && data.stories) {
        // This is a GET /api/stories (list endpoint)
        return data.stories;
      }
      if (url.match(/^\/api\/workspaces(\?.*)?$/) && data.workspaces) {
        return data.workspaces;
      }
      if (url.match(/^\/api\/storyboards(\?.*)?$/) && data.storyboards) {
        return data.storyboards;
      }

      // For single item endpoints, return the data directly
      return data;
    }

    return result;
  } catch (error) {
    console.error('SWR fetch error:', error);
    throw error;
  }
};

// ================================================================
// SWR Configuration
// ================================================================

export const swrConfig: SWRConfiguration = {
  // Default fetcher using native fetch
  fetcher: swrFetcher,

  // Revalidation settings
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,

  // Cache settings
  dedupingInterval: 2000, // 2 seconds

  // Retry settings
  errorRetryCount: 3,
  errorRetryInterval: 5000, // 5 seconds

  // Refresh intervals
  refreshInterval: 0, // Disable automatic refresh by default

  // Focus revalidation
  focusThrottleInterval: 5000, // 5 seconds

  // Error handling
  onError: (error) => {
    console.error('SWR Error:', error);
    // Could send to error tracking service here
  },

  // Success handling
  onSuccess: (data, key, config) => {
    // Could log successful API calls for debugging
    // Commented out to reduce console noise
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('SWR Success:', key, data);
    // }
  },
};

// ================================================================
// SWR Key Generators
// ================================================================

export const swrKeys = {
  // Workspaces
  workspaces: () => '/api/workspaces',
  workspace: (id: string) => `/api/workspaces/${id}`,

  // Stories
  stories: () => '/api/stories',
  story: (id: string) => `/api/stories/${id}`,
  storyScript: (id: string) => `/api/stories/${id}/generate-script`,

  // Videos
  videos: () => '/api/videos',
  video: (id: string) => `/api/videos/${id}`,
  storyVideos: (storyId: string) => `/api/stories/${storyId}/videos`,

  // Reviews
  storyReviews: (storyId: string) => `/api/stories/${storyId}/reviews`,
  review: (id: string) => `/api/reviews/${id}`,
  
  // Storyboards
  storyboards: () => '/api/storyboards',
} as const;

// ================================================================
// Utility Functions
// ================================================================

/**
 * Generate cache key with query parameters
 */
export function createCacheKey(baseKey: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return baseKey;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${baseKey}?${queryString}` : baseKey;
}

/**
 * Create mutate key pattern for related data invalidation
 */
export function createMutatePattern(basePattern: string): RegExp {
  // Convert API path pattern to RegExp for cache invalidation
  // e.g., "/api/stories" matches "/api/stories", "/api/stories?page=1", etc.
  const escapedPattern = basePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escapedPattern}(\\?.*)?$`);
}

// ================================================================
// Export
// ================================================================

export default swrConfig;