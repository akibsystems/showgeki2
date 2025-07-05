'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Scene } from '@/types';

interface SceneCardProps {
  scene: Scene;
  index: number;
  onUpdate: (updates: Partial<Scene>) => void;
  onDelete: () => void;
  isDragging?: boolean;
  canDelete: boolean;
  isMobile?: boolean;
}

export function SceneCard({
  scene,
  index,
  onUpdate,
  onDelete,
  isDragging,
  canDelete,
  isMobile = false,
}: SceneCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(scene.description || '');

  const handleEdit = () => {
    if (editValue.trim() !== scene.description) {
      onUpdate({ description: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setEditValue(scene.description || '');
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (canDelete) {
      if (confirm(`シーン${index + 1}を削除しますか？`)) {
        onDelete();
      }
    } else {
      alert('最低1つのシーンが必要です');
    }
  };

  return (
    <div
      className={cn(
        'mobile-card group',
        'transition-all duration-200',
        isDragging && 'opacity-50 scale-95',
        'hover:shadow-lg hover:border-wf-primary/30'
      )}
    >
      <div className="flex items-start gap-3">
        {/* ドラッグハンドル（デスクトップのみ） */}
        {!isMobile && (
          <div className="mt-1 cursor-move touch-none opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="w-5 h-5 text-wf-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
        )}

        {/* シーン内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-semibold text-wf-primary">
              シーン{index + 1}
            </span>
            {scene.title && (
              <span className="text-sm text-wf-gray-500">
                ({scene.title})
              </span>
            )}
          </div>

          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEdit}
              onKeyDown={handleKeyPress}
              className="w-full mobile-input text-sm"
              placeholder="シーンの説明を入力..."
              autoFocus
            />
          ) : (
            <p
              className={cn(
                'text-sm cursor-pointer',
                scene.description ? 'text-wf-gray-300' : 'text-wf-gray-500 italic',
                'hover:text-wf-gray-100 transition-colors'
              )}
              onClick={() => setIsEditing(true)}
            >
              {scene.description || 'クリックして説明を追加...'}
            </p>
          )}

          {/* 追加情報（時間など） */}
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            {scene.duration && (
              <span className="text-wf-gray-500">
                {Math.round(scene.duration)}秒
              </span>
            )}
          </div>
        </div>

        {/* 削除ボタン */}
        <button
          onClick={handleDelete}
          className={cn(
            'p-2 rounded-full transition-all',
            'opacity-0 group-hover:opacity-100',
            canDelete
              ? 'hover:bg-wf-error/20 text-wf-gray-500 hover:text-wf-error'
              : 'text-wf-gray-700 cursor-not-allowed'
          )}
          title={canDelete ? 'シーンを削除' : '最低1つのシーンが必要です'}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}