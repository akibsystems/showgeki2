'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
import type { Step6Input, Step6Output } from '@/types/workflow';

interface Step6BgmSubtitleProps {
  workflowId: string;
  initialData?: {
    stepInput: Step6Input;
    stepOutput?: Step6Output;
  };
  onNext: () => void;
  onBack: () => void;
  onUpdate: (canProceed: boolean) => void;
}

// BGM選択コンポーネント
function BgmSelector({
  selectedBgm,
  bgmOptions,
  volume,
  onBgmChange,
  onVolumeChange,
  onPreview,
  isLoading,
  isPreviewLoading
}: {
  selectedBgm: string;
  bgmOptions: string[];
  volume: number;
  onBgmChange: (bgm: string) => void;
  onVolumeChange: (volume: number) => void;
  onPreview: (bgm: string) => void;
  isLoading: boolean;
  isPreviewLoading: boolean;
}) {
  const bgmDisplayNames: { [key: string]: string } = {
    'default-bgm-1': 'スタンダード',
    'default-bgm-2': 'ドラマチック',
    'default-bgm-3': 'ファンタジー',
    'epic': 'エピック',
    'emotional': 'エモーショナル',
    'peaceful': 'ピースフル',
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">BGM設定</h3>
        
        {/* BGM選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">BGMを選択</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bgmOptions.map((bgm) => (
              <div
                key={bgm}
                className={`
                  p-4 rounded-lg transition-all border
                  ${selectedBgm === bgm
                    ? 'bg-purple-600/20 border-purple-600'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onBgmChange(bgm)}
                    disabled={isLoading}
                    className="flex-1 text-left"
                  >
                    <div className="font-medium text-white">
                      {bgmDisplayNames[bgm] || bgm}
                    </div>
                    {selectedBgm === bgm && (
                      <div className="text-xs text-purple-300 mt-1">選択中</div>
                    )}
                  </button>
                  <button
                    onClick={() => onPreview(bgm)}
                    disabled={isLoading || isPreviewLoading}
                    className="ml-3 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                  >
                    {isPreviewLoading ? '読込中...' : '試聴'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 音量調整 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            音量: {Math.round(volume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            disabled={isLoading}
          />
        </div>

        {/* カスタムBGMアップロード（将来実装） */}
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-400">
            カスタムBGMのアップロード機能は後日実装予定です
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// 字幕設定コンポーネント
function CaptionSettings({
  enabled,
  language,
  styles = [],
  onEnabledChange,
  onLanguageChange,
  onStylesChange,
  isLoading
}: {
  enabled: boolean;
  language: string;
  styles: string[];
  onEnabledChange: (enabled: boolean) => void;
  onLanguageChange: (lang: string) => void;
  onStylesChange: (styles: string[]) => void;
  isLoading: boolean;
}) {
  // スタイルプリセット
  const stylePresets = {
    default: [
      "font-size: 24px",
      "color: white",
      "text-shadow: 2px 2px 4px rgba(0,0,0,0.8)",
      "font-family: 'Noto Sans JP', sans-serif",
      "font-weight: bold"
    ],
    withBackground: [
      "font-size: 24px",
      "color: white",
      "text-shadow: 2px 2px 4px rgba(0,0,0,0.8)",
      "font-family: 'Noto Sans JP', sans-serif",
      "font-weight: bold",
      "background-color: rgba(0,0,0,0.5)",
      "padding: 10px 20px",
      "border-radius: 5px"
    ],
    large: [
      "font-size: 32px",
      "color: white",
      "text-shadow: 3px 3px 6px rgba(0,0,0,0.9)",
      "font-family: 'Noto Sans JP', sans-serif",
      "font-weight: bold"
    ],
    minimal: [
      "font-size: 20px",
      "color: white",
      "text-shadow: 1px 1px 2px rgba(0,0,0,0.6)",
      "font-family: 'Noto Sans JP', sans-serif"
    ]
  };

  const [selectedPreset, setSelectedPreset] = useState('withBackground');
  const [customStyles, setCustomStyles] = useState(styles ? styles.join('\n') : '');
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">字幕設定</h3>
        
        {/* 字幕の有効/無効 */}
        <div className="mb-6">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
              disabled={isLoading}
            />
            <span className="text-sm font-medium">字幕を表示する</span>
          </label>
        </div>

        {enabled && (
          <>
            {/* 言語選択 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">言語</label>
              <div className="flex gap-3">
                <button
                  onClick={() => onLanguageChange('ja')}
                  disabled={isLoading}
                  className={`
                    px-4 py-2 rounded-lg text-sm transition-all
                    ${language === 'ja'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }
                  `}
                >
                  日本語
                </button>
                <button
                  onClick={() => onLanguageChange('en')}
                  disabled={isLoading}
                  className={`
                    px-4 py-2 rounded-lg text-sm transition-all
                    ${language === 'en'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }
                  `}
                >
                  English
                </button>
              </div>
            </div>

            {/* スタイルプリセット */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">スタイルプリセット</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(stylePresets).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPreset(key);
                      onStylesChange(value);
                      setCustomStyles(value.join('\n'));
                    }}
                    disabled={isLoading}
                    className={`
                      p-3 rounded-lg text-sm transition-all
                      ${selectedPreset === key
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }
                    `}
                  >
                    {key === 'default' && 'スタンダード'}
                    {key === 'withBackground' && '背景付き'}
                    {key === 'large' && '大きい文字'}
                    {key === 'minimal' && 'シンプル'}
                  </button>
                ))}
              </div>
            </div>

            {/* カスタムスタイル編集 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">カスタムスタイル (CSS)</label>
              <textarea
                value={customStyles}
                onChange={(e) => {
                  setCustomStyles(e.target.value);
                  setSelectedPreset('');
                  const newStyles = e.target.value.split('\n').filter(s => s.trim());
                  onStylesChange(newStyles);
                }}
                className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm resize-none"
                placeholder="font-size: 24px&#10;color: white&#10;text-shadow: 2px 2px 4px rgba(0,0,0,0.8)"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-400 mt-1">
                各行に1つのCSSプロパティを記述してください
              </p>
            </div>

            {/* プレビュー */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">プレビュー</label>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-gray-500">動画プレビュー</span>
                </div>
                <div className="absolute left-0 right-0 bottom-8 flex justify-center">
                  <div
                    style={styles && styles.length > 0 ? Object.fromEntries(
                      styles.map(style => {
                        const [prop, value] = style.split(':').map(s => s.trim());
                        return [
                          prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase()),
                          value
                        ];
                      })
                    ) : {}}
                  >
                    サンプル字幕テキスト
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Step6BgmSubtitle({
  workflowId,
  initialData,
  onNext,
  onBack,
  onUpdate,
}: Step6BgmSubtitleProps) {
  const { error, success } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // BGM設定
  const [bgmSettings, setBgmSettings] = useState({
    selected: initialData?.stepOutput?.userInput?.bgm?.selected || 
             initialData?.stepInput?.suggestedBgm || 
             'default-bgm-1',
    customBgm: initialData?.stepOutput?.userInput?.bgm?.customBgm || undefined,
    volume: initialData?.stepOutput?.userInput?.bgm?.volume ?? 0.5,
  });

  // 字幕設定 - mulmocast形式のstyles配列をサポート
  const defaultStyles = [
    "font-size: 24px",
    "color: white",
    "text-shadow: 2px 2px 4px rgba(0,0,0,0.8)",
    "font-family: 'Noto Sans JP', sans-serif",
    "font-weight: bold",
    "background-color: rgba(0,0,0,0.5)",
    "padding: 10px 20px",
    "border-radius: 5px"
  ];
  
  const [captionSettings, setCaptionSettings] = useState({
    enabled: initialData?.stepOutput?.userInput?.caption?.enabled ?? 
             initialData?.stepInput?.captionSettings?.enabled ?? 
             true,
    language: initialData?.stepOutput?.userInput?.caption?.language || 
              initialData?.stepInput?.captionSettings?.language || 
              'ja',
    styles: initialData?.stepOutput?.userInput?.caption?.styles || 
            initialData?.stepInput?.captionSettings?.styles ||
            defaultStyles,
  });

  // 常に次へ進める
  useEffect(() => {
    onUpdate(true);
  }, [onUpdate]);

  // BGMプレビュー処理
  const handleBgmPreview = async (bgm: string) => {
    setIsPreviewLoading(true);
    try {
      // TODO: 実際のBGMプレビューAPIを実装
      success(`BGM「${bgm}」の試聴機能は準備中です`);
      
      // 実際の実装例:
      // const response = await fetch(`/api/bgm/preview/${bgm}`);
      // const audioBlob = await response.blob();
      // const audioUrl = URL.createObjectURL(audioBlob);
      // const audio = new Audio(audioUrl);
      // await audio.play();
      
    } catch (err) {
      console.error('BGMプレビューエラー:', err);
      error('BGMの再生に失敗しました');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/workflow/${workflowId}/step/6`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify({
          data: {
            bgm: {
              selected: bgmSettings.selected,
              customBgm: bgmSettings.customBgm,
              volume: bgmSettings.volume,
            },
            caption: {
              enabled: captionSettings.enabled,
              language: captionSettings.language,
              styles: captionSettings.styles, // mulmocast形式のstyles配列
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      onNext();
    } catch (err) {
      console.error('Failed to save step 6:', err);
      error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const bgmOptions = initialData?.stepInput?.bgmOptions || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">BGMと字幕の設定</h2>
        <p className="text-gray-400">
          動画の雰囲気を決めるBGMと字幕の表示設定を行います
        </p>
      </div>

      {/* BGM設定 */}
      <BgmSelector
        selectedBgm={bgmSettings.selected}
        bgmOptions={bgmOptions}
        volume={bgmSettings.volume}
        onBgmChange={(bgm) => setBgmSettings({ ...bgmSettings, selected: bgm })}
        onVolumeChange={(volume) => setBgmSettings({ ...bgmSettings, volume })}
        onPreview={handleBgmPreview}
        isLoading={isLoading}
        isPreviewLoading={isPreviewLoading}
      />

      {/* 字幕設定 */}
      <CaptionSettings
        enabled={captionSettings.enabled}
        language={captionSettings.language}
        styles={captionSettings.styles}
        onEnabledChange={(enabled) => setCaptionSettings({ ...captionSettings, enabled })}
        onLanguageChange={(language) => setCaptionSettings({ ...captionSettings, language })}
        onStylesChange={(styles) => setCaptionSettings({ ...captionSettings, styles })}
        isLoading={isLoading}
      />

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