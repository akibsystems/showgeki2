'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
import type { Step3Input, Step3Output } from '@/types/workflow';
import { IMAGE_STYLE_PRESETS } from '@/types/workflow';

interface Step3CharacterStyleProps {
  workflowId: string;
  initialData?: {
    stepInput: Step3Input;
    stepOutput?: Step3Output;
  };
  onNext: () => void;
  onBack: () => void;
  onUpdate: (canProceed: boolean) => void;
}

export default function Step3CharacterStyle({
  workflowId,
  initialData,
  onNext,
  onBack,
  onUpdate,
}: Step3CharacterStyleProps) {
  const { error } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // デバッグ: initialDataの内容を確認
  console.log('[Step3CharacterStyle] initialData:', initialData);

  // フォームの状態管理
  const [characters, setCharacters] = useState<Array<{
    id: string;
    name: string;
    description: string;
    faceReference?: string;
  }>>(
    initialData?.stepOutput?.userInput?.characters || 
    initialData?.stepInput?.detailedCharacters?.map(char => ({
      id: char.id,
      name: char.name,
      description: `${char.personality}\n${char.visualDescription}`,
    })) || 
    []
  );

  const [imageStyle, setImageStyle] = useState({
    preset: initialData?.stepOutput?.userInput?.imageStyle?.preset || 'anime',
    customPrompt: initialData?.stepOutput?.userInput?.imageStyle?.customPrompt || '',
  });

  // initialDataが変更されたときにフォームデータを更新
  useEffect(() => {
    if (initialData?.stepOutput?.userInput) {
      console.log('[Step3CharacterStyle] Updating form with stepOutput.userInput');
      setCharacters(initialData.stepOutput.userInput.characters || []);
      setImageStyle({
        preset: initialData.stepOutput.userInput.imageStyle?.preset || 'anime',
        customPrompt: initialData.stepOutput.userInput.imageStyle?.customPrompt || '',
      });
    } else if (initialData?.stepInput?.detailedCharacters) {
      console.log('[Step3CharacterStyle] Updating form with stepInput.detailedCharacters');
      setCharacters(
        initialData.stepInput.detailedCharacters.map(char => ({
          id: char.id,
          name: char.name,
          description: `${char.personality}\n${char.visualDescription}`,
        }))
      );
    }
  }, [initialData]);

  // 常に有効（必須フィールドなし）
  useEffect(() => {
    onUpdate(true);
  }, [onUpdate]);

  // キャラクターの説明を変更
  const handleCharacterDescriptionChange = (characterId: string, description: string) => {
    setCharacters(prev => 
      prev.map(char => 
        char.id === characterId 
          ? { ...char, description }
          : char
      )
    );
  };

  // 画像アップロード処理（将来実装）
  const handleImageUpload = async (characterId: string, file: File) => {
    // TODO: 画像アップロード実装
    console.log('Image upload not implemented yet:', characterId, file);
    error('画像アップロード機能は準備中です');
  };

  // 保存処理
  const handleSave = async () => {
    if (!user) {
      error('認証が必要です');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/workflow/${workflowId}/step/3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify({
          data: {
            characters,
            imageStyle,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      onNext();
    } catch (err) {
      console.error('Failed to save step 3:', err);
      error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">キャラクター & 画風設定</h2>
        <p className="text-gray-400">
          登場人物の詳細と画風を設定します
        </p>
      </div>

      {/* 作品タイトル */}
      {initialData?.stepInput?.title && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">作品タイトル</h3>
            <p className="text-xl text-gray-300">{initialData.stepInput.title}</p>
          </CardContent>
        </Card>
      )}

      {/* キャラクター設定 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">登場人物設定</h3>
        
        {characters.map((character) => (
          <Card key={character.id} className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h4 className="text-lg font-medium">{character.name}</h4>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          handleImageUpload(character.id, file);
                        }
                      };
                      input.click();
                    }}
                    className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    顔画像をアップロード
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    キャラクター説明
                  </label>
                  <textarea
                    value={character.description}
                    onChange={(e) => handleCharacterDescriptionChange(character.id, e.target.value)}
                    placeholder="性格や外見の特徴を入力..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    disabled={isLoading}
                  />
                </div>

                {character.faceReference && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">顔参照画像</p>
                    <img 
                      src={character.faceReference} 
                      alt={`${character.name}の顔参照`}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 画風設定 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">画風設定</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                プリセットスタイル
              </label>
              <select
                value={imageStyle.preset}
                onChange={(e) => setImageStyle(prev => ({ ...prev, preset: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
              >
                {Object.entries(IMAGE_STYLE_PRESETS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {key === 'anime' && 'アニメ風'}
                    {key === 'watercolor' && '水彩画風'}
                    {key === 'oil' && '油絵風'}
                    {key === 'comic' && 'コミック風'}
                    {key === 'realistic' && 'リアリスティック'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-2">
                {IMAGE_STYLE_PRESETS[imageStyle.preset as keyof typeof IMAGE_STYLE_PRESETS]}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                カスタムプロンプト（任意）
              </label>
              <textarea
                value={imageStyle.customPrompt}
                onChange={(e) => setImageStyle(prev => ({ ...prev, customPrompt: e.target.value }))}
                placeholder="追加のスタイル指定があれば入力..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex justify-between">
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