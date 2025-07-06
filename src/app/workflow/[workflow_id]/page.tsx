'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/contexts';
import WorkflowLayout from '@/components/workflow/WorkflowLayout';
import type { WorkflowState, Workflow } from '@/types/workflow';
import { getOrCreateUid } from '@/lib/uid';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// 各ステップのコンポーネント
import Step1StoryInput from '@/components/workflow/steps/Step1StoryInput';
import Step2ScenePreview from '@/components/workflow/steps/Step2ScenePreview';
import Step3CharacterStyle from '@/components/workflow/steps/Step3CharacterStyle';
// import Step4ScriptPreview from '@/components/workflow/steps/Step4ScriptPreview';
// import Step5VoiceGen from '@/components/workflow/steps/Step5VoiceGen';
// import Step6BgmSubtitle from '@/components/workflow/steps/Step6BgmSubtitle';
// import Step7Confirm from '@/components/workflow/steps/Step7Confirm';

interface PageProps {
  params: Promise<{
    workflow_id: string;
  }>;
}

function WorkflowPageContent({ params }: PageProps) {
  const { workflow_id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error } = useToast();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canProceed, setCanProceed] = useState(false);
  const [saveFunction, setSaveFunction] = useState<(() => Promise<void>) | null>(null);

  // URLパラメータからステップ番号を取得
  const currentStep = parseInt(searchParams.get('step') || '1', 10);

  // ステップが有効な範囲内かチェック
  useEffect(() => {
    if (currentStep < 1 || currentStep > 7) {
      router.replace(`/workflow/${workflow_id}?step=1`);
    }
  }, [currentStep, workflow_id, router]);

  // ワークフロー情報を取得
  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const response = await fetch(`/api/workflow/${workflow_id}/step/${currentStep}`);

        if (!response.ok) {
          throw new Error('Failed to fetch workflow');
        }

        const data = await response.json();
        console.log('[WorkflowPage] Fetched workflow data:', data);
        setWorkflow(data.workflow);
      } catch (err) {
        console.error('Failed to fetch workflow:', err);
        error('ワークフローの読み込みに失敗しました');
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflow();
  }, [workflow_id, currentStep, error, router]);

  // ワークフロー状態を計算
  const workflowState: WorkflowState = {
    id: workflow_id,
    currentStep,
    canProceed,
    canGoBack: currentStep > 1,
    completedSteps: workflow
      ? Array.from({ length: workflow.current_step }, (_, i) => i + 1)
      : [],
  };

  // ナビゲーション関数
  const handleNext = async () => {
    // 保存関数が設定されている場合は実行
    if (saveFunction) {
      await saveFunction();
    } else {
      // 保存不要なステップの場合は直接移動
      router.push(`/workflow/${workflow_id}?step=${currentStep + 1}`);
    }
  };

  const handleBack = () => {
    router.push(`/workflow/${workflow_id}?step=${currentStep - 1}`);
  };

  // ステップコンポーネントをレンダリング
  const renderStepComponent = () => {
    if (!workflow) return null;

    switch (currentStep) {
      case 1:
        return (
          <Step1StoryInput
            workflowId={workflow_id}
            initialData={workflow.step1_json || undefined}
            onNext={() => router.push(`/workflow/${workflow_id}?step=${currentStep + 1}`)}
            onUpdate={setCanProceed}
          />
        );
      case 2:
        return (
          <Step2ScenePreview
            workflowId={workflow_id}
            initialData={workflow.step2_json || undefined}
            previousStepData={workflow.step1_json || undefined}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={setCanProceed}
          />
        );
      case 3:
        return (
          <Step3CharacterStyle
            workflowId={workflow_id}
            initialData={workflow.step3_json || undefined}
            previousStepData={workflow.step2_json || undefined}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={setCanProceed}
          />
        );
      case 4:
        return (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">ステップ4: 台本＆静止画プレビュー</h2>
            <p className="text-gray-400">このコンポーネントはPhase 3で実装予定です</p>
          </div>
        );
      case 5:
        return (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">ステップ5: 音声生成</h2>
            <p className="text-gray-400">このコンポーネントはPhase 3で実装予定です</p>
          </div>
        );
      case 6:
        return (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">ステップ6: BGM & 字幕設定</h2>
            <p className="text-gray-400">このコンポーネントはPhase 3で実装予定です</p>
          </div>
        );
      case 7:
        return (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">ステップ7: 最終確認</h2>
            <p className="text-gray-400">このコンポーネントはPhase 4で実装予定です</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return null;
  }

  return (
    <WorkflowLayout
      workflowId={workflow_id}
      currentStep={currentStep}
      workflowState={workflowState}
      onNext={handleNext}
      hideFooter={currentStep === 1}
    >
      {renderStepComponent()}
    </WorkflowLayout>
  );
}

export default function WorkflowPage(props: PageProps) {
  return (
    <ProtectedRoute>
      <WorkflowPageContent {...props} />
    </ProtectedRoute>
  );
}