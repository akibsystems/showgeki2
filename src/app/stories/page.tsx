'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Spinner } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApp, useToast } from '@/contexts';
import { useStories, useUserWorkspace } from '@/hooks';
import type { StoryStatus } from '@/types';

// ================================================================
// Types
// ================================================================

type StatusFilter = 'all' | StoryStatus;

// ================================================================
// Stories List Page Component
// ================================================================

const StoriesContent: React.FC = () => {
  const router = useRouter();
  const { state } = useApp();
  const { error } = useToast();
  const { ensureWorkspace } = useUserWorkspace();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [copyingStoryId, setCopyingStoryId] = useState<string | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);

  // Fetch stories using SWR hook
  const { stories, isLoading, copyStory } = useStories();

  // Separate workflow drafts and regular stories
  const workflowDrafts = (stories || []).filter(story => 
    story.status === 'draft' && story.workflow_state
  );
  
  const regularStories = (stories || []).filter(story => 
    !(story.status === 'draft' && story.workflow_state)
  );
  
  // Filter and search stories
  const filteredStories = regularStories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         story.text_raw.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || story.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400 bg-emerald-900/30 border-emerald-500/50';
      case 'processing':
        return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
      case 'script_generated':
        return 'text-purple-400 bg-purple-900/30 border-purple-500/50';
      case 'error':
        return 'text-red-400 bg-red-900/30 border-red-500/50';
      default:
        return 'text-gray-400 bg-gray-800/30 border-gray-600/50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'processing':
        return '処理中';
      case 'script_generated':
        return '脚本生成済み';
      case 'error':
        return 'エラー';
      case 'draft':
        return '下書き';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  const getStatusCounts = () => {
    const storyList = stories || [];
    return {
      all: storyList.length,
      draft: storyList.filter(s => s.status === 'draft').length,
      script_generated: storyList.filter(s => s.status === 'script_generated').length,
      processing: storyList.filter(s => s.status === 'processing').length,
      completed: storyList.filter(s => s.status === 'completed').length,
      error: storyList.filter(s => s.status === 'error').length,
    };
  };

  const statusCounts = getStatusCounts();

  // Create draft story and redirect to workflow
  const handleCreateStory = async () => {
    if (isCreatingStory) return;
    
    setIsCreatingStory(true);
    try {
      // Ensure workspace exists
      const workspaceData = await ensureWorkspace();
      
      // Create draft story
      const uid = await import('@/lib/uid').then(m => m.getOrCreateUid());
      const response = await fetch('/api/stories/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': uid,
        },
        body: JSON.stringify({
          workspace_id: workspaceData.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create draft story');
      }
      
      const result = await response.json();
      console.log('Draft story created:', result);
      
      if (!result.story || !result.story.id) {
        throw new Error('Invalid draft story response');
      }
      
      // Redirect to workflow
      router.push(`/stories/${result.story.id}/new?step=1`);
    } catch (err) {
      console.error('Failed to create story:', err);
      error('脚本の作成に失敗しました');
    } finally {
      setIsCreatingStory(false);
    }
  };

  const handleCopyStory = async (e: React.MouseEvent, storyId: string) => {
    e.preventDefault(); // Prevent navigation to story detail
    e.stopPropagation(); // Stop event bubbling
    
    setCopyingStoryId(storyId);
    try {
      const newStory = await copyStory(storyId);
      router.push(`/stories/${newStory.id}?tab=content`);
    } catch (err) {
      console.error('Failed to copy story:', err);
      error('脚本のコピーに失敗しました');
    } finally {
      setCopyingStoryId(null);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-400">脚本を読み込み中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">脚本一覧</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-400">
                AIで脚本を生成し、動画を作成できます
              </p>
            </div>
            <Button 
              className="w-full sm:w-auto text-sm sm:text-base"
              onClick={handleCreateStory}
              disabled={isCreatingStory}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {isCreatingStory ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  作成中...
                </>
              ) : (
                '脚本を作成'
              )}
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {[
                { key: 'all', label: 'すべて', count: statusCounts.all },
                { key: 'draft', label: '下書き', count: statusCounts.draft },
                { key: 'script_generated', label: '脚本生成済み', count: statusCounts.script_generated },
                { key: 'processing', label: '処理中', count: statusCounts.processing },
                { key: 'completed', label: '完了', count: statusCounts.completed },
                { key: 'error', label: 'エラー', count: statusCounts.error },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key as StatusFilter)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-colors ${
                    statusFilter === filter.key
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                      : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-purple-500/10 hover:text-purple-300'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="脚本を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full sm:w-64 bg-gray-800/50 border border-purple-500/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-100 placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Workflow Drafts Section */}
        {workflowDrafts.length > 0 && statusFilter === 'all' && !searchQuery && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-purple-400">●</span>
              作成中のワークフロー
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {workflowDrafts.map((story) => (
                <Card key={story.id} className="h-full hover:shadow-lg transition-all duration-200 group border-purple-500/30">
                  <CardContent className="p-4 sm:p-6">
                    <Link href={`/stories/${story.id}/new?step=${story.workflow_state?.current_step || 1}`} className="block">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <h3 className="text-base sm:text-lg font-medium text-gray-100 group-hover:text-purple-400 transition-colors line-clamp-2 mr-2">
                          {story.title}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border text-purple-400 bg-purple-900/30 border-purple-500/50">
                          ステップ {story.workflow_state?.current_step || 1}/5
                        </span>
                      </div>
                      
                      <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                        {story.workflow_state?.current_step === 1 && 'ストーリー入力中'}
                        {story.workflow_state?.current_step === 2 && 'シーン構成を編集中'}
                        {story.workflow_state?.current_step === 3 && 'キャラクター設定中'}
                        {story.workflow_state?.current_step === 4 && '台詞と画像を編集中'}
                        {story.workflow_state?.current_step === 5 && '音声・BGM設定中'}
                      </p>
                    </Link>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        最終更新: {formatDate(story.updated_at)}
                      </div>
                      
                      <Link 
                        href={`/stories/${story.id}/new?step=${story.workflow_state?.current_step || 1}`} 
                        className="px-3 py-1.5 rounded-md text-xs bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                      >
                        続きから作成
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {regularStories.length > 0 && (
              <div className="mt-8 mb-4 border-t border-gray-700 pt-8">
                <h3 className="text-lg font-medium text-gray-100 mb-4">すべての脚本</h3>
              </div>
            )}
          </div>
        )}

        {/* Stories Grid */}
        {filteredStories.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-100 mb-2">
              {searchQuery || statusFilter !== 'all' ? '脚本が見つかりません' : 'まだ脚本がありません'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? '検索条件やフィルターを変更してみてください'
                : '最初の脚本を作成しましょう'
              }
            </p>
            {(!searchQuery && statusFilter === 'all') && (
              <Button 
                onClick={handleCreateStory}
                disabled={isCreatingStory}
              >
                {isCreatingStory ? (
                  <>
                    <Spinner size="sm" color="white" className="mr-2" />
                    作成中...
                  </>
                ) : (
                  '最初の脚本を作成'
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredStories.map((story) => (
              <Card key={story.id} className="h-full hover:shadow-lg transition-all duration-200 group">
                <CardContent className="p-4 sm:p-6">
                  <Link href={story.status === 'draft' && story.workflow_state ? `/stories/${story.id}/new?step=${story.workflow_state.current_step || 1}` : `/stories/${story.id}`} className="block">
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <h3 className="text-base sm:text-lg font-medium text-gray-100 group-hover:text-purple-400 transition-colors line-clamp-2 mr-2">
                        {story.title}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(story.status)} flex-shrink-0`}>
                        {story.status === 'draft' && story.workflow_state ? '作成中' : getStatusText(story.status)}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-3">
                      {story.text_raw || (story.status === 'draft' && story.workflow_state ? 'ワークフローで作成中...' : '')}
                    </p>
                  </Link>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-500">
                      <span>{(story.text_raw || '').length} 文字</span>
                      <span className="hidden sm:inline">更新: {formatDate(story.updated_at)}</span>
                      <span className="sm:hidden">{formatDate(story.updated_at).split(' ')[0]}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {story.status === 'completed' && (
                        <button
                          onClick={(e) => handleCopyStory(e, story.id)}
                          disabled={copyingStoryId === story.id}
                          className="p-1.5 rounded-md text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="動画生成済みの脚本をコピー"
                        >
                          {copyingStoryId === story.id ? (
                            <Spinner size="sm" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                      
                      {story.status === 'draft' && story.workflow_state ? (
                        <Link 
                          href={`/stories/${story.id}/new?step=${story.workflow_state.current_step || 1}`} 
                          className="px-2 py-1 rounded-md text-xs bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                        >
                          続きから
                        </Link>
                      ) : (
                        <Link href={`/stories/${story.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                      
                      {story.status === 'processing' && (
                        <Spinner size="sm" className="text-purple-400 ml-1" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

const StoriesPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <StoriesContent />
    </ProtectedRoute>
  );
};

export default StoriesPage;