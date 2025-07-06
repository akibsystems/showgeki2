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
  isLoading
}: {
  selectedBgm: string;
  bgmOptions: string[];
  volume: number;
  onBgmChange: (bgm: string) => void;
  onVolumeChange: (volume: number) => void;
  isLoading: boolean;
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bgmOptions.map((bgm) => (
              <button
                key={bgm}
                onClick={() => onBgmChange(bgm)}
                disabled={isLoading}
                className={`
                  p-3 rounded-lg text-sm transition-all
                  ${selectedBgm === bgm
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }
                `}
              >
                {bgmDisplayNames[bgm] || bgm}
              </button>
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
  style,
  onEnabledChange,
  onLanguageChange,
  onStyleChange,
  isLoading
}: {
  enabled: boolean;
  language: string;
  style: {
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    position: 'top' | 'bottom';
  };
  onEnabledChange: (enabled: boolean) => void;
  onLanguageChange: (lang: string) => void;
  onStyleChange: (style: any) => void;
  isLoading: boolean;
}) {
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

            {/* 表示位置 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">表示位置</label>
              <div className="flex gap-3">
                <button
                  onClick={() => onStyleChange({ ...style, position: 'top' })}
                  disabled={isLoading}
                  className={`
                    px-4 py-2 rounded-lg text-sm transition-all
                    ${style.position === 'top'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }
                  `}
                >
                  上部
                </button>
                <button
                  onClick={() => onStyleChange({ ...style, position: 'bottom' })}
                  disabled={isLoading}
                  className={`
                    px-4 py-2 rounded-lg text-sm transition-all
                    ${style.position === 'bottom'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }
                  `}
                >
                  下部
                </button>
              </div>
            </div>

            {/* フォントサイズ */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                フォントサイズ: {style.fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="32"
                value={style.fontSize}
                onChange={(e) => onStyleChange({ ...style, fontSize: Number(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
              />
            </div>

            {/* プレビュー */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">プレビュー</label>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-gray-500">動画プレビュー</span>
                </div>
                <div 
                  className={`absolute left-0 right-0 ${style.position === 'top' ? 'top-4' : 'bottom-4'} flex justify-center`}
                >
                  <div
                    className="px-4 py-2 rounded"
                    style={{
                      fontSize: `${style.fontSize}px`,
                      color: style.fontColor,
                      backgroundColor: style.backgroundColor,
                    }}
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
  
  // BGM設定
  const [bgmSettings, setBgmSettings] = useState({
    selected: initialData?.stepOutput?.userInput?.bgm?.selected || 
             initialData?.stepInput?.suggestedBgm || 
             'default-bgm-1',
    customBgm: initialData?.stepOutput?.userInput?.bgm?.customBgm || undefined,
    volume: initialData?.stepOutput?.userInput?.bgm?.volume ?? 0.5,
  });

  // 字幕設定
  const [captionSettings, setCaptionSettings] = useState({
    enabled: initialData?.stepOutput?.userInput?.caption?.enabled ?? 
             initialData?.stepInput?.captionSettings?.enabled ?? 
             true,
    language: initialData?.stepOutput?.userInput?.caption?.language || 
              initialData?.stepInput?.captionSettings?.language || 
              'ja',
    style: initialData?.stepOutput?.userInput?.caption?.style || {
      fontSize: 20,
      fontColor: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      position: 'bottom' as const,
    },
  });

  // 常に次へ進める
  useEffect(() => {
    onUpdate(true);
  }, [onUpdate]);

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
              style: captionSettings.style,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      success('設定を保存しました');
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
        isLoading={isLoading}
      />

      {/* 字幕設定 */}
      <CaptionSettings
        enabled={captionSettings.enabled}
        language={captionSettings.language}
        style={captionSettings.style}
        onEnabledChange={(enabled) => setCaptionSettings({ ...captionSettings, enabled })}
        onLanguageChange={(language) => setCaptionSettings({ ...captionSettings, language })}
        onStyleChange={(style) => setCaptionSettings({ ...captionSettings, style })}
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