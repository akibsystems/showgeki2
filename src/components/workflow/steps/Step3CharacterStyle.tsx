'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import type { Step2Json, Step3Json } from '@/types/workflow';

interface Step3CharacterStyleProps {
  workflowId: string;
  initialData?: Step3Json;
  previousStepData?: Step2Json;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (canProceed: boolean) => void;
}

// 画風プリセット
const IMAGE_STYLE_PRESETS = [
  { value: 'anime', label: 'アニメ風', description: 'ソフトパステルカラー、繊細な線画' },
  { value: 'realistic', label: 'リアル風', description: '写実的、映画的な表現' },
  { value: 'fantasy', label: 'ファンタジー風', description: '幻想的、魔法的な雰囲気' },
  { value: 'watercolor', label: '水彩画風', description: '柔らかい色彩、絵画的' },
  { value: 'comic', label: 'コミック風', description: '明確な線、鮮やかな色彩' },
];

export default function Step3CharacterStyle({
  workflowId,
  initialData,
  previousStepData,
  onNext,
  onBack,
  onUpdate,
}: Step3CharacterStyleProps) {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // デバッグ: データの内容を確認
  console.log('[Step3CharacterStyle] initialData:', initialData);
  console.log('[Step3CharacterStyle] previousStepData:', previousStepData);
  
  // キャラクター設定
  const [characters, setCharacters] = useState<Step3Json['userInput']['characters']>(
    initialData?.userInput?.characters || []
  );
  
  // 画風設定
  const [imageStyle, setImageStyle] = useState(
    initialData?.userInput?.imageStyle || {
      preset: 'anime',
      customPrompt: '',
    }
  );

  // initialDataまたはpreviousStepDataが変更されたときにフォームデータを更新
  useEffect(() => {
    if (initialData?.userInput) {
      console.log('[Step3CharacterStyle] Updating form with initialData.userInput');
      setCharacters(initialData.userInput.characters || []);
      setImageStyle(initialData.userInput.imageStyle || {
        preset: 'anime',
        customPrompt: '',
      });
    } else if (previousStepData?.generatedContent && characters.length === 0) {
      // 初回のみ、previousStepDataから初期データを設定
      console.log('[Step3CharacterStyle] Setting initial data from previousStepData.generatedContent');
      
      // generatedContentのキャラクターをStep3の形式に変換
      const initialCharacters = previousStepData.generatedContent.detailedCharacters?.map(char => ({
        id: char.id,
        name: char.name,
        description: `${char.personality}\n${char.visualDescription}`,
      })) || [];
      
      setCharacters(initialCharacters);
      
      // 画風の提案を設定
      if (previousStepData.generatedContent.suggestedImageStyle) {
        setImageStyle({
          preset: previousStepData.generatedContent.suggestedImageStyle.preset || 'anime',
          customPrompt: previousStepData.generatedContent.suggestedImageStyle.description || '',
        });
      }
    }
  }, [initialData, previousStepData, characters.length]);


  // 有効性チェック
  useEffect(() => {
    const isValid = characters.length > 0 && characters.every(c => c.name && c.description);
    onUpdate(isValid);
  }, [characters, onUpdate]);

  // キャラクター追加
  const addCharacter = () => {
    const newCharacter: Step3Json['userInput']['characters'][0] = {
      id: `char_${Date.now()}`,
      name: '',
      description: '',
    };
    setCharacters([...characters, newCharacter]);
  };

  // キャラクター削除
  const removeCharacter = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  // キャラクター更新
  const updateCharacter = (index: number, field: keyof Step3Json['userInput']['characters'][0], value: any) => {
    const newCharacters = [...characters];
    newCharacters[index] = { ...newCharacters[index], [field]: value };
    setCharacters(newCharacters);
  };


  // 親コンポーネントから「次へ」ボタンがクリックされたときの処理
  useEffect(() => {
    // TODO: 保存処理の実装
  }, []);

  // データ保存と次へ
  const handleSave = async () => {
    if (characters.length === 0) {
      error('最低1人のキャラクターを追加してください');
      return;
    }

    setIsLoading(true);
    try {
      const step3Data: Step3Json = {
        userInput: {
          characters,
          imageStyle,
        },
        generatedContent: {
          acts: [],
        },
      };

      const response = await fetch(`/api/workflow/${workflowId}/step/3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: step3Data }),
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      success('キャラクター設定を保存しました');
      onNext();
    } catch (err) {
      console.error('Failed to save step 3:', err);
      error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">キャラクター & 画風設定</h2>
        <p className="text-gray-400">
          登場人物の詳細と、動画の画風を設定してください
        </p>
      </div>

      {/* キャラクター設定 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">登場人物</h3>
            <button
              onClick={addCharacter}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              + キャラクター追加
            </button>
          </div>

          <div className="space-y-4">
            {characters.map((character, index) => (
              <div key={character.id} className="bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-medium text-gray-300">
                    キャラクター {index + 1}
                  </h4>
                  <button
                    onClick={() => removeCharacter(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                    disabled={isLoading}
                  >
                    削除
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                    placeholder="名前 *"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                <textarea
                  value={character.description}
                  onChange={(e) => updateCharacter(index, 'description', e.target.value)}
                  placeholder="性格と外見の説明 *&#10;（例: 情熱的で前向き、時に無鉄砲だが仲間思い&#10;黒髪の短髪、明るく元気な表情、スポーティな服装）"
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  disabled={isLoading}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 画風設定 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4">画風設定</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">画風プリセット</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {IMAGE_STYLE_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => setImageStyle({ ...imageStyle, preset: preset.value })}
                    className={`p-3 rounded-lg border transition-all ${
                      imageStyle.preset === preset.value
                        ? 'bg-purple-600 border-purple-500'
                        : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                    }`}
                    disabled={isLoading}
                  >
                    <div className="text-sm font-medium">{preset.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                カスタムプロンプト（任意）
              </label>
              <textarea
                value={imageStyle.customPrompt}
                onChange={(e) => setImageStyle({ ...imageStyle, customPrompt: e.target.value })}
                placeholder="追加の画風指定があれば入力..."
                rows={2}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}