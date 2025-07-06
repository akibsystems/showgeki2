'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import type { Step1Json } from '@/types/workflow';

interface Step1StoryInputProps {
  workflowId: string;
  initialData?: Step1Json;
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
  const [isSaving, setIsSaving] = useState(false);
  
  // デバッグ: initialDataの内容を確認
  console.log('[Step1StoryInput] initialData:', initialData);
  
  // フォームの状態管理
  const [formData, setFormData] = useState({
    storyText: initialData?.userInput?.storyText || '',
    characters: initialData?.userInput?.characters || '',
    dramaticTurningPoint: initialData?.userInput?.dramaticTurningPoint || '',
    futureVision: initialData?.userInput?.futureVision || '',
    learnings: initialData?.userInput?.learnings || '',
    totalScenes: initialData?.userInput?.totalScenes || 5,
    settings: initialData?.userInput?.settings || {
      style: 'shakespeare',
      language: 'ja',
    },
  });

  // initialDataが変更されたときにフォームデータを更新
  useEffect(() => {
    if (initialData?.userInput) {
      console.log('[Step1StoryInput] Updating form with initialData.userInput:', initialData.userInput);
      setFormData({
        storyText: initialData.userInput.storyText || '',
        characters: initialData.userInput.characters || '',
        dramaticTurningPoint: initialData.userInput.dramaticTurningPoint || '',
        futureVision: initialData.userInput.futureVision || '',
        learnings: initialData.userInput.learnings || '',
        totalScenes: initialData.userInput.totalScenes || 5,
        settings: initialData.userInput.settings || {
          style: 'shakespeare',
          language: 'ja',
        },
      });
    }
  }, [initialData]);

  // 初期状態とフォーム変更時に検証を実行
  useEffect(() => {
    const valid = 
      formData.storyText.trim().length > 0 &&
      formData.characters.trim().length > 0;
    onUpdate(valid);
  }, [formData.storyText, formData.characters, onUpdate]);

  // 入力検証（ドラマチックな転換点はオプション）
  const isValid = 
    formData.storyText.trim().length > 0 &&
    formData.characters.trim().length > 0;

  // 保存処理
  const saveData = async () => {
    if (!isValid) {
      error('必須項目を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const step1Data: Step1Json = {
        userInput: {
          storyText: formData.storyText,
          characters: formData.characters,
          dramaticTurningPoint: formData.dramaticTurningPoint,
          futureVision: formData.futureVision,
          learnings: formData.learnings,
          totalScenes: formData.totalScenes,
          settings: formData.settings,
        },
        generatedContent: {
          suggestedTitle: '',
          acts: [],
          charactersList: [],
        },
      };

      const response = await fetch(`/api/workflow/${workflowId}/step/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: step1Data }),
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      const result = await response.json();

      // 保存成功後に次へ
      onNext();
    } catch (err) {
      console.error('Failed to save step 1:', err);
      error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 現在のステップから他のステップに移動したかを検知
  useEffect(() => {
    // ページアンマウント時には実行しない
    const mounted = { current: true };
    return () => {
      mounted.current = false;
    };
  }, []);

  // 入力変更ハンドラー
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 有効性をチェックして親コンポーネントに通知
    const newData = { ...formData, [field]: value };
    const valid = 
      newData.storyText.trim().length > 0 &&
      newData.characters.trim().length > 0;
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
              登場人物 <span className="text-red-500">*</span>
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

          {/* ドラマチックな転換点（オプション） */}
          <div>
            <label className="block text-sm font-medium mb-2">
              ドラマチックな転換点（任意）
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
              未来のビジョン（任意）
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

          {/* シーン数の選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              シーン数 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="20"
                value={formData.totalScenes}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setFormData(prev => ({ ...prev, totalScenes: value }));
                }}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                disabled={isSaving}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1</span>
                <span className="text-sm font-medium text-purple-400">
                  {formData.totalScenes}シーン
                </span>
                <span>20</span>
              </div>
              <p className="text-xs text-gray-500">
                物語全体のシーン数を選択してください（デフォルト: 5シーン）
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ヒント */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-blue-400 mb-2">💡 ヒント</h3>
          <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
            <li>具体的な出来事や感情を含めると、より良い脚本が生成されます</li>
            <li>登場人物の性格や関係性を詳しく説明してください</li>
            <li>シェイクスピア風の壮大なドラマに変換されます</li>
          </ul>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex justify-between mt-8">
        <div>{/* ステップ1なので「前へ」ボタンはなし */}</div>
        <button
          onClick={saveData}
          disabled={!isValid || isSaving}
          className={`px-8 py-3 rounded-lg font-medium transition-colors ${
            isValid && !isSaving
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
              保存中...
            </>
          ) : (
            '次へ →'
          )}
        </button>
      </div>
    </div>
  );
}