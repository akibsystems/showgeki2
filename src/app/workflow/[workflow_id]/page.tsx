'use client';

import { use, useEffect, useState, useRef } from 'react';
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
  const [isLoading, setIsLoading] = useState(false); // 初期値をfalseに変更
  const [canProceed, setCanProceed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 前回のステップを記録するためのref
  const prevStepRef = useRef<number | null>(null);

  // URLパラメータからステップ番号を取得（初期値はnull）
  const stepParam = searchParams.get('step');
  const currentStep = stepParam ? parseInt(stepParam, 10) : null;

  // ステップが有効な範囲内かチェック（stepParamが存在する場合のみ）
  useEffect(() => {
    if (currentStep !== null && (currentStep < 1 || currentStep > 7)) {
      router.replace(`/workflow/${workflow_id}?step=1`);
    }
  }, [currentStep, workflow_id, router]);

  // ワークフロー情報を取得し、必要に応じてリダイレクト
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // 初回のみワークフロー情報を取得してリダイレクト判定
    if (!isInitialized) {
      setIsLoading(true); // 初期化中はローディング表示
      const initWorkflow = async () => {
        try {
          const workflowResponse = await fetch(`/api/workflow/${workflow_id}`, {
            headers: {
              'X-User-UID': user.id,
            },
          });
          
          if (!workflowResponse.ok) {
            console.error('Workflow info fetch failed:', {
              status: workflowResponse.status,
              statusText: workflowResponse.statusText,
              url: workflowResponse.url
            });
            throw new Error(`Failed to fetch workflow info: ${workflowResponse.status} ${workflowResponse.statusText}`);
          }
          
          if (workflowResponse.ok) {
            const workflowData = await workflowResponse.json();
            const dbCurrentStep = workflowData.workflow.current_step;
            setWorkflowInfo({ current_step: dbCurrentStep });
            
            // URLにstepパラメータがない場合、データベースのcurrent_stepにリダイレクト
            if (currentStep === null && dbCurrentStep) {
              router.replace(`/workflow/${workflow_id}?step=${dbCurrentStep}`);
              // リダイレクト後もローディング状態を維持
              return;
            }
            
            setIsInitialized(true);
            // URLにstepがある場合は初期化完了後にローディング解除
            if (currentStep !== null) {
              setIsLoading(false);
            }
          }
        } catch (err) {
          console.error('Failed to fetch workflow info - Error details:', {
            error: err,
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
            errorStack: err instanceof Error ? err.stack : undefined,
            workflow_id,
            currentStep,
            user_id: user?.id,
            phase: 'initialization'
          });
          
          // 重大なエラーの場合のみダッシュボードへ
          if (err instanceof Error && (err.message.includes('404') || err.message.includes('401'))) {
            error('ワークフローの読み込みに失敗しました');
            router.push('/dashboard');
          } else {
            console.log('Non-critical error during init, continuing...');
            // 初期化を完了としてマーク（次回リトライ）
            setIsInitialized(true);
            // エラーでもローディング解除
            setIsLoading(false);
          }
        }
      };
      
      initWorkflow();
    }
  }, [workflow_id, currentStep, user, router, error, isInitialized]);

  // ステップデータを取得
  useEffect(() => {
    // 初期化が完了していない、またはcurrentStepがnullの場合はスキップ
    if (!isInitialized || currentStep === null) {
      // 初期化中でもローディング状態を解除（初期化のuseEffectで管理）
      if (!isInitialized && currentStep !== null) {
        setIsLoading(false);
      }
      return;
    }
    
    // 初回ロードかどうかを判定
    const isFirstLoad = prevStepRef.current === null;
    
    // ステップが実際に変更された場合を判定
    const isStepChanged = !isFirstLoad && prevStepRef.current !== currentStep;
    
    if (isStepChanged) {
      // ステップが変更されたときに、古いデータをクリア
      setStepInput(null);
      setStepOutput(null);
    }
    
    // 現在のステップを記録
    prevStepRef.current = currentStep;

    // ユーザーが存在しない場合は早期リターン
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    // 初回ロードでない、ステップが変更されていない、かつデータがすでに存在する場合はスキップ
    if (!isFirstLoad && !isStepChanged && stepInput) {
      console.log('[WorkflowPage] Skip fetch - data already exists for step:', currentStep);
      setIsLoading(false);
      return;
    }

    const fetchWorkflow = async () => {
      console.log('[WorkflowPage] Starting fetchWorkflow for step:', currentStep);
      
      // データがない場合、初回ロード、またはステップが変更された場合のみローディングを表示
      if (!stepInput || isFirstLoad || isStepChanged) {
        setIsLoading(true);
      }

      try {
        // current_stepを更新（ユーザーが訪れたステップを記録）
        fetch(`/api/workflow/${workflow_id}/current-step`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-UID': user.id,
          },
          body: JSON.stringify({ step: currentStep }),
        }).catch((err) => {
          console.log('Failed to update current step:', err);
        });
        
        // StepXInputを取得（workflow-design.mdの仕様に従う）
        const response = await fetch(`/api/workflow/${workflow_id}/step/${currentStep}`, {
          headers: {
            'X-User-UID': user.id,
          },
        });

        if (!response.ok) {
          console.error('Step fetch failed:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url
          });
          throw new Error(`Failed to fetch workflow: ${response.status} ${response.statusText}`);
        }

        const stepInputData = await response.json();
        console.log('[WorkflowPage] Fetched step input:', stepInputData);
        
        // stepInputDataが空でないことを確認
        if (!stepInputData || (typeof stepInputData === 'object' && Object.keys(stepInputData).length === 0)) {
          console.warn('[WorkflowPage] Empty step input data received');
          setStepInput({});  // 空のオブジェクトを設定
        } else {
          setStepInput(stepInputData);
        }
        
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
          console.log(`[WorkflowPage] Looking for ${stepOutColumnName}:`, workflowData.workflow[stepOutColumnName]);
          
          if (workflowData.workflow[stepOutColumnName]) {
            console.log(`[WorkflowPage] Found stepOutput for step ${currentStep}:`, workflowData.workflow[stepOutColumnName]);
            setStepOutput(workflowData.workflow[stepOutColumnName]);
          } else if (currentStep === 1 && stepInputData && Object.keys(stepInputData).length > 0) {
            // Step1でstepOutputがない場合、stepInputをstepOutputとして使用
            setStepOutput({ userInput: stepInputData });
          } else {
            // stepOutputがない場合はnullを設定（空のオブジェクトではなく）
            console.log(`[WorkflowPage] No stepOutput found for step ${currentStep}`);
            setStepOutput(null);
          }
        } else {
          console.warn('Failed to fetch workflow data:', {
            status: workflowResponse.status,
            statusText: workflowResponse.statusText
          });
          // ワークフロー情報が取得できない場合でも、stepInputは使えるので続行
          setStepOutput(null);
        }
      } catch (err) {
        console.error('Failed to fetch workflow - Error details:', {
          error: err,
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          errorStack: err instanceof Error ? err.stack : undefined,
          workflow_id,
          currentStep,
          user_id: user?.id
        });
        
        // 404エラーの場合のみダッシュボードへ
        if (err instanceof Error && err.message.includes('404')) {
          error('ワークフローが見つかりません');
          router.push('/dashboard');
        } else if (err instanceof Error && err.message.includes('401')) {
          error('認証エラーが発生しました');
          router.push('/dashboard');
        } else {
          // その他のエラーは無視（ネットワークエラーなど）
          console.log('Non-critical error, staying on page');
        }
      } finally {
        console.log('[WorkflowPage] Finishing fetchWorkflow for step:', currentStep);
        setIsLoading(false);
      }
    };

    fetchWorkflow();
  }, [workflow_id, currentStep, error, router, user, isInitialized]);

  // 実際に使用するステップ番号（nullの場合は1）
  const effectiveStep = currentStep || 1;

  // ワークフロー状態を計算
  const workflowState: WorkflowState = {
    id: workflow_id,
    currentStep: effectiveStep,
    canProceed,
    canGoBack: effectiveStep > 1,
    completedSteps: workflowInfo
      ? Array.from({ length: workflowInfo.current_step }, (_, i) => i + 1)
      : [],
  };

  // ナビゲーション関数
  const handleNext = () => {
    router.push(`/workflow/${workflow_id}?step=${effectiveStep + 1}`);
  };

  const handleBack = () => {
    router.push(`/workflow/${workflow_id}?step=${effectiveStep - 1}`);
  };

  // ステップコンポーネントをレンダリング
  const renderStepComponent = () => {
    if (stepInput === null) return null;

    switch (effectiveStep) {
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

  if (!user) {
    console.warn('[WorkflowPage] No user available');
    return null;
  }
  
  // stepInputがnullの場合のみ非表示（空のオブジェクトは許可）
  if (stepInput === null) {
    console.warn('[WorkflowPage] Step input not loaded yet:', { 
      currentStep,
      isInitialized
    });
    return null;
  }

  return (
    <WorkflowLayout
      workflowId={workflow_id}
      currentStep={effectiveStep}
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