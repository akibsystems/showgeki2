'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
import type { Step1Input, Step1Output } from '@/types/workflow';

interface Step1StoryInputProps {
  workflowId: string;
  initialData?: {
    stepInput: Step1Input;
    stepOutput?: Step1Output;
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
  
  // デバッグ: initialDataの内容を確認
  console.log('[Step1StoryInput] initialData:', initialData);
  
  // フォームの状態管理
  const [formData, setFormData] = useState({
    storyText: initialData?.stepOutput?.userInput?.storyText || '',
    characters: initialData?.stepOutput?.userInput?.characters || '',
    dramaticTurningPoint: initialData?.stepOutput?.userInput?.dramaticTurningPoint || '',
    futureVision: initialData?.stepOutput?.userInput?.futureVision || '',
    learnings: initialData?.stepOutput?.userInput?.learnings || '',
    totalScenes: initialData?.stepOutput?.userInput?.totalScenes || 5,
    settings: initialData?.stepOutput?.userInput?.settings || {
      style: 'shakespeare',
      language: 'ja',
    },
  });

  // initialDataが変更されたときにフォームデータを更新
  useEffect(() => {
    if (initialData?.stepOutput?.userInput) {
      console.log('[Step1StoryInput] Updating form with initialData.stepOutput.userInput:', initialData.stepOutput.userInput);
      setFormData({
        storyText: initialData.stepOutput.userInput.storyText || '',
        characters: initialData.stepOutput.userInput.characters || '',
        dramaticTurningPoint: initialData.stepOutput.userInput.dramaticTurningPoint || '',
        futureVision: initialData.stepOutput.userInput.futureVision || '',
        learnings: initialData.stepOutput.userInput.learnings || '',
        totalScenes: initialData.stepOutput.userInput.totalScenes || 5,
        settings: initialData.stepOutput.userInput.settings || {
          style: 'shakespeare',
          language: 'ja',
        },
      });
    }
  }, [initialData]);

  // フォームが有効かどうかをチェック
  const isValid = 
    formData.storyText.trim().length > 0 &&
    formData.characters.trim().length > 0;

  // 初期状態で親コンポーネントに有効性を通知
  useEffect(() => {
    onUpdate(isValid);
  }, [isValid, onUpdate]);

  // 保存処理
  const handleSave = async () => {
    if (!isValid || !user) {
      error('必須項目を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      // API呼び出し
      const response = await fetch(`/api/workflow/${workflowId}/step/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify({ 
          data: {
            storyText: formData.storyText,
            characters: formData.characters,
            dramaticTurningPoint: formData.dramaticTurningPoint,
            futureVision: formData.futureVision,
            learnings: formData.learnings,
            totalScenes: formData.totalScenes,
            settings: formData.settings,
          } 
        }),
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
  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 有効性をチェックして親コンポーネントに通知
    const newData = { ...formData, [field]: value };
    const valid = 
      (typeof newData.storyText === 'string' && newData.storyText.trim().length > 0) &&
      (typeof newData.characters === 'string' && newData.characters.trim().length > 0);
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

          {/* 学び（オプション） */}
          <div>
            <label className="block text-sm font-medium mb-2">
              学び（任意）
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

          {/* 詳細設定（折りたたみ） */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-gray-300 hover:text-white">
              詳細設定 ▼
            </summary>
            <div className="mt-4 space-y-4">
              {/* スタイル設定 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  スタイル
                </label>
                <select
                  value={formData.settings.style}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, style: e.target.value }
                  }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isSaving}
                >
                  <option value="shakespeare">シェイクスピア風</option>
                  <option value="modern">現代風</option>
                  <option value="fairytale">童話風</option>
                </select>
              </div>

              {/* 言語設定 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  言語
                </label>
                <select
                  value={formData.settings.language}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, language: e.target.value }
                  }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isSaving}
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </details>
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