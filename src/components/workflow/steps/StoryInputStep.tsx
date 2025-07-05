'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useWorkflow } from '@/contexts/workflow-context';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import { StoryElements } from '@/types';

interface StoryInputStepProps {
  className?: string;
  onNext?: () => Promise<void>;
}

/**
 * ワークフローステップ1: ストーリー入力
 * ユーザーのストーリー、転換点、未来イメージ、学びを入力
 */
export function StoryInputStep({ className, onNext }: StoryInputStepProps) {
  const { state, updateStoryElements, completeCurrentStep, generateScreenplayAI } = useWorkflow();
  const { isMobile } = useResponsive();
  const [isRecording, setIsRecording] = useState(false);
  const [activeField, setActiveField] = useState<keyof StoryElements | null>(null);
  
  // フォームの初期値設定
  const [formData, setFormData] = useState<StoryElements>({
    main_story: state.storyElements?.main_story || '',
    dramatic_turning_point: state.storyElements?.dramatic_turning_point || '',
    future_image: state.storyElements?.future_image || '',
    learnings: state.storyElements?.learnings || '',
    total_scenes: state.storyElements?.total_scenes || 5,
  });

  // フォームデータの変更を検知してWorkflowContextに反映
  useEffect(() => {
    const hasChanges = Object.keys(formData).some(
      key => formData[key as keyof StoryElements] !== state.storyElements?.[key as keyof StoryElements]
    );
    
    if (hasChanges) {
      console.log('Updating story elements:', formData);
      updateStoryElements(formData);
    }
  }, [formData, state.storyElements, updateStoryElements]);

  // 入力フィールドの変更ハンドラー
  const handleInputChange = useCallback(
    (field: keyof StoryElements, value: string | number) => {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  // 音声入力の開始/停止
  const toggleVoiceInput = useCallback((field: keyof StoryElements) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('お使いのブラウザは音声入力に対応していません');
      return;
    }

    if (isRecording && activeField === field) {
      // 録音停止
      setIsRecording(false);
      setActiveField(null);
      // TODO: 実際の音声認識停止処理
    } else {
      // 録音開始
      setIsRecording(true);
      setActiveField(field);
      // TODO: 実際の音声認識開始処理
    }
  }, [isRecording, activeField]);

  // フォームの検証
  const isFormValid = useCallback(() => {
    return formData.main_story.trim().length > 0 && formData.total_scenes >= 1 && formData.total_scenes <= 20;
  }, [formData]);

  // ステップ完了処理
  const handleComplete = useCallback(async () => {
    if (isFormValid()) {
      if (onNext) {
        // MobileWorkflowLayoutから渡されたonNextを使用
        await onNext();
      } else {
        // 独自の完了処理
        completeCurrentStep();
        // AI脚本生成を開始
        await generateScreenplayAI();
      }
    }
  }, [isFormValid, completeCurrentStep, generateScreenplayAI, onNext]);

  // 詳細オプションの表示状態
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  return (
    <div className={cn('space-y-4', className)}>
      <form className="space-y-4">
        {/* 主ストーリー */}
        <div>
          <label className="mobile-label">
            主ストーリー <span className="text-wf-error">*</span>
          </label>
          <div className="relative">
            <textarea
              id="main_story"
              value={formData.main_story}
              onChange={(e) => handleInputChange('main_story', e.target.value)}
              placeholder="あなたの物語を詳しく教えてください..."
              className="mobile-textarea"
              style={{ minHeight: '160px' }}
              required
            />
          </div>
          
          {/* 音声入力ボタン（モバイル） */}
          {isMobile && (
            <button
              type="button"
              onClick={() => toggleVoiceInput('main_story')}
              className={cn(
                'mobile-button mobile-button-secondary mt-3 w-full',
                isRecording && activeField === 'main_story' && 'bg-wf-error'
              )}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {isRecording && activeField === 'main_story' ? '録音停止' : '音声入力'}
            </button>
          )}
        </div>

        {/* 全体場数 */}
        <div>
          <label className="mobile-label">
            全体場数
          </label>
          <div className="mobile-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-wf-gray-400">シーン数</span>
              <span className="text-2xl font-bold text-wf-primary">
                {formData.total_scenes}
              </span>
            </div>
            <input
              type="range"
              id="total_scenes"
              min="1"
              max="20"
              value={formData.total_scenes}
              onChange={(e) => handleInputChange('total_scenes', parseInt(e.target.value))}
              className="mobile-slider"
            />
            <p className="text-xs text-wf-gray-500 mt-2">
              推奨: 5-10シーン
            </p>
          </div>
        </div>

        {/* 詳細オプション（折りたたみ式） */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800/50"
          >
            <span className="text-sm font-medium">詳細オプション</span>
            <svg
              className={cn(
                'w-5 h-5 transition-transform',
                showAdvancedOptions && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAdvancedOptions && (
            <div className="mt-4 space-y-4">
              {/* ドラマチック転換点 */}
              <div>
                <label className="mobile-label">
                  ドラマチック転換点
                </label>
                <textarea
                  value={formData.dramatic_turning_point}
                  onChange={(e) => handleInputChange('dramatic_turning_point', e.target.value)}
                  placeholder="物語の転機となった瞬間は？"
                  className="mobile-textarea"
                  rows={3}
                />
              </div>

              {/* 未来イメージ */}
              <div>
                <label className="mobile-label">
                  未来イメージ
                </label>
                <textarea
                  value={formData.future_image}
                  onChange={(e) => handleInputChange('future_image', e.target.value)}
                  placeholder="どんな未来を描いていますか？"
                  className="mobile-textarea"
                  rows={3}
                />
              </div>

              {/* 学び */}
              <div>
                <label className="mobile-label">
                  学び
                </label>
                <textarea
                  value={formData.learnings}
                  onChange={(e) => handleInputChange('learnings', e.target.value)}
                  placeholder="この経験から得た学びは？"
                  className="mobile-textarea"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </form>

      {/* 入力のヒント */}
      <div className="mobile-card bg-wf-primary/10 border-primary/20">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <span>💡</span>
          より良い劇を作るためのヒント
        </h3>
        <ul className="text-xs text-wf-gray-300 space-y-1">
          <li>• 具体的なエピソードや感情を含めると感動的に</li>
          <li>• 転換点では困難や葛藤を詳しく</li>
          <li>• 未来は具体的な夢や目標を</li>
          <li>• 学びは普遍的な内容を</li>
        </ul>
      </div>
    </div>
  );
}