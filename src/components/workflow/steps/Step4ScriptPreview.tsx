'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
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
  isLoading 
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
}) {
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isEditingDialogue, setIsEditingDialogue] = useState<number | null>(null);

  return (
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

        {/* 画像プロンプト */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">
              画像プロンプト
            </label>
            <button
              onClick={() => setIsEditingImage(!isEditingImage)}
              className="text-sm text-purple-400 hover:text-purple-300"
              disabled={isLoading}
            >
              {isEditingImage ? '完了' : '編集'}
            </button>
          </div>
          {isEditingImage ? (
            <textarea
              value={scene.imagePrompt}
              onChange={(e) => onImagePromptChange(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
              disabled={isLoading}
            />
          ) : (
            <div className="p-3 bg-gray-700 rounded-md text-gray-300 text-sm">
              {scene.imagePrompt}
            </div>
          )}
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

  // initialDataが変更されたときにデータを更新
  useEffect(() => {
    console.log('[Step4ScriptPreview] initialData changed:', initialData);
    
    if (initialData) {
      // シーンデータの設定
      const newScenes = initialData.stepOutput?.userInput?.scenes || 
                       initialData.stepInput?.scenes || 
                       [];
      console.log('[Step4ScriptPreview] Setting scenes:', newScenes);
      
      // シーンデータがない場合は生成中
      if (newScenes.length === 0 && !initialData.stepOutput?.userInput?.scenes) {
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

  // 保存処理
  const handleSave = async () => {
    if (!user) return;

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
              {act.scenes.map((scene: any) => (
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
                />
              ))}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">シーンデータがありません</p>
          </div>
        )}
      </div>

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