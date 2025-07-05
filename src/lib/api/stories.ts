import { Story, UpdateStoryRequest, CreateStoryRequest } from '@/types';
import { createAdminClient } from '@/lib/supabase';

/**
 * ストーリーを取得
 */
export async function getStory(storyId: string, uid: string): Promise<Story> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .eq('uid', uid)
    .single();

  if (error) {
    throw new Error(`Failed to fetch story: ${error.message}`);
  }

  if (!data) {
    throw new Error('Story not found');
  }

  return data as Story;
}

/**
 * ストーリー一覧を取得
 */
export async function getStories(workspaceId: string, uid: string): Promise<Story[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('uid', uid)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch stories: ${error.message}`);
  }

  return (data || []) as Story[];
}

/**
 * ストーリーを作成
 */
export async function createStory(
  uid: string,
  request: CreateStoryRequest
): Promise<Story> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('stories')
    .insert({
      uid,
      workspace_id: request.workspace_id,
      title: request.title || '無題のストーリー',
      text_raw: request.text_raw,
      beats: request.beats || 5,
      status: 'draft',
      workflow_state: {
        current_step: 1,
        completed_steps: [],
        metadata: {},
      },
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create story: ${error.message}`);
  }

  return data as Story;
}

/**
 * ストーリーを更新
 */
export async function updateStory(
  storyId: string,
  uid: string,
  updates: Partial<UpdateStoryRequest>
): Promise<Story> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('stories')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storyId)
    .eq('uid', uid)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update story: ${error.message}`);
  }

  return data as Story;
}

/**
 * ストーリーを削除
 */
export async function deleteStory(storyId: string, uid: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', storyId)
    .eq('uid', uid);

  if (error) {
    throw new Error(`Failed to delete story: ${error.message}`);
  }
}

/**
 * ワークフロー状態を更新
 */
export async function updateWorkflowState(
  storyId: string,
  uid: string,
  workflowState: Partial<Story['workflow_state']>
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('stories')
    .update({
      workflow_state: workflowState,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storyId)
    .eq('uid', uid);

  if (error) {
    throw new Error(`Failed to update workflow state: ${error.message}`);
  }
}

/**
 * ストーリー要素を更新
 */
export async function updateStoryElements(
  storyId: string,
  uid: string,
  storyElements: Partial<Story['story_elements']>
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('stories')
    .update({
      story_elements: storyElements,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storyId)
    .eq('uid', uid);

  if (error) {
    throw new Error(`Failed to update story elements: ${error.message}`);
  }
}

/**
 * カスタムアセットを更新
 */
export async function updateCustomAssets(
  storyId: string,
  uid: string,
  customAssets: Partial<Story['custom_assets']>
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('stories')
    .update({
      custom_assets: customAssets,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storyId)
    .eq('uid', uid);

  if (error) {
    throw new Error(`Failed to update custom assets: ${error.message}`);
  }
}