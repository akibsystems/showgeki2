import useSWR, { mutate } from 'swr';
import { swrKeys, createCacheKey, createMutatePattern } from '@/lib/swr-config';
import { apiClient } from '@/lib/api-client';
import type { Story, CreateStoryRequest, UpdateStoryRequest } from '@/types';

// ================================================================
// Types
// ================================================================

interface StoriesQueryParams {
  status?: 'draft' | 'script_generated' | 'processing' | 'completed' | 'error';
  limit?: number;
  offset?: number;
  search?: string;
}

interface UseStoriesReturn {
  stories: Story[] | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
  createStory: (data: CreateStoryRequest) => Promise<Story>;
  updateStory: (id: string, data: UpdateStoryRequest) => Promise<Story>;
  deleteStory: (id: string) => Promise<void>;
  generateScript: (id: string, options?: { beats?: number }) => Promise<Story>;
  copyStory: (id: string) => Promise<Story>;
}

interface UseStoryReturn {
  story: Story | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
  updateStory: (data: UpdateStoryRequest) => Promise<Story>;
  deleteStory: () => Promise<void>;
  generateScript: (options?: { beats?: number }) => Promise<Story>;
}

// ================================================================
// Hooks
// ================================================================

/**
 * Hook to fetch all stories with optional filtering
 */
export function useStories(params?: StoriesQueryParams): UseStoriesReturn {
  const cacheKey = createCacheKey(swrKeys.stories(), params);
  
  const { data: stories, error, isLoading, mutate: swrMutate } = useSWR<Story[]>(
    cacheKey,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  // Create a new story
  const createStory = async (data: CreateStoryRequest): Promise<Story> => {
    try {
      const newStory = await apiClient.post<Story>(swrKeys.stories(), data);
      
      // Invalidate all stories cache
      await mutate(createMutatePattern(swrKeys.stories()));
      
      return newStory;
    } catch (error) {
      console.error('Failed to create story:', error);
      throw error;
    }
  };

  // Update an existing story
  const updateStory = async (id: string, data: UpdateStoryRequest): Promise<Story> => {
    try {
      const updatedStory = await apiClient.put<Story>(swrKeys.story(id), data);
      
      // Update cache optimistically
      await mutate(swrKeys.story(id), updatedStory, false);
      await mutate(createMutatePattern(swrKeys.stories()));
      
      return updatedStory;
    } catch (error) {
      console.error('Failed to update story:', error);
      throw error;
    }
  };

  // Delete a story
  const deleteStory = async (id: string): Promise<void> => {
    try {
      await apiClient.delete(swrKeys.story(id));
      
      // Remove from cache
      await mutate(swrKeys.story(id), undefined, false);
      await mutate(createMutatePattern(swrKeys.stories()));
    } catch (error) {
      console.error('Failed to delete story:', error);
      throw error;
    }
  };

  // Generate script for a story
  const generateScript = async (id: string, options?: { beats?: number }): Promise<Story> => {
    try {
      const response = await apiClient.generateScript(id, options);
      const updatedStory = response.story;
      
      // Update cache
      await mutate(swrKeys.story(id), updatedStory, false);
      await mutate(createMutatePattern(swrKeys.stories()));
      
      return updatedStory;
    } catch (error) {
      console.error('Failed to generate script:', error);
      throw error;
    }
  };

  // Copy a story
  const copyStory = async (id: string): Promise<Story> => {
    try {
      const response = await apiClient.post<{ story: Story }>(`/api/stories/${id}/copy`, {});
      const newStory = response.story;
      
      // Invalidate all stories cache to include the new copy
      await mutate(createMutatePattern(swrKeys.stories()));
      
      return newStory;
    } catch (error) {
      console.error('Failed to copy story:', error);
      throw error;
    }
  };


  return {
    stories,
    isLoading,
    error,
    mutate: swrMutate,
    createStory,
    updateStory,
    deleteStory,
    generateScript,
    copyStory,
  };
}

/**
 * Hook to fetch a single story by ID
 */
export function useStory(id: string): UseStoryReturn {
  // Don't make API call if id is undefined/invalid
  const shouldFetch = id && id !== 'undefined';
  const { data: story, error, isLoading, mutate: swrMutate } = useSWR<Story>(
    shouldFetch ? swrKeys.story(id) : null,
    {
      revalidateOnFocus: true,
      refreshInterval: 5000, // Refresh every 5 seconds for processing stories
      refreshWhenHidden: false,
    }
  );

  // Update the story
  const updateStory = async (data: UpdateStoryRequest): Promise<Story> => {
    try {
      const updatedStory = await apiClient.put<Story>(swrKeys.story(id), data);
      
      // Update cache optimistically
      await mutate(swrKeys.story(id), updatedStory, false);
      await mutate(createMutatePattern(swrKeys.stories()));
      
      return updatedStory;
    } catch (error) {
      console.error('Failed to update story:', error);
      throw error;
    }
  };

  // Delete the story
  const deleteStory = async (): Promise<void> => {
    try {
      await apiClient.delete(swrKeys.story(id));
      
      // Remove from cache
      await mutate(swrKeys.story(id), undefined, false);
      await mutate(createMutatePattern(swrKeys.stories()));
    } catch (error) {
      console.error('Failed to delete story:', error);
      throw error;
    }
  };

  // Generate script for the story
  const generateScript = async (options?: { beats?: number }): Promise<Story> => {
    try {
      const response = await apiClient.generateScript(id, options);
      const updatedStory = response.story;
      
      // Update cache
      await mutate(swrKeys.story(id), updatedStory, false);
      await mutate(createMutatePattern(swrKeys.stories()));
      
      return updatedStory;
    } catch (error) {
      console.error('Failed to generate script:', error);
      throw error;
    }
  };

  return {
    story,
    isLoading,
    error,
    mutate: swrMutate,
    updateStory,
    deleteStory,
    generateScript,
  };
}

// ================================================================
// Export
// ================================================================

export default useStories;