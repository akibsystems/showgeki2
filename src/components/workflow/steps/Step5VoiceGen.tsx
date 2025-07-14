'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
import type { Step5Input, Step5Output, VoiceId } from '@/types/workflow';
import { VOICE_DESCRIPTIONS } from '@/types/workflow';

interface Step5VoiceGenProps {
  workflowId: string;
  initialData?: {
    stepInput: Step5Input;
    stepOutput?: Step5Output;
  };
  onNext: () => void;
  onBack: () => void;
  onUpdate: (canProceed: boolean) => void;
}

// 音声選択コンポーネント
function VoiceSelector({
  characterId,
  characterName,
  currentVoice,
  onChange,
  isLoading
}: {
  characterId: string;
  characterName: string;
  currentVoice: string;
  onChange: (voice: string) => void;
  isLoading: boolean;
}) {
  const voices: VoiceId[] = [
    'alloy',
    'ash',
    'ballad',
    'coral',
    'echo',
    'fable',
    'nova',
    'onyx',
    'sage',
    'shimmer',
    'verse',
  ];

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-4">
        <h4 className="font-medium mb-3">{characterName}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {voices.map((voice) => (
            <button
              key={voice}
              onClick={() => onChange(voice)}
              disabled={isLoading}
              className={`
                p-3 rounded-lg text-sm transition-all
                ${currentVoice === voice
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }
              `}
            >
              <div className="font-medium">{voice}</div>
              <div className="text-xs opacity-80 mt-1">
                {VOICE_DESCRIPTIONS[voice]}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// シーン音声プレビューコンポーネント
function SceneAudioPreview({
  scene,
  voiceSettings,
  isLoading,
  onPreview
}: {
  scene: {
    id: string;
    title: string;
    dialogue: Array<{
      speaker: string;
      text: string;
      audioUrl?: string;
    }>;
  };
  voiceSettings: { [characterId: string]: { voiceType: string } };
  isLoading: boolean;
  onPreview: (text: string, speaker: string) => void;
}) {
  const [expandedDialogue, setExpandedDialogue] = useState<number | null>(null);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-4">
        <h4 className="font-medium mb-3">{scene.title}</h4>
        {scene.dialogue.length > 0 && (
          <div
            className="bg-gray-700 rounded-md p-3 cursor-pointer hover:bg-gray-600 transition-colors"
            onClick={() => setExpandedDialogue(expandedDialogue === 0 ? null : 0)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm font-medium text-purple-300 mb-1">
                  {scene.dialogue[0].speaker}
                </div>
                <div className="text-sm text-gray-200">
                  {scene.dialogue[0].text}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(scene.dialogue[0].text, scene.dialogue[0].speaker);
                }}
                disabled={isLoading}
                className="ml-3 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
              >
                試聴
              </button>
            </div>

            {expandedDialogue === 0 && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="text-xs text-gray-400 mb-2">読み修正（任意）</div>
                <input
                  type="text"
                  placeholder="例: 花子→はなこ"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Step5VoiceGen({
  workflowId,
  initialData,
  onNext,
  onBack,
  onUpdate,
}: Step5VoiceGenProps) {
  const { error, success } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // 音声設定の管理
  const [voiceSettings, setVoiceSettings] = useState<{
    [characterId: string]: {
      voiceType: string;
      corrections?: {
        [sceneId: string]: {
          [dialogueIndex: number]: string;
        };
      };
    };
  }>({});

  // initialDataから音声設定を初期化
  useEffect(() => {
    if (initialData?.stepOutput?.userInput?.voiceSettings) {
      setVoiceSettings(initialData.stepOutput.userInput.voiceSettings);
    } else if (initialData?.stepInput?.characters) {
      // 初期設定を作成
      const initialSettings: any = {};
      initialData.stepInput.characters.forEach(char => {
        initialSettings[char.id] = {
          voiceType: char.suggestedVoice || 'alloy'
        };
      });
      setVoiceSettings(initialSettings);
    }
  }, [initialData]);

  // 常に次へ進める
  useEffect(() => {
    onUpdate(true);
  }, [onUpdate]);

  // 音声タイプの変更
  const handleVoiceChange = (characterId: string, voiceType: string) => {
    setVoiceSettings({
      ...voiceSettings,
      [characterId]: {
        ...voiceSettings[characterId],
        voiceType
      }
    });
  };

  // 音声プレビュー
  const handlePreview = async (text: string, speaker: string) => {
    if (!user) return;

    setIsPreviewLoading(true);
    try {
      // キャラクターIDを取得
      const character = initialData?.stepInput?.characters.find(
        char => char.name === speaker
      );

      if (!character) {
        error('話者の情報が見つかりません');
        return;
      }

      const voiceType = voiceSettings[character.id]?.voiceType || 'alloy';

      // TTS APIを呼び出し
      const response = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify({
          text,
          voice: voiceType
        }),
      });

      if (!response.ok) {
        throw new Error('音声生成に失敗しました');
      }

      // 音声を再生
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();

    } catch (err) {
      console.error('音声プレビューエラー:', err);
      error('音声の再生に失敗しました');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // workflow-design.mdの仕様に従い、Step5Outputを送信
      const step5Output: Step5Output = {
        userInput: {
          voiceSettings
        },
      };

      const response = await fetch(`/api/workflow/${workflowId}/step/5`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify(step5Output),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Step 5 save failed:', response.status, errorData);
        throw new Error(`Failed to save: ${response.status} ${errorData}`);
      }

      onNext();
    } catch (err) {
      console.error('Failed to save step 5:', err);
      error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const characters = initialData?.stepInput?.characters || [];
  const scenes = initialData?.stepInput?.scenes || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">音声の設定</h2>
        <p className="text-gray-400">
          キャラクターごとに音声を選択し、プレビューで確認してください
        </p>
      </div>

      {/* キャラクター音声設定 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">キャラクター音声</h3>
        <div className="space-y-4">
          {characters.map((character) => (
            <VoiceSelector
              key={character.id}
              characterId={character.id}
              characterName={character.name}
              currentVoice={voiceSettings[character.id]?.voiceType || 'alloy'}
              onChange={(voice) => handleVoiceChange(character.id, voice)}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>

      {/* シーン音声プレビュー */}
      <div>
        <h3 className="text-lg font-semibold mb-4">シーン音声プレビュー</h3>
        <div className="space-y-4">
          {scenes.map((scene) => (
            <SceneAudioPreview
              key={scene.id}
              scene={scene}
              voiceSettings={voiceSettings}
              isLoading={isLoading || isPreviewLoading}
              onPreview={handlePreview}
            />
          ))}
        </div>
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