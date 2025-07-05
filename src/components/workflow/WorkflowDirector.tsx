'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWorkflow } from '@/contexts/workflow-context';
import { WorkflowProvider } from '@/contexts/workflow-context';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import { WorkflowStepIndicator, WorkflowStepCard } from './WorkflowStepIndicator';
import { StoryInputStep } from './steps/StoryInputStep';
import { SceneListStep } from './steps/SceneListStep';
import { CharacterListStep } from './steps/CharacterListStep';
import { DialogueImageEditStep } from './steps/DialogueImageEditStep';
import { AudioBGMSettingsStep } from './steps/AudioBGMSettingsStep';
import { ResponsiveContainer } from '../ui/ResponsiveContainer';
import { MobileWorkflowLayout } from './MobileWorkflowLayout';
import '@/styles/mobile-first.css';

// ワークフローステップの定義
const WORKFLOW_STEPS = [
  {
    id: 1,
    title: 'ストーリー入力',
    description: 'あなたの物語を教えてください',
    icon: '📝',
  },
  {
    id: 2,
    title: '劇的シーン一覧',
    description: '幕と場の構成を確認',
    icon: '🎭',
  },
  {
    id: 3,
    title: '登場人物・キャラクタ',
    description: 'キャラクターと音声を設定',
    icon: '👥',
  },
  {
    id: 4,
    title: '台詞と画像編集',
    description: '各シーンの詳細を編集',
    icon: '🖼️',
  },
  {
    id: 5,
    title: '音声・BGM設定',
    description: '最終的な音響設定',
    icon: '🎵',
  },
];

interface WorkflowDirectorProps {
  storyId: string;
  initialStep?: number;
  enableSpecialMode?: boolean;
}

/**
 * ワークフローディレクター（内部コンポーネント）
 * WorkflowProviderの中で使用される
 */
function WorkflowDirectorInner({ storyId, initialStep, enableSpecialMode }: WorkflowDirectorProps) {
  const { 
    state, 
    loadStory, 
    goToStep, 
    canNavigateToStep,
    completeCurrentStep,
    generateSceneOverviewAI,
    generateMulmoscriptAI,
    generateScreenplayAI,
    generateFinalVideoAI 
  } = useWorkflow();
  const { isMobile, isTabletUp } = useResponsive();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ストーリーを読み込む
  useEffect(() => {
    if (storyId && !state.story) {
      loadStory(storyId);
    }
  }, [storyId, state.story, loadStory]);

  // URLのステップパラメータを監視して同期
  useEffect(() => {
    const stepFromUrl = searchParams.get('step');
    if (stepFromUrl) {
      const step = parseInt(stepFromUrl, 10);
      if (step !== state.currentStep && canNavigateToStep(step)) {
        goToStep(step);
      }
    } else if (initialStep && state.story && state.currentStep === 1) {
      // 初期ステップが指定されている場合
      goToStep(initialStep);
    }
  }, [searchParams, state.currentStep, state.story, initialStep, canNavigateToStep, goToStep]);

  // ステップが変更されたらURLを更新
  const updateUrlStep = useCallback((step: number) => {
    const currentPath = window.location.pathname;
    router.replace(`${currentPath}?step=${step}`);
  }, [router]);

  // ステップクリックハンドラー
  const handleStepClick = (stepId: number) => {
    if (canNavigateToStep(stepId)) {
      goToStep(stepId);
      updateUrlStep(stepId);
    }
  };

  // 現在のステップコンポーネントを取得
  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 1:
        return <StoryInputStep onNext={handleStepComplete} />;
      case 2:
        return <SceneListStep />;
      case 3:
        return <CharacterListStep enableSpecialMode={enableSpecialMode} />;
      case 4:
        return <DialogueImageEditStep enableSpecialMode={enableSpecialMode} />;
      case 5:
        return <AudioBGMSettingsStep enableSpecialMode={enableSpecialMode} />;
      default:
        return null;
    }
  };

  // 各ステップの完了処理
  const handleStepComplete = async () => {
    switch (state.currentStep) {
      case 1:
        // フォームが有効かチェック
        if (!state.storyElements || !state.storyElements.main_story.trim()) {
          console.error('Story elements not valid:', state.storyElements);
          return;
        }
        
        try {
          // シーン概要生成（この中でストーリーテキストも保存される）
          await generateSceneOverviewAI();
          
          // ストーリー入力完了後、ステップ1を完了
          completeCurrentStep();
          
          goToStep(2);
          updateUrlStep(2);
        } catch (error) {
          console.error('Failed to generate scene overview:', error);
        }
        break;
      default:
        completeCurrentStep();
        if (canNavigateToStep(state.currentStep + 1)) {
          goToStep(state.currentStep + 1);
          updateUrlStep(state.currentStep + 1);
        }
        break;
    }
  };

  // ナビゲーションハンドラー
  const handleNext = async () => {
    console.log('handleNext called', { currentStep: state.currentStep, storyElements: state.storyElements });
    
    switch (state.currentStep) {
      case 1:
        // ステップ1: ストーリー入力
        await handleStepComplete();
        break;
        
      case 2:
        // ステップ2: シーン一覧
        // シーン構成をMulmoScriptに変換
        await generateMulmoscriptAI();
        completeCurrentStep();
        goToStep(3);
        updateUrlStep(3);
        break;
        
      case 3:
        // ステップ3: キャラクター設定
        completeCurrentStep();
        // 既存のmulmoscriptを使用するため、スクリプト生成はスキップ
        goToStep(4);
        updateUrlStep(4);
        break;
        
      case 4:
        // ステップ4: 台詞と画像編集
        completeCurrentStep();
        goToStep(5);
        updateUrlStep(5);
        break;
        
      case 5:
        // ステップ5: 音声・BGM設定
        completeCurrentStep();
        // 最終動画生成を開始（MulmoScriptから実際のデータを使用）
        const mulmoscript = state.story?.script_json;
        if (!mulmoscript || !mulmoscript.beats || mulmoscript.beats.length === 0) {
          console.error('No valid mulmoscript found for video generation');
          return;
        }
        
        // MulmoScriptから実際のscenes（beats）とcharacters（speakers）を抽出
        const scenes = mulmoscript.beats.map((beat: any, index: number) => ({
          sceneId: beat.id || `scene-${index + 1}`,
          speaker: beat.speaker || '',
          dialogue: beat.text || '',
          title: beat.description || `シーン${index + 1}`,
          imagePrompt: beat.imagePrompt || '',
          customImageUrl: beat.image?.source?.url || null,
        }));
        
        const speakers = mulmoscript.speechParams?.speakers || {};
        const characters = Object.keys(speakers).map(speakerKey => ({
          id: speakerKey,
          name: speakers[speakerKey].displayName?.ja || speakerKey,
          voiceId: speakers[speakerKey].voiceId || 'alloy',
        }));
        
        await generateFinalVideoAI({
          scenes,
          characters,
          audioSettings: {
            audioVolume: mulmoscript.audioParams?.audioVolume || 1.0,
            masterBGMVolume: mulmoscript.audioParams?.bgmVolume || 0.5,
          },
          bgmSettings: mulmoscript.audioParams?.bgm ? [{
            bgmId: 'custom',
            url: mulmoscript.audioParams.bgm.url
          }] : [],
          subtitleSettings: {
            enableSubtitles: !!mulmoscript.captionParams,
            subtitleLanguage: mulmoscript.captionParams?.lang || 'ja',
          },
        });
        break;
        
      default:
        // その他のステップ
        completeCurrentStep();
        if (canNavigateToStep(state.currentStep + 1)) {
          goToStep(state.currentStep + 1);
          updateUrlStep(state.currentStep + 1);
        }
        break;
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
      updateUrlStep(state.currentStep - 1);
    }
  };

  // 次へボタンの状態を判定
  const getNextButtonState = () => {
    if (state.currentStep === 1) {
      // ステップ1の場合は、フォームが有効かチェック
      const isFormValid = state.storyElements && state.storyElements.main_story.trim().length > 0;
      return {
        showNext: true,
        nextLabel: '次へ',
        nextDisabled: !isFormValid,
      };
    }
    
    if (state.currentStep === 5) {
      return {
        showNext: true,
        nextLabel: '動画を作成',
        nextDisabled: !state.completedSteps.includes(4),
      };
    }
    
    return {
      showNext: true,
      nextLabel: '次へ',
      nextDisabled: false, // ステップ2-4では常に次へ進めるようにする
    };
  };

  // ローディング中
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-shakespeare-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-wf-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">エラーが発生しました</h2>
          <p className="text-wf-gray-400">{state.error}</p>
        </div>
      </div>
    );
  }

  const nextButtonState = getNextButtonState();
  
  console.log('WorkflowDirector render', {
    currentStep: state.currentStep,
    nextButtonState,
    storyElements: state.storyElements,
  });

  return (
    <MobileWorkflowLayout
      currentStep={state.currentStep}
      totalSteps={WORKFLOW_STEPS.length}
      onBack={state.currentStep > 1 ? handleBack : undefined}
      onNext={handleNext}
      nextDisabled={nextButtonState.nextDisabled}
      nextLabel={nextButtonState.nextLabel}
      showNext={nextButtonState.showNext}
    >
      {/* 現在のステップのタイトルと説明 */}
      <div className="mobile-card mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{WORKFLOW_STEPS[state.currentStep - 1].icon}</span>
          <h2 className="text-xl font-semibold">
            {WORKFLOW_STEPS[state.currentStep - 1].title}
          </h2>
        </div>
        <p className="text-wf-gray-400 text-sm">
          {WORKFLOW_STEPS[state.currentStep - 1].description}
        </p>
      </div>

      {/* ステップコンテンツ */}
      {renderCurrentStep()}

      {/* デスクトップ用サイドバー情報（タブレット以上で表示） */}
      {isTabletUp && (
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="mobile-card">
            <h3 className="font-semibold mb-2 text-sm">ストーリー情報</h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-wf-gray-500">タイトル</dt>
                <dd className="font-medium">{state.story?.title || '未設定'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-wf-gray-500">場数</dt>
                <dd className="font-medium">{state.storyElements?.total_scenes || 5}場</dd>
              </div>
            </dl>
          </div>
          <div className="mobile-card">
            <h3 className="font-semibold mb-2 text-sm">保存状態</h3>
            <p className="text-xs text-wf-gray-400">
              {state.isSaving ? (
                <span>保存中...</span>
              ) : state.hasUnsavedChanges ? (
                <span>未保存の変更があります</span>
              ) : (
                <span>すべて保存済み</span>
              )}
            </p>
          </div>
        </div>
      )}
    </MobileWorkflowLayout>
  );
}

/**
 * ワークフローディレクター（外部公開コンポーネント）
 * WorkflowProviderでラップされている
 */
export function WorkflowDirector(props: WorkflowDirectorProps) {
  return (
    <WorkflowProvider>
      <WorkflowDirectorInner {...props} />
    </WorkflowProvider>
  );
}