'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
import WorkflowLayout from '@/components/workflow/WorkflowLayout';
import type { WorkflowState, StepResponse } from '@/types/workflow';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// 各ステップのコンポーネント
import Step1StoryInput from '@/components/workflow/steps/Step1StoryInput';
import Step2ScenePreview from '@/components/workflow/steps/Step2ScenePreview';
import Step3CharacterStyle from '@/components/workflow/steps/Step3CharacterStyle';
import Step4ScriptPreview from '@/components/workflow/steps/Step4ScriptPreview';
import Step5VoiceGen from '@/components/workflow/steps/Step5VoiceGen';
import Step6BgmSubtitle from '@/components/workflow/steps/Step6BgmSubtitle';
import Step7Confirm from '@/components/workflow/steps/Step7Confirm';

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
  const { user } = useAuth();

  const [stepInput, setStepInput] = useState<any>(null);
  const [stepOutput, setStepOutput] = useState<any>(null);
  const [workflowInfo, setWorkflowInfo] = useState<{ current_step: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canProceed, setCanProceed] = useState(false);

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
    // ステップが変更されたときに、古いデータをクリア
    setStepInput(null);
    setStepOutput(null);
    setIsLoading(true);

    const fetchWorkflow = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // StepXInputを取得（workflow-design.mdの仕様に従う）
        const response = await fetch(`/api/workflow/${workflow_id}/step/${currentStep}`, {
          headers: {
            'X-User-UID': user.id,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch workflow');
        }

        const stepInputData = await response.json();
        console.log('[WorkflowPage] Fetched step input:', stepInputData);
        setStepInput(stepInputData);
        
        // ワークフロー情報を取得してstepOutputも取得
        const workflowResponse = await fetch(`/api/workflow/${workflow_id}`, {
          headers: {
            'X-User-UID': user.id,
          },
        });
        
        if (workflowResponse.ok) {
          const workflowData = await workflowResponse.json();
          setWorkflowInfo({ current_step: workflowData.workflow.current_step });
          
          // stepOutputを取得
          const stepOutColumnName = `step${currentStep}_out`;
          if (workflowData.workflow[stepOutColumnName]) {
            setStepOutput(workflowData.workflow[stepOutColumnName]);
          } else if (currentStep === 1 && stepInputData && Object.keys(stepInputData).length > 0) {
            // Step1でstepOutputがない場合、stepInputをstepOutputとして使用
            setStepOutput({ userInput: stepInputData });
          }
        }
      } catch (err) {
        console.error('Failed to fetch workflow:', err);
        error('ワークフローの読み込みに失敗しました');
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflow();
  }, [workflow_id, currentStep, error, router, user]);

  // ワークフロー状態を計算
  const workflowState: WorkflowState = {
    id: workflow_id,
    currentStep,
    canProceed,
    canGoBack: currentStep > 1,
    completedSteps: workflowInfo
      ? Array.from({ length: workflowInfo.current_step }, (_, i) => i + 1)
      : [],
  };

  // ナビゲーション関数
  const handleNext = () => {
    router.push(`/workflow/${workflow_id}?step=${currentStep + 1}`);
  };

  const handleBack = () => {
    router.push(`/workflow/${workflow_id}?step=${currentStep - 1}`);
  };

  // ステップコンポーネントをレンダリング
  const renderStepComponent = () => {
    if (!stepInput) return null;

    switch (currentStep) {
      case 1:
        return (
          <Step1StoryInput
            workflowId={workflow_id}
            initialData={{
              stepInput: stepInput,
              stepOutput: stepOutput,
            }}
            onNext={handleNext}
            onUpdate={setCanProceed}
          />
        );
      case 2:
        return (
          <Step2ScenePreview
            workflowId={workflow_id}
            initialData={{
              stepInput: stepInput,
              stepOutput: stepOutput,
            }}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={setCanProceed}
          />
        );
      case 3:
        return (
          <Step3CharacterStyle
            workflowId={workflow_id}
            initialData={{
              stepInput: stepInput,
              stepOutput: stepOutput,
            }}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={setCanProceed}
          />
        );
      case 4:
        return (
          <Step4ScriptPreview
            workflowId={workflow_id}
            initialData={{
              stepInput: stepInput,
              stepOutput: stepOutput,
            }}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={setCanProceed}
          />
        );
      case 5:
        return (
          <Step5VoiceGen
            workflowId={workflow_id}
            initialData={{
              stepInput: stepInput,
              stepOutput: stepOutput,
            }}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={setCanProceed}
          />
        );
      case 6:
        return (
          <Step6BgmSubtitle
            workflowId={workflow_id}
            initialData={{
              stepInput: stepInput,
              stepOutput: stepOutput,
            }}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={setCanProceed}
          />
        );
      case 7:
        return (
          <Step7Confirm
            workflowId={workflow_id}
            initialData={{
              stepInput: stepInput,
              stepOutput: stepOutput,
            }}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={setCanProceed}
          />
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

  if (!stepInput || !user) {
    return null;
  }

  return (
    <WorkflowLayout
      workflowId={workflow_id}
      currentStep={currentStep}
      workflowState={workflowState}
      onNext={handleNext}
      hideFooter={true} // すべてのステップで独自ボタンを使用
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