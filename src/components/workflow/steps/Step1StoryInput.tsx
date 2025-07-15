'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
import type { Step1Input, Step1Output } from '@/types/workflow';

interface Step1StoryInputProps {
  workflowId: string;
  initialData?: {
    stepInput: any; // すべてのデータがstepInputに含まれる
    stepOutput?: Step1Output; // 後方互換性のため残す
  };
  onNext: () => void;
  onUpdate: (canProceed: boolean) => void;
}

export default function Step1StoryInput({
  workflowId,
  initialData,
  onNext,
  onUpdate,
}: Step1StoryInputProps) {
  const { error } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // デバッグログ
  console.log("Step1StoryInput initialData:", {
    hasInitialData: !!initialData,
    hasStepInput: !!initialData?.stepInput,
    stepInput: initialData?.stepInput
  });

  // オプション項目に既存の値があるかチェック
  const hasOptionalData = Boolean(
    initialData?.stepInput?.dramaticTurningPoint ||
    initialData?.stepInput?.futureVision ||
    initialData?.stepInput?.learnings
  );

  const [showOptionalFields, setShowOptionalFields] = useState(hasOptionalData);

  // フォームの状態管理
  // stepInputにすべてのデータが含まれている
  const [formData, setFormData] = useState({
    storyText: initialData?.stepInput?.storyText || '',
    characters: initialData?.stepInput?.characters || '',
    dramaticTurningPoint: initialData?.stepInput?.dramaticTurningPoint || '',
    futureVision: initialData?.stepInput?.futureVision || '',
    learnings: initialData?.stepInput?.learnings || '',
    totalScenes: initialData?.stepInput?.totalScenes || 5,
    settings: initialData?.stepInput?.settings || {
      style: 'shakespeare',
      language: 'ja',
    },
  });

  // initialDataが変更されたときにフォームデータを更新
  useEffect(() => {
    if (initialData?.stepInput) {
      setFormData({
        storyText: initialData.stepInput.storyText || '',
        characters: initialData.stepInput.characters || '',
        dramaticTurningPoint: initialData.stepInput.dramaticTurningPoint || '',
        futureVision: initialData.stepInput.futureVision || '',
        learnings: initialData.stepInput.learnings || '',
        totalScenes: initialData.stepInput.totalScenes || 5,
        settings: initialData.stepInput.settings || {
          style: 'shakespeare',
          language: 'ja',
        },
      });
    }
  }, [initialData]);

  // フォームが有効かどうかをチェック
  const isValid =
    formData.storyText.trim().length > 0;

  // 初期状態で親コンポーネントに有効性を通知
  useEffect(() => {
    onUpdate(isValid);
  }, [isValid, onUpdate]);

  // 保存処理
  const handleSave = async () => {
    if (!isValid || !user) {
      error('ストーリー本文を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      // workflow-design.mdの仕様に従い、Step1Outputを送信
      const step1Output: Step1Output = {
        userInput: {
          storyText: formData.storyText,
          characters: formData.characters,
          dramaticTurningPoint: formData.dramaticTurningPoint,
          futureVision: formData.futureVision,
          learnings: formData.learnings,
          totalScenes: formData.totalScenes,
          settings: formData.settings,
        }
      };

      const response = await fetch(`/api/workflow/${workflowId}/step/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify(step1Output),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

        // エラーの詳細を表示
        if (errorData.error) {
          error(errorData.error);
          if (errorData.details) {
            console.error('詳細:', errorData.details);
          }
        } else {
          error('保存に失敗しました。時間をおいて再度お試しください。');
        }

        setIsSaving(false);
        return;
      }

      const result = await response.json();
      console.log("@@@ Step1StoryInput", result);

      // 保存成功後に次へ
      onNext();
    } catch (err) {
      console.error('Failed to save step 1:', err);
      error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };


  // 入力変更ハンドラー
  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // 有効性をチェックして親コンポーネントに通知
    const newData = { ...formData, [field]: value };
    const valid =
      (typeof newData.storyText === 'string' && newData.storyText.trim().length > 0);
    onUpdate(valid);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #a855f7;
          border-radius: 50%;
          cursor: pointer;
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #a855f7;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
        
        input[type="range"]::-webkit-slider-track {
          background: #374151;
          border-radius: 4px;
        }
        
        input[type="range"]::-moz-range-track {
          background: #374151;
          border-radius: 4px;
        }
      `}</style>
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">ストーリーを教えてください</h2>
        <p className="text-gray-400">
          あなたの物語をシェイクスピア風の5幕構成に変換します
        </p>
      </div>

      {/* 入力フォーム */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* ストーリー本文 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              ストーリー本文 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.storyText}
              onChange={(e) => handleChange('storyText', e.target.value)}
              placeholder="あなたの物語を詳しく教えてください..."
              rows={8}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500 mt-1">
              現在: {formData.storyText.length}文字
            </p>
          </div>

          {/* 登場人物 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              登場人物（任意）
            </label>
            <textarea
              value={formData.characters}
              onChange={(e) => handleChange('characters', e.target.value)}
              placeholder="主人公や重要な登場人物について説明してください..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500 mt-1">
              現在: {formData.characters.length}文字
            </p>
          </div>

          {/* オプション項目トグル */}
          <div className="border-t border-gray-700 pt-6">
            <button
              type="button"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
              disabled={isSaving}
            >
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${showOptionalFields ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium">詳細設定（任意）</span>
            </button>
          </div>

          {/* オプション項目 */}
          {showOptionalFields && (
            <div className="space-y-6 mt-6">
              {/* ドラマチックな転換点（オプション） */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  ドラマチックな転換点
                </label>
                <input
                  type="text"
                  value={formData.dramaticTurningPoint}
                  onChange={(e) => handleChange('dramaticTurningPoint', e.target.value)}
                  placeholder="物語の中で最も重要な転換点は？"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isSaving}
                />
              </div>

              {/* 未来のビジョン（オプション） */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  未来のビジョン
                </label>
                <input
                  type="text"
                  value={formData.futureVision}
                  onChange={(e) => handleChange('futureVision', e.target.value)}
                  placeholder="物語に含まれる未来的な要素があれば..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isSaving}
                />
              </div>

              {/* 学び（オプション） */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  学び
                </label>
                <input
                  type="text"
                  value={formData.learnings}
                  onChange={(e) => handleChange('learnings', e.target.value)}
                  placeholder="物語を通して伝えたいメッセージは？"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isSaving}
                />
              </div>
            </div>
          )}

          {/* シーン数設定 */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">
                全体のシーン数
              </label>
              <span className="text-xl font-bold text-purple-400">
                {formData.totalScenes}
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="1"
                max="20"
                value={formData.totalScenes}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  handleChange('totalScenes', value);
                }}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                disabled={isSaving}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              シーン数が多いほど、より詳細な物語が生成されます
            </p>
          </div>

        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all
            ${isValid && !isSaving
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isSaving ? '保存中...' : '次へ →'}
        </button>
      </div>
    </div>
  );
}