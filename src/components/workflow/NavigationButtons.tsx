'use client';

import React from 'react';
import { Spinner } from '@/components/ui';

interface NavigationButtonsProps {
  canGoBack: boolean;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
  isLoading?: boolean;
  isSaving?: boolean;
  showSaveStatus?: boolean;
  className?: string;
}

export default function NavigationButtons({
  canGoBack,
  canProceed,
  onBack,
  onNext,
  isLoading = false,
  isSaving = false,
  showSaveStatus = true,
  className = '',
}: NavigationButtonsProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <button
        onClick={onBack}
        disabled={!canGoBack || isLoading}
        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
          canGoBack && !isLoading
            ? 'bg-gray-700 text-gray-100 hover:bg-gray-600'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        ← 前へ
      </button>

      {/* 保存状態表示 */}
      {showSaveStatus && (
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          {isSaving ? (
            <>
              <Spinner />
              <span>保存中...</span>
            </>
          ) : (
            <>
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>自動保存済み</span>
            </>
          )}
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!canProceed || isLoading}
        className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
          canProceed && !isLoading
            ? 'bg-purple-600 text-white hover:bg-purple-700'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <>
            <Spinner />
            <span>処理中...</span>
          </>
        ) : (
          <span>次へ →</span>
        )}
      </button>
    </div>
  );
}