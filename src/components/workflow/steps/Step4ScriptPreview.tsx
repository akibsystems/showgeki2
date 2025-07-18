'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
import { useWorkflowImagePreview } from '@/hooks/useWorkflowImagePreview';
import PreviewButton from '@/components/preview/PreviewButton';
import ImagePreview from '@/components/preview/ImagePreview';
import type { Step4Input, Step4Output } from '@/types/workflow';

interface Step4ScriptPreviewProps {
  workflowId: string;
  initialData?: {
    stepInput: Step4Input;
    stepOutput?: Step4Output;
  };
  onNext: () => void;
  onBack: () => void;
  onUpdate: (canProceed: boolean) => void;
}

// シーンカードコンポーネント
function SceneCard({
  scene,
  actNumber,
  actTitle,
  onImagePromptChange,
  onDialogueChange,
  isLoading,
  previewImage,
  onGeneratePreview,
  beatIndex,
  isRegenerating,
  isBulkGenerating
}: {
  scene: {
    id: string;
    sceneNumber: number;
    title: string;
    imagePrompt: string;
    dialogue: Array<{
      speaker: string;
      text: string;
    }>;
  };
  actNumber: number;
  actTitle: string;
  onImagePromptChange: (value: string) => void;
  onDialogueChange: (index: number, field: 'speaker' | 'text', value: string) => void;
  isLoading: boolean;
  previewImage?: { url: string; prompt: string } | null;
  onGeneratePreview: (beatIndex: number, imagePrompt: string) => void;
  beatIndex: number;
  isRegenerating: boolean;
  isBulkGenerating: boolean;
}) {
  const [isEditingDialogue, setIsEditingDialogue] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardContent className="p-6">
          {/* シーンヘッダー */}
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">
              第{actNumber}幕「{actTitle}」
            </div>
            <h3 className="text-lg font-semibold text-gray-100">
              第{scene.sceneNumber}場：{scene.title}
            </h3>
          </div>

          {/* 画像プロンプトと画像プレビュー */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                画像プロンプト
              </label>
              <button
                onClick={() => onGeneratePreview(beatIndex, scene.imagePrompt)}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || isRegenerating || isBulkGenerating}
              >
                {isRegenerating ? '再生成中...' : previewImage ? '再生成' : '画像生成'}
              </button>
            </div>

            {/* レスポンシブレイアウト: PC (横並び) / モバイル (縦並び) */}
            <div className="flex flex-col lg:flex-row lg:gap-4">
              {/* PC: 左側に画像、モバイル: 最後に画像 */}
              <div className="lg:w-1/3 lg:order-1 order-2">
                {isRegenerating || (isBulkGenerating && !previewImage) ? (
                  <div className="bg-gray-700 rounded-md h-32 lg:h-40 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-xs text-gray-400">{isRegenerating ? '再生成中...' : '生成中...'}</p>
                    </div>
                  </div>
                ) : previewImage ? (
                  <div
                    className="bg-gray-700 rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setIsModalOpen(true)}
                    title="クリックして拡大"
                  >
                    <img
                      src={`${previewImage.url}?t=${Date.now()}`}
                      alt={`Scene ${scene.sceneNumber} preview`}
                      className="w-full h-32 lg:h-40 object-cover"
                      onError={(e) => {
                        console.error('Failed to load preview image:', previewImage.url)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-gray-700 rounded-md h-32 lg:h-40 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs">プレビュー画像</p>
                    </div>
                  </div>
                )}
              </div>

              {/* プロンプトテキスト */}
              <div className="lg:w-2/3 lg:order-2 order-1 mb-4 lg:mb-0">
                <textarea
                  value={scene.imagePrompt}
                  onChange={(e) => onImagePromptChange(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={3}
                  disabled={isLoading}
                  placeholder="このシーンの画像をどのように描写するか入力してください..."
                />
              </div>
            </div>
          </div>

          {/* 台詞 - 最初の1つのみ表示 */}
          {scene.dialogue.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">台詞</h4>
              <div className="bg-gray-700 rounded-md p-3">
                {isEditingDialogue === 0 ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={scene.dialogue[0].speaker}
                      onChange={(e) => onDialogueChange(0, 'speaker', e.target.value)}
                      placeholder="話者"
                      className="w-full px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={isLoading}
                    />
                    <textarea
                      value={scene.dialogue[0].text}
                      onChange={(e) => onDialogueChange(0, 'text', e.target.value)}
                      placeholder="セリフ"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      rows={2}
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => setIsEditingDialogue(null)}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      完了
                    </button>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => setIsEditingDialogue(0)}
                  >
                    <div className="font-medium text-purple-300 text-sm mb-1">
                      {scene.dialogue[0].speaker}
                    </div>
                    <div className="text-gray-200">
                      {scene.dialogue[0].text}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 画像拡大モーダル */}
      {isModalOpen && previewImage && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            {/* モーダルコンテンツ */}
            <div
              className="relative max-w-4xl max-h-[90vh] bg-gray-900 rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 閉じるボタン */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white transition-colors"
                aria-label="閉じる"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* 画像 */}
              <img
                src={`${previewImage.url}?t=${Date.now()}`}
                alt={`Scene ${scene.sceneNumber} preview (enlarged)`}
                className="w-full h-full object-contain"
                style={{ maxHeight: '85vh' }}
              />

              {/* キャプション */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent p-4">
                <p className="text-sm text-gray-300">
                  第{scene.sceneNumber}場：{scene.title}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function Step4ScriptPreview({
  workflowId,
  initialData,
  onNext,
  onBack,
  onUpdate,
}: Step4ScriptPreviewProps) {
  const { error } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [regeneratingBeats, setRegeneratingBeats] = useState<Set<number>>(new Set());

  // 前回のinitialDataを追跡（データの変更を検出するため）
  const prevInitialDataRef = useRef<typeof initialData>(undefined);

  // シーンデータの管理
  const [scenes, setScenes] = useState<any[]>([]);

  // 幕の情報を管理
  const [acts, setActs] = useState<any[]>([]);

  // データが読み込まれたかどうか
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  // データが生成中かどうか
  const [isGenerating, setIsGenerating] = useState(false);
  // ポーリング間隔
  const [pollingCount, setPollingCount] = useState(0);

  // 画像プレビュー機能
  const imagePreview = useWorkflowImagePreview({
    workflowId,
    userUid: user?.id || '',
    onStatusChange: (status) => {
      console.log('Preview status changed:', status)
    }
  });

  // 初回ロード時に既存の画像データを取得
  useEffect(() => {
    if (user?.id && workflowId && imagePreview.refreshStatus) {
      imagePreview.refreshStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, workflowId]);

  // 初回ロード時にプレビューがない場合は自動生成
  const hasInitiallyGeneratedRef = useRef(false); // useRefで永続化

  useEffect(() => {
    if (
      user?.id &&
      workflowId &&
      isDataLoaded &&
      scenes.length > 0 &&
      !hasInitiallyGeneratedRef.current && // refを使用
      imagePreview.status === 'not_started' &&
      !imagePreview.previewData
    ) {
      console.log('[Step4ScriptPreview] Auto-starting preview generation');
      hasInitiallyGeneratedRef.current = true; // 即座にフラグを立てる

      // 初期ロード時はプロンプトを保存せずに画像生成のみ実行
      // （保存するとStep5の処理が自動的に走ってしまうため）
      imagePreview.generatePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, workflowId, isDataLoaded, scenes.length, imagePreview.status]);

  // initialDataが変更されたときにデータを更新
  useEffect(() => {
    // 前回のデータと比較して、実際に変更があった場合のみ更新
    const hasDataChanged = prevInitialDataRef.current?.stepOutput !== initialData?.stepOutput ||
                          prevInitialDataRef.current?.stepInput !== initialData?.stepInput;

    if (hasDataChanged && initialData) {
      console.log('[Step4ScriptPreview] Initial data changed, updating form');

      // シーンデータの設定（stepOutputがある場合は編集されたデータを優先）
      let newScenes = [];

      // stepOutputに保存されたデータがある場合
      if (initialData.stepOutput?.userInput?.scenes && initialData.stepOutput.userInput.scenes.length > 0) {
        // 保存されたプロンプトとstepInputのシーンデータをマージ
        const savedScenes = initialData.stepOutput.userInput.scenes;
        const inputScenes = initialData.stepInput?.scenes || [];

        newScenes = inputScenes.map((inputScene: any) => {
          const savedScene = savedScenes.find((s: any) => s.id === inputScene.id);
          return savedScene ? {
            ...inputScene,
            imagePrompt: savedScene.imagePrompt, // 保存されたプロンプトを使用
            dialogue: savedScene.dialogue || inputScene.dialogue
          } : inputScene;
        });
      } else {
        // 初回の場合はstepInputのデータを使用
        newScenes = initialData.stepInput?.scenes || [];
      }

      console.log('[Step4ScriptPreview] Setting scenes:', newScenes);

      // シーンデータがない場合は生成中
      if (newScenes.length === 0) {
        setIsGenerating(true);
      } else {
        setScenes(newScenes);
        setIsGenerating(false);
      }

      // 幕データの設定
      const newActs = initialData.stepInput?.acts || [];
      console.log('[Step4ScriptPreview] Setting acts:', newActs);
      setActs(newActs);

      // データ読み込み完了
      setIsDataLoaded(true);
      
      // 現在のデータを記録
      prevInitialDataRef.current = initialData;
    }
  }, [initialData]);

  // データ生成中の場合、ポーリングでデータを取得
  useEffect(() => {
    if (!isGenerating || !user) return;

    const pollData = async () => {
      try {
        const response = await fetch(`/api/workflow/${workflowId}/step/4`, {
          headers: {
            'X-User-UID': user.id,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.stepInput?.scenes && data.stepInput.scenes.length > 0) {
            setScenes(data.stepInput.scenes);
            setActs(data.stepInput.acts || []);
            setIsGenerating(false);
            console.log('[Step4ScriptPreview] Data generated successfully');
          } else {
            // まだ生成中なので、次のポーリングをスケジュール
            setPollingCount(prev => prev + 1);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // 3秒ごとにポーリング（最大20回 = 1分）
    const timer = setTimeout(() => {
      if (pollingCount < 20) {
        pollData();
      } else {
        setIsGenerating(false);
        error('台本生成がタイムアウトしました');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isGenerating, pollingCount, workflowId, user, error]);

  // 常に次へ進める（編集はオプション）
  useEffect(() => {
    onUpdate(true);
  }, [onUpdate]);

  // 画像プロンプトの変更
  const handleImagePromptChange = (sceneId: string, newPrompt: string) => {
    setScenes(scenes.map(scene =>
      scene.id === sceneId
        ? { ...scene, imagePrompt: newPrompt }
        : scene
    ));
  };

  // 対話の変更
  const handleDialogueChange = (
    sceneId: string,
    dialogueIndex: number,
    field: 'speaker' | 'text',
    value: string
  ) => {
    setScenes(scenes.map(scene => {
      if (scene.id !== sceneId) return scene;

      const newDialogue = [...scene.dialogue];
      newDialogue[dialogueIndex] = {
        ...newDialogue[dialogueIndex],
        [field]: value
      };

      return { ...scene, dialogue: newDialogue };
    }));
  };

  // 個別画像生成処理
  const handleSingleImageGenerate = async (beatIndex: number, imagePrompt: string) => {
    if (!user) return;

    // 再生成中フラグをセット
    setRegeneratingBeats(prev => new Set(prev).add(beatIndex));

    try {
      // まず、更新されたプロンプトを保存
      await saveUpdatedPrompts();

      const response = await fetch(`/api/workflow/${workflowId}/preview-images/${beatIndex}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify({ imagePrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        error(errorData.error || 'Failed to regenerate image');
        setRegeneratingBeats(prev => {
          const newSet = new Set(prev);
          newSet.delete(beatIndex);
          return newSet;
        });
        return;
      }

      // ポーリングを開始して状態を更新
      startPollingForUpdate(beatIndex);
    } catch (err) {
      console.error('Failed to regenerate single image:', err);
      error('画像の再生成に失敗しました');
      setRegeneratingBeats(prev => {
        const newSet = new Set(prev);
        newSet.delete(beatIndex);
        return newSet;
      });
    }
  };

  // プロンプトの変更を保存
  const saveUpdatedPrompts = async () => {
    if (!user) return;

    try {
      // workflow-design.mdの仕様に従い、Step4Outputを送信
      const step4Output: Step4Output = {
        userInput: {
          scenes: scenes.map(scene => ({
            id: scene.id,
            imagePrompt: scene.imagePrompt,
            dialogue: scene.dialogue,
            customImage: scene.customImage
          }))
        },
      };

      const response = await fetch(`/api/workflow/${workflowId}/step/4`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify(step4Output),
      });

      if (!response.ok) {
        console.error('Failed to save updated prompts');
      }
    } catch (err) {
      console.error('Failed to save prompts:', err);
    }
  };

  // ポーリングで画像の更新を監視
  const startPollingForUpdate = (beatIndex: number) => {
    let pollCount = 0;
    const maxPolls = 30; // 最大30回（60秒）

    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        await imagePreview.refreshStatus();

        // 処理が完了または失敗したらポーリングを停止
        if (imagePreview.status === 'completed' || imagePreview.status === 'failed' || pollCount >= maxPolls) {
          clearInterval(pollInterval);
          // 再生成中フラグをクリア
          setRegeneratingBeats(prev => {
            const newSet = new Set(prev);
            newSet.delete(beatIndex);
            return newSet;
          });

          if (imagePreview.status === 'failed') {
            error('画像の生成に失敗しました');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        clearInterval(pollInterval);
        // エラー時も再生成中フラグをクリア
        setRegeneratingBeats(prev => {
          const newSet = new Set(prev);
          newSet.delete(beatIndex);
          return newSet;
        });
      }
    }, 2000); // 2秒ごとにチェック
  };

  // データが変更されているかチェック
  const hasDataChanged = () => {
    const savedData = initialData?.stepOutput?.userInput;
    if (!savedData) return true; // 保存データがない場合は変更ありとみなす
    
    const savedScenes = savedData.scenes || [];
    if (scenes.length !== savedScenes.length) return true;
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const savedScene = savedScenes.find((s: any) => s.id === scene.id);
      
      if (!savedScene ||
          scene.imagePrompt !== savedScene.imagePrompt ||
          scene.customImage !== savedScene.customImage) {
        return true;
      }
      
      // dialogueの比較
      if (scene.dialogue?.length !== savedScene.dialogue?.length) return true;
      
      for (let j = 0; j < (scene.dialogue?.length || 0); j++) {
        const dialogue = scene.dialogue[j];
        const savedDialogue = savedScene.dialogue[j];
        
        if (!savedDialogue ||
            dialogue.speaker !== savedDialogue.speaker ||
            dialogue.text !== savedDialogue.text) {
          return true;
        }
      }
    }
    
    return false;
  };

  // 保存処理
  const handleSave = async () => {
    if (!user) return;

    // データが変更されていない場合はスキップ
    if (!hasDataChanged()) {
      console.log('[Step4ScriptPreview] No changes detected, skipping save');
      onNext();
      return;
    }

    setIsLoading(true);
    try {
      // workflow-design.mdの仕様に従い、Step4Outputを送信
      const step4Output: Step4Output = {
        userInput: {
          scenes: scenes.map(scene => ({
            id: scene.id,
            imagePrompt: scene.imagePrompt,
            dialogue: scene.dialogue,
            customImage: scene.customImage
          }))
        },
      };

      const response = await fetch(`/api/workflow/${workflowId}/step/4`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify(step4Output),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Step 4 save failed:', response.status, errorData);
        throw new Error(`Failed to save data: ${response.status} ${errorData}`);
      }

      onNext();
    } catch (err) {
      console.error('Failed to save step 4:', err);
      error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 幕ごとにシーンをグループ化
  const scenesByAct = acts.map(act => ({
    ...act,
    scenes: scenes.filter(scene => scene.actNumber === act.actNumber)
  }));

  // データ読み込み中の表示
  if (!isDataLoaded) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">台本データを読み込んでいます...</p>
          </div>
        </div>
      </div>
    );
  }

  // データ生成中の表示
  if (isGenerating) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
            <h3 className="text-xl font-semibold text-white mb-2">台本を生成中...</h3>
            <p className="text-gray-400 mb-4">
              AI がキャラクター設定を元に台本を作成しています
            </p>
            <div className="flex justify-center gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            {pollingCount > 10 && (
              <p className="text-sm text-gray-500 mt-4">
                生成に時間がかかっています...もう少しお待ちください
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // データが読み込まれたが、シーンがない場合
  if (scenes.length === 0 && !isGenerating) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
        <div className="text-center py-8">
          <p className="text-gray-400">台本データが見つかりません</p>
          <button
            onClick={onBack}
            className="mt-4 px-6 py-3 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all"
          >
            ← 戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">台本と画像の確認</h2>
        <p className="text-gray-400">
          生成された台本を確認し、必要に応じて編集してください
        </p>
      </div>


      {/* タイトル表示 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-center">
            {initialData?.stepInput?.title || 'タイトル'}
          </h3>
        </CardContent>
      </Card>

      {/* シーン一覧 */}
      <div>
        {scenesByAct.length > 0 ? (
          scenesByAct.map((act) => (
            <div key={act.actNumber} className="mb-8">
              {/* 幕タイトル */}
              <div className="mb-4 px-2">
                <h3 className="text-lg font-semibold text-purple-300">
                  第{act.actNumber}幕：{act.actTitle}
                </h3>
              </div>

              {/* この幕のシーン */}
              {act.scenes.map((scene: any, sceneIndex: number) => {
                // シーンに対応するプレビュー画像を取得（scene.sceneNumber - 1 でbeatIndexと合わせる）
                const beatIndex = scene.sceneNumber ? scene.sceneNumber - 1 : sceneIndex
                const scenePreviewImage = imagePreview.previewData?.images?.find(
                  (img) => img.beatIndex === beatIndex
                )

                return (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    actNumber={act.actNumber}
                    actTitle={act.actTitle}
                    onImagePromptChange={(value) => handleImagePromptChange(scene.id, value)}
                    onDialogueChange={(index, field, value) =>
                      handleDialogueChange(scene.id, index, field, value)
                    }
                    isLoading={isLoading}
                    previewImage={scenePreviewImage ? {
                      url: scenePreviewImage.url,
                      prompt: scenePreviewImage.prompt
                    } : null}
                    onGeneratePreview={handleSingleImageGenerate}
                    beatIndex={beatIndex}
                    isRegenerating={regeneratingBeats.has(beatIndex)}
                    isBulkGenerating={imagePreview.status === 'processing'}
                  />
                )
              })}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">シーンデータがありません</p>
          </div>
        )}
      </div>

      {/* 全体画像プレビューボタン */}
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-1">画像プレビュー一括生成</h3>
              <p className="text-sm text-gray-400">すべてのシーンの画像を一度に生成します</p>
            </div>
            <PreviewButton
              status={imagePreview.status}
              isLoading={imagePreview.isLoading}
              onGenerate={async () => {
                // 一括生成前にプロンプトを保存
                await saveUpdatedPrompts();
                imagePreview.generatePreview();
              }}
              disabled={!user?.id || scenes.length === 0}
            />
          </div>
          {imagePreview.error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
              <p className="text-red-300 text-sm">{imagePreview.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-3 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all"
        >
          ← 戻る
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 py-3 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all"
        >
          {isLoading ? '保存中...' : '次へ →'}
        </button>
      </div>
    </div>
  );
}