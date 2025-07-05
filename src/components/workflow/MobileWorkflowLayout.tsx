'use client';

import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface MobileWorkflowLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  showNext?: boolean;
  className?: string;
}

export const MobileWorkflowLayout: React.FC<MobileWorkflowLayoutProps> = ({
  children,
  currentStep,
  totalSteps,
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel = '次へ',
  showNext = true,
  className,
}) => {
  const router = useRouter();

  const handleClose = () => {
    if (confirm('作成を中止しますか？進行状況は保存されます。')) {
      router.push('/dashboard');
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className={cn('mobile-layout', className)}>
      {/* ヘッダー＆プログレスバー */}
      <header className="mobile-header">
        <div className="mobile-progress-bar">
          <button
            onClick={onBack}
            className="mobile-button-icon"
            disabled={!onBack}
            style={{ opacity: onBack ? 1 : 0 }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="mobile-progress-track">
            <div
              className="mobile-progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <span className="text-sm text-wf-gray-400">
            {currentStep}/{totalSteps}
          </span>

          <button
            onClick={handleClose}
            className="mobile-button-icon"
          >
            <svg
              className="w-5 h-5"
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
      </header>

      {/* メインコンテンツ */}
      <main className="mobile-content">
        <div className="p-4">
          {children}
        </div>
      </main>

      {/* ボトムアクション */}
      {showNext && (
        <div className="mobile-bottom-actions">
          <div className="flex gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="mobile-button mobile-button-secondary flex-1"
              >
                戻る
              </button>
            )}
            <button
              onClick={() => {
                console.log('Next button clicked', { onNext, nextDisabled });
                if (onNext) {
                  onNext();
                }
              }}
              disabled={nextDisabled}
              className={cn(
                'mobile-button mobile-button-primary flex-1',
                !onBack && 'mobile-button-full'
              )}
            >
              {nextLabel}
              {nextLabel === '次へ' && (
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};