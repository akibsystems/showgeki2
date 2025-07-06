'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { WorkflowState } from '@/types/workflow';

interface WorkflowLayoutProps {
  workflowId: string;
  currentStep: number;
  workflowState: WorkflowState;
  children: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  hideFooter?: boolean;
}

const STEP_TITLES = [
  'ストーリー入力',
  '初期幕場レビュー',
  'キャラクタ&画風設定',
  '台本＆静止画プレビュー',
  '音声生成',
  'BGM & 字幕設定',
  '最終確認',
];

export default function WorkflowLayout({
  workflowId,
  currentStep,
  workflowState,
  children,
  onNext,
  onBack,
  hideFooter = false,
}: WorkflowLayoutProps) {
  const router = useRouter();

  const handleStepClick = (stepNumber: number) => {
    // 完了したステップまたは現在のステップのみクリック可能
    if (workflowState.completedSteps.includes(stepNumber) || stepNumber === currentStep) {
      router.push(`/workflow/${workflowId}?step=${stepNumber}`);
    }
  };

  const handleBack = () => {
    if (workflowState.canGoBack && currentStep > 1) {
      if (onBack) {
        onBack();
      } else {
        router.push(`/workflow/${workflowId}?step=${currentStep - 1}`);
      }
    }
  };

  const handleNext = () => {
    if (workflowState.canProceed && currentStep < 7) {
      if (onNext) {
        onNext();
      } else {
        router.push(`/workflow/${workflowId}?step=${currentStep + 1}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ヘッダー */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-100">
              脚本の作成
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="閉じる"
            >
              <svg
                className="w-6 h-6"
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
      </header>

      {/* ステップインジケーター（デスクトップ） */}
      <div className="hidden lg:block bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {STEP_TITLES.map((title, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = workflowState.completedSteps.includes(stepNumber);
              const isClickable = isCompleted || stepNumber === currentStep;

              return (
                <React.Fragment key={stepNumber}>
                  <button
                    onClick={() => handleStepClick(stepNumber)}
                    disabled={!isClickable}
                    className={`flex items-center space-x-3 ${
                      isClickable
                        ? 'cursor-pointer hover:opacity-80'
                        : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                        isActive
                          ? 'bg-purple-500 text-white'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        stepNumber
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isActive
                          ? 'text-purple-300 font-medium'
                          : isCompleted
                          ? 'text-green-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {title}
                    </span>
                  </button>
                  {index < STEP_TITLES.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 transition-colors ${
                        isCompleted
                          ? 'bg-green-600'
                          : 'bg-gray-700'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ステップインジケーター（モバイル） */}
      <div className="lg:hidden bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              ステップ {currentStep}/7
            </span>
            <span className="text-sm font-medium text-gray-100">
              {STEP_TITLES[currentStep - 1]}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* ナビゲーションボタン */}
      {!hideFooter && (
        <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <button
              onClick={handleBack}
              disabled={!workflowState.canGoBack || currentStep === 1}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                workflowState.canGoBack && currentStep > 1
                  ? 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              ← 前へ
            </button>

            {/* 保存状態表示 */}
            <div className="flex items-center space-x-2 text-sm text-gray-400">
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
            </div>

            <button
              onClick={handleNext}
              disabled={!workflowState.canProceed || currentStep === 7}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                workflowState.canProceed && currentStep < 7
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              次へ →
            </button>
          </div>
        </div>
        </footer>
      )}
    </div>
  );
}