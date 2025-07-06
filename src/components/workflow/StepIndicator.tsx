'use client';

import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
  className?: string;
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

export default function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  className = '',
}: StepIndicatorProps) {
  // モバイル版
  const MobileIndicator = () => (
    <div className="lg:hidden">
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
  );

  // デスクトップ版
  const DesktopIndicator = () => (
    <div className="hidden lg:flex items-center justify-between">
      {STEP_TITLES.map((title, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = completedSteps.includes(stepNumber);
        const isClickable = isCompleted || stepNumber === currentStep;

        return (
          <React.Fragment key={stepNumber}>
            <div
              onClick={() => isClickable && onStepClick?.(stepNumber)}
              className={`flex items-center space-x-3 ${
                isClickable && onStepClick
                  ? 'cursor-pointer hover:opacity-80'
                  : isClickable
                  ? ''
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
                className={`text-sm whitespace-nowrap ${
                  isActive
                    ? 'text-purple-300 font-medium'
                    : isCompleted
                    ? 'text-green-400'
                    : 'text-gray-500'
                }`}
              >
                {title}
              </span>
            </div>
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
  );

  return (
    <div className={className}>
      <MobileIndicator />
      <DesktopIndicator />
    </div>
  );
}