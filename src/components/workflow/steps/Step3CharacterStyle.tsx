'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
import type { Step3Input, Step3Output } from '@/types/workflow';
import { IMAGE_STYLE_PRESETS } from '@/types/workflow';
import ImageModal from './ImageModal';

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
  const { error, success } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imageModalState, setImageModalState] = useState<{
    isOpen: boolean;
    characterId: string | null;
    characterName: string;
  }>({
    isOpen: false,
    characterId: null,
    characterName: '',
  });

  // デバッグ: initialDataの内容を確認
  console.log('[Step3CharacterStyle] initialData:', initialData);

  // フォームの状態管理
  const [characters, setCharacters] = useState<Array<{
    id: string;
    name: string;
    description: string;
    faceReference?: string;
  }>>(() => {
    // charactersが配列であることを保証
    const outputChars = initialData?.stepOutput?.userInput?.characters;
    if (Array.isArray(outputChars)) {
      return outputChars;
    }
    
    const inputChars = initialData?.stepInput?.detailedCharacters;
    if (Array.isArray(inputChars)) {
      return inputChars.map(char => ({
        id: char.id,
        name: char.name,
        description: `${char.personality}\n${char.visualDescription}`,
      }));
    }
    
    return [];
  });

  // charactersステートの変更を監視
  useEffect(() => {
    console.log('[Step3CharacterStyle] Characters state updated:', characters);
  }, [characters]);

  const [imageStyle, setImageStyle] = useState({
    preset: initialData?.stepOutput?.userInput?.imageStyle?.preset || 'anime',
    customPrompt: initialData?.stepOutput?.userInput?.imageStyle?.customPrompt || '',
  });

  // initialDataが変更されたときにフォームデータを更新
  useEffect(() => {
    if (initialData?.stepOutput?.userInput) {
      console.log('[Step3CharacterStyle] Updating form with stepOutput.userInput');
      const outputChars = initialData.stepOutput.userInput.characters;
      setCharacters(Array.isArray(outputChars) ? outputChars : []);
      setImageStyle({
        preset: initialData.stepOutput.userInput.imageStyle?.preset || 'anime',
        customPrompt: initialData.stepOutput.userInput.imageStyle?.customPrompt || '',
      });
    } else if (initialData?.stepInput?.detailedCharacters) {
      console.log('[Step3CharacterStyle] Updating form with stepInput.detailedCharacters');
      const inputChars = initialData.stepInput.detailedCharacters;
      if (Array.isArray(inputChars)) {
        setCharacters(
          inputChars.map(char => ({
            id: char.id,
            name: char.name,
            description: `${char.personality}\n${char.visualDescription}`,
          }))
        );
      } else {
        setCharacters([]);
      }
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

  // キャラクターの名前を変更
  const handleCharacterNameChange = (characterId: string, name: string) => {
    setCharacters(prev => 
      prev.map(char => 
        char.id === characterId 
          ? { ...char, name }
          : char
      )
    );
  };

  // キャラクターを追加
  const handleAddCharacter = () => {
    const newCharacter = {
      id: `char_${Date.now()}`,
      name: '新しいキャラクター',
      description: '',
    };
    setCharacters(prev => [...prev, newCharacter]);
  };

  // キャラクターを削除
  const handleDeleteCharacter = (characterId: string) => {
    // 最低1人は残す
    if (characters.length <= 1) {
      error('最低1人のキャラクターが必要です');
      return;
    }
    setCharacters(prev => prev.filter(char => char.id !== characterId));
  };

  // 顔参照画像の更新
  const handleFaceReferenceUpdate = (characterId: string, url: string) => {
    console.log('[Step3CharacterStyle] Updating face reference for character:', characterId, 'with URL:', url);
    setCharacters(prev => {
      const updated = prev.map(char => 
        char.id === characterId 
          ? { ...char, faceReference: url }
          : char
      );
      console.log('[Step3CharacterStyle] Updated characters:', updated);
      return updated;
    });
    // 成功時のトースト通知を削除
  };

  // 顔参照画像の削除
  const handleDeleteFaceReference = async (characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    if (!character?.faceReference) return;

    // アップロードされたファイルの場合はストレージから削除
    if (character.faceReference.includes('supabase')) {
      try {
        const response = await fetch('/api/upload/face-reference', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-User-UID': user?.id || '',
          },
          body: JSON.stringify({ url: character.faceReference }),
        });

        if (!response.ok) {
          console.error('Failed to delete image from storage');
        }
      } catch (err) {
        console.error('Failed to delete image:', err);
      }
    }

    setCharacters(prev => 
      prev.map(char => 
        char.id === characterId 
          ? { ...char, faceReference: undefined }
          : char
      )
    );
    success('顔参照画像を削除しました');
  };

  // 保存処理
  const handleSave = async () => {
    if (!user) {
      error('認証が必要です');
      return;
    }

    setIsLoading(true);
    
    try {
      // workflow-design.mdの仕様に従い、Step3Outputを送信
      const step3Output: Step3Output = {
        userInput: {
          characters,
          imageStyle,
        },
      };
      
      const response = await fetch(`/api/workflow/${workflowId}/step/3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify(step3Output),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Step 3 save failed:', response.status, errorData);
        
        if (errorData.error) {
          error(errorData.error);
        } else {
          error('保存に失敗しました');
        }
        return;
      }
      
      // 保存成功後に次のステップへ
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


      {/* キャラクター設定 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">登場人物設定</h3>
          <button
            onClick={handleAddCharacter}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            キャラクターを追加
          </button>
        </div>
        
        {Array.isArray(characters) && characters.map((character) => (
          <Card key={character.id} className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={character.name}
                      onChange={(e) => handleCharacterNameChange(character.id, e.target.value)}
                      className="text-lg font-medium bg-transparent border-b border-gray-600 focus:border-purple-500 outline-none transition-colors px-1"
                      placeholder="キャラクター名"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteCharacter(character.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      disabled={isLoading || characters.length <= 1}
                      title="削除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
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

                {/* 顔参照画像セクション */}
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">顔参照画像</label>
                    {character.faceReference ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setImageModalState({
                            isOpen: true,
                            characterId: character.id,
                            characterName: character.name,
                          })}
                          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                          disabled={isLoading}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteFaceReference(character.id)}
                          className="px-3 py-1 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                          disabled={isLoading}
                        >
                          削除
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setImageModalState({
                          isOpen: true,
                          characterId: character.id,
                          characterName: character.name,
                        })}
                        className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                        disabled={isLoading}
                      >
                        画像を追加
                      </button>
                    )}
                  </div>
                  {character.faceReference ? (
                    <div className="relative bg-gray-700 rounded-lg overflow-hidden p-4" style={{ maxHeight: '300px' }}>
                      <img 
                        src={character.faceReference} 
                        alt={`${character.name}の顔参照`}
                        className="w-full h-auto max-h-full object-contain rounded"
                        style={{ maxHeight: '250px' }}
                        onLoad={() => {
                          console.log('[Step3CharacterStyle] Image loaded successfully:', character.faceReference);
                        }}
                        onError={(e) => {
                          console.error('[Step3CharacterStyle] Image load failed:', character.faceReference);
                          (e.target as HTMLImageElement).style.display = 'none';
                          error('画像の読み込みに失敗しました');
                        }}
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-700 rounded-lg p-4 text-center text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">顔参照画像を追加すると、</p>
                      <p className="text-sm">キャラクターの顔を一貫して生成できます</p>
                    </div>
                  )}
                </div>
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

      {/* 画像アップロードモーダル */}
      {imageModalState.characterId && (
        <ImageModal
          isOpen={imageModalState.isOpen}
          onClose={() => setImageModalState({ isOpen: false, characterId: null, characterName: '' })}
          onSave={(url) => {
            console.log('[Step3CharacterStyle] onSave called with URL:', url);
            handleFaceReferenceUpdate(imageModalState.characterId!, url);
            setImageModalState({ isOpen: false, characterId: null, characterName: '' });
          }}
          characterName={imageModalState.characterName}
          currentUrl={characters.find(c => c.id === imageModalState.characterId)?.faceReference}
        />
      )}
    </div>
  );
}