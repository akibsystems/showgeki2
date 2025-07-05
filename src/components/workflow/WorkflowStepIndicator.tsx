'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';

export interface WorkflowStep {
  id: number;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

interface WorkflowStepIndicatorProps {
  steps: WorkflowStep[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
  className?: string;
}

/**
 * ワークフローステップインジケーターコンポーネント
 * レスポンシブ対応：モバイルでは縦並び、タブレット以上で横並び
 */
export function WorkflowStepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: WorkflowStepIndicatorProps) {
  const { isMobile } = useResponsive();

  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId);
  const isStepActive = (stepId: number) => stepId === currentStep;
  const isStepClickable = (stepId: number) => {
    return onStepClick && (isStepCompleted(stepId) || stepId <= currentStep);
  };

  return (
    <nav
      className={cn(
        'workflow-steps',
        'relative',
        className
      )}
      aria-label="進行状況"
    >
      {steps.map((step, index) => {
        const isCompleted = isStepCompleted(step.id);
        const isActive = isStepActive(step.id);
        const isClickable = isStepClickable(step.id);
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
            className={cn(
              'flex items-center',
              isMobile ? 'flex-col' : 'flex-row',
              !isLast && !isMobile && 'flex-1'
            )}
          >
            {/* ステップ */}
            <button
              onClick={() => isClickable && onStepClick?.(step.id)}
              disabled={!isClickable}
              className={cn(
                'group relative flex items-center justify-center',
                'touch-target',
                isClickable && 'cursor-pointer'
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              {/* ステップサークル */}
              <div
                className={cn(
                  'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                  isCompleted && 'border-shakespeare-purple bg-shakespeare-purple',
                  isActive && !isCompleted && 'border-shakespeare-gold bg-shakespeare-gold/20',
                  !isCompleted && !isActive && 'border-gray-600 bg-gray-800',
                  isClickable && 'group-hover:scale-110'
                )}
              >
                {isCompleted ? (
                  <svg
                    className="h-5 w-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="text-sm font-medium text-white">
                    {step.id}
                  </span>
                )}
              </div>

              {/* ステップ情報 */}
              <div
                className={cn(
                  'mt-2',
                  !isMobile && 'absolute top-full pt-2',
                  isMobile && 'text-center'
                )}
              >
                <p
                  className={cn(
                    'text-sm font-medium whitespace-nowrap',
                    isActive ? 'text-shakespeare-gold' : 'text-gray-300'
                  )}
                >
                  {step.title}
                </p>
                {step.description && isMobile && (
                  <p className="text-xs text-gray-500 mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </button>

            {/* コネクター */}
            {!isLast && (
              <div
                className={cn(
                  'transition-all',
                  isMobile
                    ? 'h-8 w-0.5 mx-auto my-2'
                    : 'h-0.5 flex-1 mx-4'
                )}
              >
                <div
                  className={cn(
                    'h-full transition-all',
                    isCompleted
                      ? 'bg-shakespeare-purple'
                      : 'bg-gray-700'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * ワークフローステップカード
 * 各ステップの詳細情報を表示
 */
interface WorkflowStepCardProps {
  step: WorkflowStep;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function WorkflowStepCard({
  step,
  isActive,
  isCompleted,
  isLocked,
  onClick,
  children,
  className,
}: WorkflowStepCardProps) {
  return (
    <div
      className={cn(
        'card-responsive',
        'relative overflow-hidden transition-all',
        isActive && 'ring-2 ring-shakespeare-gold',
        isCompleted && 'ring-1 ring-shakespeare-purple',
        isLocked && 'opacity-50',
        onClick && !isLocked && 'cursor-pointer hover:scale-[1.02]',
        className
      )}
      onClick={onClick && !isLocked ? onClick : undefined}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {step.icon && (
            <div className="text-2xl">{step.icon}</div>
          )}
          <div>
            <h3 className="text-lg font-semibold">
              ステップ {step.id}: {step.title}
            </h3>
            {step.description && (
              <p className="text-sm text-gray-400">
                {step.description}
              </p>
            )}
          </div>
        </div>
        
        {/* ステータスバッジ */}
        <div
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium',
            isCompleted && 'bg-shakespeare-purple/20 text-shakespeare-purple',
            isActive && !isCompleted && 'bg-shakespeare-gold/20 text-shakespeare-gold',
            !isActive && !isCompleted && 'bg-gray-700 text-gray-400'
          )}
        >
          {isCompleted ? '完了' : isActive ? '進行中' : '未着手'}
        </div>
      </div>

      {/* コンテンツ */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}

      {/* ロック状態のオーバーレイ */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="w-8 h-8 mx-auto mb-2 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <p className="text-sm text-gray-400">
              前のステップを完了してください
            </p>
          </div>
        </div>
      )}
    </div>
  );
}