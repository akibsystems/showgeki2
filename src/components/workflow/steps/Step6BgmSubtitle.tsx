'use client';

import { useState, useEffect, useRef } from 'react';
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

// BGMプリセット（AudioSettings.tsxと同じ）
const BGM_PRESETS = [
  {
    value: 'none',
    label: 'BGMなし',
    description: '無音',
    mood: 'なし'
  },
  {
    value: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story001.mp3',
    label: 'Whispered Melody',
    description: 'スムーズなピアノの優しい旋律。物語の静かな始まりや内省的なシーンに最適',
    mood: '穏やか・優しい'
  },
  {
    value: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3',
    label: 'Rise and Shine',
    description: 'テクノとピアノが融合したインスピレーショナルな楽曲。希望に満ちた物語の展開に',
    mood: '前向き・躍動的'
  },
  {
    value: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story003.mp3',
    label: 'Chasing the Sunset',
    description: 'ピアノが奏でる夕暮れの情景。感動的なクライマックスや別れのシーンに',
    mood: '感動的・ノスタルジック'
  },
  {
    value: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story004.mp3',
    label: 'Whispering Keys',
    description: 'クラシカルでアンビエントなピアノ曲。静寂と緊張感が漂うシーンに',
    mood: '静謐・神秘的'
  },
  {
    value: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story005.mp3',
    label: 'Whisper of Ivory',
    description: 'クラシカルなピアノソロ。深い感情を表現する重要なシーンに',
    mood: '荘厳・感情的'
  },
  {
    value: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/theme001.mp3',
    label: 'Rise of the Flame',
    description: 'オリンピックテーマ風の壮大なオーケストラ。英雄的な物語や勝利のシーンに',
    mood: '壮大・感動的'
  },
  {
    value: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/vibe001.mp3',
    label: 'Let It Vibe!',
    description: 'ラップとダンスが融合したエネルギッシュな楽曲。現代的で活気あるシーンに',
    mood: 'エネルギッシュ・楽しい'
  },
  {
    value: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/voice001.mp3',
    label: '声をつなげ、今ここで',
    description: '2020年代のJ-POPスタイル。日本の現代的な物語や青春シーンに',
    mood: '現代的・エモーショナル'
  }
];

// BGM選択コンポーネント
function BgmSelector({
  selectedBgm,
  bgmOptions,
  volume,
  onBgmChange,
  onVolumeChange,
  onPreview,
  isLoading,
  isPreviewLoading,
  playingBgm
}: {
  selectedBgm: string;
  bgmOptions: string[];
  volume: number;
  onBgmChange: (bgm: string) => void;
  onVolumeChange: (volume: number) => void;
  onPreview: (bgm: string) => void;
  isLoading: boolean;
  isPreviewLoading: boolean;
  playingBgm: string | null;
}) {

  // 現在選択されているBGMの情報を取得
  const selectedBgmPreset = BGM_PRESETS.find(preset => preset.value === selectedBgm) || BGM_PRESETS[2]; // デフォルトはRise and Shine

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">BGM設定</h3>

        {/* 現在のBGM表示 */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-start gap-3">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-white">{selectedBgmPreset.label}</h4>
              <p className="text-sm text-gray-400 mt-1">{selectedBgmPreset.description}</p>
              <p className="text-xs text-purple-300 mt-2">ムード: {selectedBgmPreset.mood}</p>
            </div>
          </div>
        </div>

        {/* BGM選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">BGMを変更</label>
          <div className="grid grid-cols-1 gap-3">
            {BGM_PRESETS.map((preset) => (
              <div
                key={preset.value}
                className={`
                  p-4 rounded-lg transition-all border cursor-pointer
                  ${selectedBgm === preset.value
                    ? 'bg-purple-600/20 border-purple-600'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onBgmChange(preset.value)}
                    disabled={isLoading}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-start gap-3">
                      {preset.value === 'none' ? (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-white">
                          {preset.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {preset.mood}
                        </div>
                      </div>
                    </div>
                  </button>
                  {preset.value !== 'none' && (
                    <button
                      onClick={() => onPreview(preset.value)}
                      disabled={isLoading || (isPreviewLoading && playingBgm !== preset.value)}
                      className={`ml-3 px-3 py-1 rounded text-sm transition-colors ${playingBgm === preset.value
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                    >
                      {isPreviewLoading && playingBgm === null ? '読込中...' :
                        playingBgm === preset.value ? '停止' : '試聴'}
                    </button>
                  )}
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
      "font-family: Arial, sans-serif",
      "font-size: 32px",
      "color: white",
      "text-align: center",
      "text-shadow: 0px 0px 20px rgba(0, 0, 0, 1.0)",
      "position: absolute",
      "bottom: 0px",
      "width: 80%",
      "padding-left: 10%",
      "padding-right: 10%",
      "padding-top: 4px",
      "background: rgba(0, 0, 0, 0.4)",
      "word-wrap: break-word",
      "overflow-wrap: break-word"
    ],
    withBackground: [
      "font-family: Arial, sans-serif",
      "font-size: 32px",
      "color: white",
      "text-align: center",
      "text-shadow: 0px 0px 20px rgba(0, 0, 0, 1.0)",
      "position: absolute",
      "bottom: 0px",
      "width: 80%",
      "padding-left: 10%",
      "padding-right: 10%",
      "padding-top: 8px",
      "padding-bottom: 8px",
      "background: rgba(0, 0, 0, 0.7)",
      "word-wrap: break-word",
      "overflow-wrap: break-word"
    ],
    large: [
      "font-family: Arial, sans-serif",
      "font-size: 40px",
      "color: white",
      "text-align: center",
      "text-shadow: 0px 0px 25px rgba(0, 0, 0, 1.0)",
      "position: absolute",
      "bottom: 0px",
      "width: 80%",
      "padding-left: 10%",
      "padding-right: 10%",
      "padding-top: 6px",
      "background: rgba(0, 0, 0, 0.4)",
      "word-wrap: break-word",
      "overflow-wrap: break-word"
    ],
    minimal: [
      "font-family: Arial, sans-serif",
      "font-size: 24px",
      "color: white",
      "text-align: center",
      "text-shadow: 0px 0px 15px rgba(0, 0, 0, 1.0)",
      "position: absolute",
      "bottom: 0px",
      "width: 80%",
      "padding-left: 10%",
      "padding-right: 10%",
      "word-wrap: break-word",
      "overflow-wrap: break-word"
    ]
  };

  const [selectedPreset, setSelectedPreset] = useState('default');
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
      'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3', // デフォルト: Rise and Shine
    customBgm: initialData?.stepOutput?.userInput?.bgm?.customBgm || undefined,
    volume: initialData?.stepOutput?.userInput?.bgm?.volume ?? 0.3,
  });

  // 字幕設定 - mulmocast形式のstyles配列をサポート
  const defaultStyles = [
    "font-family: Arial, sans-serif",
    "font-size: 32px",
    "color: white",
    "text-align: center",
    "text-shadow: 0px 0px 20px rgba(0, 0, 0, 1.0)",
    "position: absolute",
    "bottom: 0px",
    "width: 80%",
    "padding-left: 10%",
    "padding-right: 10%",
    "padding-top: 4px",
    "background: rgba(0, 0, 0, 0.4)",
    "word-wrap: break-word",
    "overflow-wrap: break-word"
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

  // 音声再生用のref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingBgm, setPlayingBgm] = useState<string | null>(null);

  // クリーンアップ: コンポーネントがアンマウントされたら音声を停止
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // BGMプレビュー処理
  const handleBgmPreview = async (bgm: string) => {
    // BGMなしの場合は何もしない
    if (bgm === 'none') return;

    // 同じBGMがクリックされた場合は再生/一時停止を切り替え
    if (playingBgm === bgm && audioRef.current) {
      if (audioRef.current.paused) {
        try {
          await audioRef.current.play();
          setPlayingBgm(bgm);
        } catch (error) {
          console.error('Failed to play audio:', error);
        }
      } else {
        audioRef.current.pause();
        setPlayingBgm(null);
      }
      return;
    }

    // 別のBGMがクリックされた場合は、現在の再生を停止して新しいBGMを再生
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsPreviewLoading(true);
    try {
      const audio = new Audio(bgm);
      audio.volume = bgmSettings.volume; // 現在の音量設定を使用
      audioRef.current = audio;

      // 音声の終了イベントを監視
      audio.addEventListener('ended', () => {
        setPlayingBgm(null);
      });

      // エラーハンドリング
      audio.addEventListener('error', () => {
        console.error('Failed to load audio');
        setPlayingBgm(null);
        setIsPreviewLoading(false);
        error('BGMの読み込みに失敗しました');
      });

      // 読み込み完了後に再生
      audio.addEventListener('canplay', async () => {
        setIsPreviewLoading(false);
        try {
          await audio.play();
          setPlayingBgm(bgm);
        } catch (err) {
          console.error('Failed to play audio:', err);
          error('BGMの再生に失敗しました');
        }
      });

      audio.load();
    } catch (err) {
      console.error('BGMプレビューエラー:', err);
      error('BGMの再生に失敗しました');
      setIsPreviewLoading(false);
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // workflow-design.mdの仕様に従い、Step6Outputを送信
      const step6Output: Step6Output = {
        userInput: {
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
      };

      const response = await fetch(`/api/workflow/${workflowId}/step/6`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify(step6Output),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Step 6 save failed:', response.status, errorData);
        throw new Error(`Failed to save: ${response.status} ${errorData}`);
      }

      onNext();
    } catch (err) {
      console.error('Failed to save step 6:', err);
      error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // bgmOptionsはURLのリストなので、BGM_PRESETSから有効なオプションを作成
  const validBgmOptions = BGM_PRESETS.filter(preset =>
    preset.value === 'none' || initialData?.stepInput?.bgmOptions?.includes(preset.value)
  );

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
        bgmOptions={validBgmOptions.map(p => p.value)}
        volume={bgmSettings.volume}
        onBgmChange={(bgm) => setBgmSettings({ ...bgmSettings, selected: bgm })}
        onVolumeChange={(volume) => {
          setBgmSettings({ ...bgmSettings, volume });
          // 再生中の音声の音量も更新
          if (audioRef.current) {
            audioRef.current.volume = volume;
          }
        }}
        onPreview={handleBgmPreview}
        isLoading={isLoading}
        isPreviewLoading={isPreviewLoading}
        playingBgm={playingBgm}
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