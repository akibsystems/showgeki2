import useSWR, { mutate } from 'swr';
import { swrKeys, createMutatePattern } from '@/lib/swr-config';
import { apiClient } from '@/lib/api-client';
import type { Workspace, CreateWorkspaceRequest } from '@/types';

// ================================================================
// Types
// ================================================================

type WorkspaceUpdate = Partial<Omit<Workspace, 'id' | 'uid' | 'created_at'>>;

interface UseWorkspacesReturn {
  workspaces: Workspace[] | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
  createWorkspace: (data: CreateWorkspaceRequest) => Promise<Workspace>;
  updateWorkspace: (id: string, data: WorkspaceUpdate) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
}

interface UseWorkspaceReturn {
  workspace: Workspace | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
  updateWorkspace: (data: WorkspaceUpdate) => Promise<Workspace>;
  deleteWorkspace: () => Promise<void>;
}

interface UseUserWorkspaceReturn {
  workspace: Workspace | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
  ensureWorkspace: () => Promise<Workspace>;
}

// ================================================================
// Hooks
// ================================================================

/**
 * Hook to fetch all workspaces for the current user
 */
export function useWorkspaces(): UseWorkspacesReturn {
  const { data: workspaces, error, isLoading, mutate: swrMutate } = useSWR<Workspace[]>(
    swrKeys.workspaces(),
    {
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    }
  );

  // Create a new workspace
  const createWorkspace = async (data: CreateWorkspaceRequest): Promise<Workspace> => {
    try {
      const newWorkspace = await apiClient.post<Workspace>(swrKeys.workspaces(), data);
      
      // Invalidate all workspaces cache
      await mutate(createMutatePattern(swrKeys.workspaces()));
      
      return newWorkspace;
    } catch (error) {
      console.error('Failed to create workspace:', error);
      throw error;
    }
  };

  // Update an existing workspace
  const updateWorkspace = async (id: string, data: WorkspaceUpdate): Promise<Workspace> => {
    try {
      const updatedWorkspace = await apiClient.put<Workspace>(swrKeys.workspace(id), data);
      
      // Update cache optimistically
      await mutate(swrKeys.workspace(id), updatedWorkspace, false);
      await mutate(createMutatePattern(swrKeys.workspaces()));
      
      return updatedWorkspace;
    } catch (error) {
      console.error('Failed to update workspace:', error);
      throw error;
    }
  };

  // Delete a workspace
  const deleteWorkspace = async (id: string): Promise<void> => {
    try {
      await apiClient.delete(swrKeys.workspace(id));
      
      // Remove from cache
      await mutate(swrKeys.workspace(id), undefined, false);
      await mutate(createMutatePattern(swrKeys.workspaces()));
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      throw error;
    }
  };

  return {
    workspaces,
    isLoading,
    error,
    mutate: swrMutate,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
}

/**
 * Hook to fetch a single workspace by ID
 */
export function useWorkspace(id: string): UseWorkspaceReturn {
  const { data: workspace, error, isLoading, mutate: swrMutate } = useSWR<Workspace>(
    id ? swrKeys.workspace(id) : null,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    }
  );

  // Update the workspace
  const updateWorkspace = async (data: WorkspaceUpdate): Promise<Workspace> => {
    try {
      const updatedWorkspace = await apiClient.put<Workspace>(swrKeys.workspace(id), data);
      
      // Update cache optimistically
      await mutate(swrKeys.workspace(id), updatedWorkspace, false);
      await mutate(createMutatePattern(swrKeys.workspaces()));
      
      return updatedWorkspace;
    } catch (error) {
      console.error('Failed to update workspace:', error);
      throw error;
    }
  };

  // Delete the workspace
  const deleteWorkspace = async (): Promise<void> => {
    try {
      await apiClient.delete(swrKeys.workspace(id));
      
      // Remove from cache
      await mutate(swrKeys.workspace(id), undefined, false);
      await mutate(createMutatePattern(swrKeys.workspaces()));
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      throw error;
    }
  };

  return {
    workspace,
    isLoading,
    error,
    mutate: swrMutate,
    updateWorkspace,
    deleteWorkspace,
  };
}

/**
 * Hook to get or create the user's default workspace
 * For single workspace per user scenario
 */
export function useUserWorkspace(): UseUserWorkspaceReturn {
  const { data: workspaces, error, isLoading, mutate: swrMutate } = useSWR<Workspace[]>(
    swrKeys.workspaces(),
    {
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    }
  );

  // Get the first (default) workspace
  const workspace = workspaces?.[0];

  // Ensure user has a workspace (create if none exists)
  const ensureWorkspace = async (): Promise<Workspace> => {
    try {
      if (workspace) {
        return workspace;
      }

      // Create default workspace
      const newWorkspace = await apiClient.post<Workspace>(swrKeys.workspaces(), {
        name: 'My Workspace',
      });
      
      // Update cache
      await mutate(createMutatePattern(swrKeys.workspaces()));
      
      return newWorkspace;
    } catch (error) {
      console.error('Failed to ensure workspace:', error);
      throw error;
    }
  };

  return {
    workspace,
    isLoading,
    error,
    mutate: swrMutate,
    ensureWorkspace,
  };
}

// ================================================================
// Export
// ================================================================

export default useWorkspaces;