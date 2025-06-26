import { SWRConfiguration } from 'swr';
import { getOrCreateUid } from './uid';
import { createSampleScript, scriptTemplates } from './sample-script';

// ================================================================
// SWR Fetcher
// ================================================================

// Mock data for development when APIs are not available
const getMockData = (url: string) => {
  if (url.includes('/api/stories/story1')) {
    // Single story with complete script
    return {
      id: 'story1',
      workspace_id: 'ws1',
      uid: 'user123',
      title: 'Product Introduction Video',
      text_raw: 'Welcome to our revolutionary new product that will change the way you work. Our innovative solution combines cutting-edge technology with user-friendly design to deliver unprecedented results. Join thousands of satisfied customers who have already transformed their workflow with our powerful tools and seamless integration capabilities.',
      status: 'script_generated',
      script_json: createSampleScript('Product Introduction Video'),
      created_at: '2024-01-25T09:15:00Z',
      updated_at: '2024-01-25T10:30:00Z',
    };
  }

  if (url.includes('/api/stories/story2')) {
    // Single story in processing
    return {
      id: 'story2',
      workspace_id: 'ws1',
      uid: 'user123',
      title: 'Tutorial: Getting Started',
      text_raw: 'In this comprehensive tutorial, we will walk you through the basics of using our platform. From initial setup to advanced features, this guide covers everything you need to know to get started quickly and efficiently.',
      status: 'processing',
      script_json: scriptTemplates.tutorial.script,
      created_at: '2024-01-24T16:45:00Z',
      updated_at: '2024-01-24T17:00:00Z',
    };
  }

  if (url.includes('/api/stories/story3')) {
    // Single story as draft (no script yet)
    return {
      id: 'story3',
      workspace_id: 'ws1',
      uid: 'user123',
      title: 'Customer Testimonial',
      text_raw: 'Our customers love the innovative features and seamless experience our product provides. Here are some real stories from satisfied users who have seen amazing results.',
      status: 'draft',
      script_json: null,
      created_at: '2024-01-23T11:20:00Z',
      updated_at: '2024-01-23T14:15:00Z',
    };
  }

  if (url.includes('/api/stories')) {
    // Stories list
    return [
      {
        id: 'story1',
        workspace_id: 'ws1',
        uid: 'user123',
        title: 'Product Introduction Video',
        text_raw: 'Welcome to our revolutionary new product...',
        status: 'script_generated',
        script_json: createSampleScript('Product Introduction Video'),
        created_at: '2024-01-25T09:15:00Z',
        updated_at: '2024-01-25T10:30:00Z',
      },
      {
        id: 'story2',
        workspace_id: 'ws1',
        uid: 'user123',
        title: 'Tutorial: Getting Started',
        text_raw: 'In this comprehensive tutorial...',
        status: 'processing',
        script_json: scriptTemplates.tutorial.script,
        created_at: '2024-01-24T16:45:00Z',
        updated_at: '2024-01-24T17:00:00Z',
      },
      {
        id: 'story3',
        workspace_id: 'ws1',
        uid: 'user123',
        title: 'Customer Testimonial',
        text_raw: 'Our customers love the innovative features...',
        status: 'draft',
        script_json: null,
        created_at: '2024-01-23T11:20:00Z',
        updated_at: '2024-01-23T14:15:00Z',
      }
    ];
  }

  if (url.includes('/api/videos')) {
    return [
      {
        id: 'video1',
        story_id: 'story1',
        uid: 'user123',
        url: 'https://example.com/video1.mp4',
        duration_sec: 120,
        resolution: '1920x1080',
        size_mb: 45.2,
        status: 'completed',
        created_at: '2024-01-25T10:00:00Z',
      },
      {
        id: 'video2',
        story_id: 'story2',
        uid: 'user123',
        status: 'processing',
        created_at: '2024-01-24T17:00:00Z',
      }
    ];
  }

  if (url.includes('/api/workspaces')) {
    return [
      {
        id: 'ws1',
        uid: 'user123',
        name: 'My Workspace',
        created_at: '2024-01-15T10:00:00Z',
      }
    ];
  }

  return [];
};

const swrFetcher = async (url: string) => {
  try {
    // Get UID for API authentication
    const uid = await getOrCreateUid();
    
    // For development, use mock data if API is not available
    if (process.env.NODE_ENV === 'development') {
      try {
        // Try real API first
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-UID': uid,
          },
        });

        if (response.ok) {
          return response.json();
        }
        
        // If API fails, return mock data
        console.warn(`API ${url} failed, using mock data`);
        return getMockData(url);
      } catch (error) {
        // Network error, return mock data
        console.warn(`API ${url} network error, using mock data:`, error);
        return getMockData(url);
      }
    }

    // Production: always try real API
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

    return response.json();
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
    if (process.env.NODE_ENV === 'development') {
      console.log('SWR Success:', key, data);
    }
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
  storyScript: (id: string) => `/api/stories/${id}/script`,
  
  // Videos
  videos: () => '/api/videos',
  video: (id: string) => `/api/videos/${id}`,
  storyVideos: (storyId: string) => `/api/stories/${storyId}/videos`,
  
  // Reviews
  storyReviews: (storyId: string) => `/api/stories/${storyId}/reviews`,
  review: (id: string) => `/api/reviews/${id}`,
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