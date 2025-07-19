'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { VideoFilters as VideoFiltersType } from '@/hooks/useAdminVideos';
import { format } from 'date-fns';

// ================================================================
// Types
// ================================================================

interface VideoFiltersProps {
  filters: VideoFiltersType;
  onFiltersChange: (filters: VideoFiltersType) => void;
  disabled?: boolean;
}

// ================================================================
// Component
// ================================================================

export function VideoFilters({ filters, onFiltersChange, disabled = false }: VideoFiltersProps) {
  const [localFilters, setLocalFilters] = useState<VideoFiltersType>({
    ...filters,
    // Initialize modes with both selected if not provided
    modes: filters.modes || ['instant', 'professional']
  });
  // Start with false to avoid hydration mismatch
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Update localFilters when filters prop changes (e.g., from URL)
  useEffect(() => {
    setLocalFilters({
      ...filters,
      modes: filters.modes || ['instant', 'professional']
    });
  }, [filters]);
  
  // Set initial state after mount based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsExpanded(true);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Clean up - no need to listen for resize as this is just for initial state
    return () => {};
  }, []);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleResetFilters = () => {
    const resetFilters: VideoFiltersType = {
      page: 1,
      limit: filters.limit,
      modes: ['instant', 'professional']
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const hasActiveFilters = filters.status || filters.from || filters.to || filters.search || 
    (filters.modes && filters.modes.length !== 2);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-100">フィルター</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-purple-400 hover:text-purple-300"
          disabled={disabled}
        >
          {isExpanded ? '閉じる' : '展開'}
        </button>
      </div>

      {/* Quick search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="タイトル、UID、ストーリー内容で検索..."
          value={localFilters.search || ''}
          onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value, page: 1 })}
          onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
          disabled={disabled}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">
          動画タイトル、UID、ストーリー内容（originalText）を検索します
        </p>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ステータス
            </label>
            <select
              value={localFilters.status || ''}
              onChange={(e) => setLocalFilters({ 
                ...localFilters, 
                status: e.target.value as any || undefined,
                page: 1 
              })}
              disabled={disabled}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">すべて</option>
              <option value="queued">待機中</option>
              <option value="processing">処理中</option>
              <option value="completed">完了</option>
              <option value="error">エラー</option>
            </select>
          </div>

          {/* Mode filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              作成モード
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.modes?.includes('instant') ?? false}
                  onChange={(e) => {
                    const currentModes = localFilters.modes || [];
                    const newModes = e.target.checked 
                      ? [...currentModes, 'instant']
                      : currentModes.filter(m => m !== 'instant');
                    setLocalFilters({
                      ...localFilters,
                      modes: newModes,
                      page: 1
                    });
                  }}
                  disabled={disabled}
                  className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-100">かんたんモード</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.modes?.includes('professional') ?? false}
                  onChange={(e) => {
                    const currentModes = localFilters.modes || [];
                    const newModes = e.target.checked 
                      ? [...currentModes, 'professional']
                      : currentModes.filter(m => m !== 'professional');
                    setLocalFilters({
                      ...localFilters,
                      modes: newModes,
                      page: 1
                    });
                  }}
                  disabled={disabled}
                  className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-100">プロフェッショナルモード</span>
              </label>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                開始日
              </label>
              <input
                type="datetime-local"
                value={localFilters.from ? format(new Date(localFilters.from), "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => setLocalFilters({ 
                  ...localFilters, 
                  from: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  page: 1 
                })}
                disabled={disabled}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                終了日
              </label>
              <input
                type="datetime-local"
                value={localFilters.to ? format(new Date(localFilters.to), "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => setLocalFilters({ 
                  ...localFilters, 
                  to: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  page: 1 
                })}
                disabled={disabled}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Results per page */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              表示件数
            </label>
            <select
              value={localFilters.limit}
              onChange={(e) => setLocalFilters({ 
                ...localFilters, 
                limit: parseInt(e.target.value),
                page: 1 
              })}
              disabled={disabled}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={25}>25件</option>
              <option value={50}>50件</option>
              <option value={100}>100件</option>
            </select>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="primary"
          size="sm"
          onClick={handleApplyFilters}
          disabled={disabled}
          className="flex-1"
        >
          フィルター適用
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            disabled={disabled}
          >
            リセット
          </Button>
        )}
      </div>
    </div>
  );
}