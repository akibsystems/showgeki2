'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useWorkflow } from '@/contexts/workflow-context';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';

interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  voiceId: string;
  imageUrl?: string;
  imageFile?: File;
}

interface CharacterListStepProps {
  className?: string;
  enableSpecialMode?: boolean; // 顔画像アップロード機能の有効化
}

// OpenAI TTS音声オプション
const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy', description: 'ニュートラルで親しみやすい声' },
  { id: 'echo', name: 'Echo', description: '力強く安定感のある声' },
  { id: 'fable', name: 'Fable', description: '温かく物語的な声' },
  { id: 'nova', name: 'Nova', description: '明るく活気のある声' },
  { id: 'onyx', name: 'Onyx', description: '深みのある落ち着いた声' },
  { id: 'shimmer', name: 'Shimmer', description: '優しく柔らかな声' },
];

/**
 * ワークフローステップ3: キャラクタ一覧
 * 登場人物の情報編集と音声設定
 */
export function CharacterListStep({ className, enableSpecialMode = false }: CharacterListStepProps) {
  const { state, updateCustomAssets } = useWorkflow();
  const { isMobile } = useResponsive();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // mulmoscriptから話者情報を取得して初期値を設定
  const getInitialCharacters = (): Character[] => {
    // mulmoscriptが存在する場合は、speakersから取得
    const mulmoscript = state.story?.script_json;
    if (mulmoscript?.speechParams?.speakers) {
      const speakerEntries = Object.entries(mulmoscript.speechParams.speakers);
      const charactersFromScript = speakerEntries.map(([name, config]: [string, any], index) => ({
        id: `char${index + 1}`,
        name: name,
        description: config.displayName?.ja || '',
        personality: '', // mulmoscriptには性格情報がないため空
        voiceId: config.voiceId || 'nova',
      }));
      
      // 重複を除去（ナレーターが複数回定義されている場合など）
      const uniqueCharacters = charactersFromScript.filter((char, index, self) =>
        index === self.findIndex((c) => c.name === char.name)
      );
      
      return uniqueCharacters.length > 0 ? uniqueCharacters : getDefaultCharacters();
    }
    
    return getDefaultCharacters();
  };
  
  const getDefaultCharacters = (): Character[] => [
    {
      id: 'char1',
      name: '主人公',
      description: 'あなた自身を表現するキャラクター',
      personality: '前向きで勇敢、成長を求める',
      voiceId: 'nova',
    },
    {
      id: 'char2',
      name: 'メンター',
      description: '主人公を導く賢者',
      personality: '知恵深く、温かい心を持つ',
      voiceId: 'fable',
    },
    {
      id: 'char3',
      name: '仲間',
      description: '主人公を支える友人',
      personality: '明るく、励ましてくれる',
      voiceId: 'alloy',
    },
  ];
  
  const [characters, setCharacters] = useState<Character[]>(getInitialCharacters());

  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
  const [expandedCharacter, setExpandedCharacter] = useState<string | null>(null);

  // キャラクター情報の更新
  const updateCharacter = useCallback((charId: string, updates: Partial<Character>) => {
    setCharacters(prev => prev.map(char => 
      char.id === charId ? { ...char, ...updates } : char
    ));
  }, []);

  // 画像ファイルの選択
  const handleImageSelect = useCallback((charId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      updateCharacter(charId, {
        imageUrl: e.target?.result as string,
        imageFile: file,
      });
    };
    reader.readAsDataURL(file);
  }, [updateCharacter]);

  // ドラッグ&ドロップ処理
  const handleDrop = useCallback((e: React.DragEvent, charId: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(charId, file);
    }
  }, [handleImageSelect]);

  // ステップ完了

  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center mb-8">
        <h2 className="text-responsive-2xl font-bold mb-2">登場人物設定</h2>
        <p className="text-gray-400">
          キャラクターの個性と声を設定します
        </p>
      </div>

      {/* キャラクター一覧 */}
      <div className="space-y-4">
        {characters.map((character) => (
          <div
            key={character.id}
            className={cn(
              'card-responsive',
              'transition-all',
              expandedCharacter === character.id && 'ring-2 ring-shakespeare-gold'
            )}
          >
            {/* キャラクターヘッダー */}
            <div
              className="flex items-center gap-4 cursor-pointer"
              onClick={() => setExpandedCharacter(
                expandedCharacter === character.id ? null : character.id
              )}
            >
              {/* 顔画像 */}
              <div className="relative">
                <div
                  className={cn(
                    'w-16 h-16 rounded-full overflow-hidden',
                    'bg-gray-700 flex items-center justify-center',
                    enableSpecialMode && 'cursor-pointer hover:ring-2 hover:ring-shakespeare-purple'
                  )}
                  onClick={(e) => {
                    if (enableSpecialMode) {
                      e.stopPropagation();
                      fileInputRefs.current[character.id]?.click();
                    }
                  }}
                  onDrop={(e) => enableSpecialMode && handleDrop(e, character.id)}
                  onDragOver={(e) => enableSpecialMode && e.preventDefault()}
                >
                  {character.imageUrl ? (
                    <img
                      src={character.imageUrl}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-8 h-8 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  )}
                </div>
                {enableSpecialMode && (
                  <input
                    ref={(el) => {
                      if (el) fileInputRefs.current[character.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageSelect(character.id, file);
                    }}
                    className="hidden"
                  />
                )}
              </div>

              {/* キャラクター情報 */}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {editingCharacter === character.id ? (
                    <input
                      type="text"
                      defaultValue={character.name}
                      onBlur={(e) => {
                        updateCharacter(character.id, { name: e.target.value });
                        setEditingCharacter(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border-b border-shakespeare-purple focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCharacter(character.id);
                      }}
                      className="cursor-text hover:text-shakespeare-purple"
                    >
                      {character.name}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-400">{character.description}</p>
              </div>

              {/* 展開アイコン */}
              <svg
                className={cn(
                  'w-5 h-5 text-gray-500 transition-transform',
                  expandedCharacter === character.id && 'rotate-180'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            {/* 展開時の詳細設定 */}
            {expandedCharacter === character.id && (
              <div className="mt-6 space-y-4">
                {/* 性格 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">性格・特徴</label>
                  <textarea
                    value={character.personality}
                    onChange={(e) => updateCharacter(character.id, { personality: e.target.value })}
                    className="input-responsive min-h-[80px] resize-y"
                    placeholder="キャラクターの性格や特徴を入力..."
                  />
                </div>

                {/* 音声選択 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">音声</label>
                  <div className={cn(
                    'grid gap-2',
                    isMobile ? 'grid-cols-1' : 'grid-cols-2'
                  )}>
                    {VOICE_OPTIONS.map((voice) => (
                      <label
                        key={voice.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg cursor-pointer',
                          'border transition-all',
                          character.voiceId === voice.id
                            ? 'border-shakespeare-purple bg-shakespeare-purple/10'
                            : 'border-gray-700 hover:border-gray-600'
                        )}
                      >
                        <input
                          type="radio"
                          name={`voice-${character.id}`}
                          value={voice.id}
                          checked={character.voiceId === voice.id}
                          onChange={(e) => updateCharacter(character.id, { voiceId: e.target.value })}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{voice.name}</div>
                          <div className="text-xs text-gray-500">{voice.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 顔画像アップロード（特別モード） */}
                {enableSpecialMode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">顔画像（オプション）</label>
                    <div
                      className="drag-drop-zone"
                      onDrop={(e) => handleDrop(e, character.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRefs.current[character.id]?.click()}
                    >
                      <svg
                        className="w-8 h-8 mx-auto mb-2 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm">
                        クリックまたはドラッグして画像をアップロード
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG (推奨: 正方形、512x512px以上)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* キャラクター追加ボタン */}
      <button
        type="button"
        className={cn(
          'w-full p-4 border-2 border-dashed border-gray-700 rounded-lg',
          'text-gray-500 hover:text-gray-400 hover:border-gray-600',
          'transition-all'
        )}
        onClick={() => {
          const newChar: Character = {
            id: `char${characters.length + 1}`,
            name: `キャラクター${characters.length + 1}`,
            description: '新しいキャラクター',
            personality: '',
            voiceId: 'alloy',
          };
          setCharacters([...characters, newChar]);
          setExpandedCharacter(newChar.id);
        }}
      >
        <svg
          className="w-6 h-6 mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        キャラクターを追加
      </button>

    </div>
  );
}