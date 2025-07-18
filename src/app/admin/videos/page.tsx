'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminVideos } from '@/hooks/useAdminVideos';
import { VideoFilters } from '@/components/admin/VideoFilters';
import { VideoTable } from '@/components/admin/VideoTable';
import { VideoGrid } from '@/components/admin/VideoGrid';
import { ConsistencyCheckModal } from '@/components/admin/ConsistencyCheckModal';
import { Button } from '@/components/ui';
import { APIErrorMessage } from '@/components/ui/error-message';
import { VideoWithRelations } from '@/hooks/useAdminVideos';

type ViewMode = 'list' | 'grid';

// ================================================================
// Admin Videos Page
// ================================================================

export default function AdminVideosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { 
    data, 
    isLoading,
    error,
    mutate, 
    filters, 
    setFilters, 
    deleteVideos, 
    isDeleting 
  } = useAdminVideos();
  
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConsistencyCheck, setShowConsistencyCheck] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Load view mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('adminVideoViewMode') as ViewMode;
    if (savedMode === 'list' || savedMode === 'grid') {
      setViewMode(savedMode);
    }
  }, []);

  // Save view mode to localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('adminVideoViewMode', mode);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedVideos.length === 0) return;
    
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const success = await deleteVideos(selectedVideos);
    if (success) {
      setSelectedVideos([]);
    }
    setShowDeleteConfirm(false);
  };

  // Update URL when filters change (but avoid initial update)
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      return;
    }
    
    const params = new URLSearchParams();
    
    if (filters.page && filters.page !== 1) {
      params.set('page', filters.page.toString());
    }
    if (filters.limit && filters.limit !== 50) {
      params.set('limit', filters.limit.toString());
    }
    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.from) {
      params.set('from', filters.from);
    }
    if (filters.to) {
      params.set('to', filters.to);
    }
    if (filters.uid) {
      params.set('uid', filters.uid);
    }
    if (filters.search) {
      params.set('search', filters.search);
    }
    
    const query = params.toString();
    const newUrl = query ? `/admin/videos?${query}` : '/admin/videos';
    
    router.replace(newUrl);
  }, [filters, router, isInitialized]);
  
  // Initialize filters from URL on mount (only once)
  useEffect(() => {
    const urlFilters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      status: searchParams.get('status') as any || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      uid: searchParams.get('uid') || undefined,
      search: searchParams.get('search') || undefined,
    };
    
    // Filter out undefined values and ensure required fields
    const cleanFilters = Object.fromEntries(
      Object.entries(urlFilters).filter(([_, value]) => value !== undefined)
    );
    
    // Always set from URL if available
    if (searchParams.toString()) {
      setFilters({
        page: urlFilters.page,
        limit: urlFilters.limit,
        ...cleanFilters
      });
    }
  }, []); // Only run once on mount

  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const totalPages = data?.pagination.totalPages || 0;
  const currentPage = data?.pagination.page || 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100">動画管理</h1>
        <p className="mt-2 text-gray-400">すべてのユーザーが生成した動画を管理</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Sidebar with filters - hidden on mobile, collapsible on tablet */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <VideoFilters
            filters={filters}
            onFiltersChange={setFilters}
            disabled={isLoading || isDeleting}
          />
        </div>

        {/* Main content - full width on mobile */}
        <div className="lg:col-span-3 space-y-4 order-1 lg:order-2">
          {/* Error Message */}
          {error && !isLoading && (
            <APIErrorMessage 
              error={error} 
              onRetry={() => mutate()} 
            />
          )}

          {/* Actions bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-400">
                {selectedVideos.length > 0 ? (
                  <span className="text-purple-400 font-medium">
                    {selectedVideos.length}件選択中
                  </span>
                ) : (
                  <span>
                    全{data?.pagination.total || 0}件中 {((currentPage - 1) * filters.limit) + 1}-
                    {Math.min(currentPage * filters.limit, data?.pagination.total || 0)}件を表示
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center bg-gray-800 rounded-md p-1">
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  title="リスト表示"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  title="グリッド表示"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>

              {selectedVideos.length > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-700" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedVideos([])}
                  >
                    選択解除
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // Filter only completed videos for consistency check
                      const completedVideos = (data?.videos || [])
                        .filter(v => selectedVideos.includes(v.id) && v.status === 'completed');
                      
                      if (completedVideos.length === 0) {
                        alert('完了した動画を選択してください');
                        return;
                      }
                      
                      setShowConsistencyCheck(true);
                    }}
                  >
                    一貫性チェック
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleBulkDelete}
                    loading={isDeleting}
                    disabled={isDeleting}
                  >
                    選択した動画を削除
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Video display */}
          {viewMode === 'list' ? (
            <VideoTable
              videos={data?.videos || []}
              selectedVideos={selectedVideos}
              onSelectionChange={setSelectedVideos}
              loading={isLoading}
            />
          ) : (
            <VideoGrid
              videos={data?.videos || []}
              selectedVideos={selectedVideos}
              onSelectionChange={setSelectedVideos}
              loading={isLoading}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                前へ
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {currentPage} / {totalPages} ページ
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
              >
                次へ
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 lg:p-6 max-w-md w-full mx-4">
            <h3 className="text-base lg:text-lg font-semibold text-gray-100 mb-3 lg:mb-4">
              動画の削除確認
            </h3>
            <p className="text-sm lg:text-base text-gray-400 mb-4 lg:mb-6">
              {selectedVideos.length}件の動画を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-2 lg:gap-3 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                loading={isDeleting}
                disabled={isDeleting}
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Consistency check modal */}
      <ConsistencyCheckModal
        videos={(data?.videos || []).filter(v => selectedVideos.includes(v.id) && v.status === 'completed')}
        isOpen={showConsistencyCheck}
        onClose={() => setShowConsistencyCheck(false)}
      />
    </div>
  );
}