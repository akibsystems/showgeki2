import React, { useState, useRef, useEffect } from 'react';
import styles from '../styles/ScriptDirector.module.css';

// ================================================================
// Types
// ================================================================

interface AudioSettingsProps {
  bgm?: string;
  onUpdateBgm: (bgm: string) => void;
  isReadOnly?: boolean;
}

// BGM presets
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

// ================================================================
// Component
// ================================================================

export const AudioSettings: React.FC<AudioSettingsProps> = ({
  bgm = 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3',
  onUpdateBgm,
  isReadOnly = false
}) => {
  const [playingBgm, setPlayingBgm] = useState<string | null>(null);
  const [loadingBgm, setLoadingBgm] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // クリーンアップ: コンポーネントがアンマウントされたら音声を停止
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleBgmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateBgm(e.target.value);
  };

  const handlePlayPause = async (bgmUrl: string) => {
    // BGMなしの場合は何もしない
    if (bgmUrl === 'none') return;

    // 同じBGMがクリックされた場合は再生/一時停止を切り替え
    if (playingBgm === bgmUrl && audioRef.current) {
      if (audioRef.current.paused) {
        try {
          await audioRef.current.play();
          setPlayingBgm(bgmUrl);
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

    try {
      setLoadingBgm(bgmUrl);
      const audio = new Audio(bgmUrl);
      audio.volume = 0.5; // ボリュームを50%に設定
      audioRef.current = audio;

      // 音声の終了イベントを監視
      audio.addEventListener('ended', () => {
        setPlayingBgm(null);
      });

      // エラーハンドリング
      audio.addEventListener('error', () => {
        console.error('Failed to load audio');
        setPlayingBgm(null);
        setLoadingBgm(null);
      });

      // 読み込み完了後に再生
      audio.addEventListener('canplay', async () => {
        setLoadingBgm(null);
        try {
          await audio.play();
          setPlayingBgm(bgmUrl);
        } catch (error) {
          console.error('Failed to play audio:', error);
        }
      });

      audio.load();
    } catch (error) {
      console.error('Failed to create audio:', error);
      setLoadingBgm(null);
    }
  };

  const selectedPreset = BGM_PRESETS.find(preset => preset.value === bgm) || BGM_PRESETS[2]; // デフォルトはストーリー2

  return (
    <div className={styles.sectionContent}>
      {/* 現在のBGM表示 */}
      <div className={styles.currentBgmDisplay}>
        <div className={styles.currentBgmHeader}>
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span className={styles.currentBgmTitle}>現在のBGM設定</span>
        </div>
        <div className={styles.currentBgmInfo}>
          <div className={styles.currentBgmName}>{selectedPreset.label}</div>
          <div className={styles.currentBgmMood}>ムード: {selectedPreset.mood}</div>
          <div className={styles.currentBgmDescription}>{selectedPreset.description}</div>
        </div>
      </div>

      {/* BGM選択 */}
      <div className={styles.bgmSelector}>
        <label className={styles.bgmSelectorLabel}>
          BGMを変更
        </label>
        <select
          value={bgm}
          onChange={handleBgmChange}
          disabled={isReadOnly}
          className={styles.bgmSelect}
        >
          {BGM_PRESETS.map(preset => (
            <option key={preset.value} value={preset.value}>
              {preset.label} - {preset.mood}
            </option>
          ))}
        </select>
      </div>

      {/* BGMリスト（視覚的な選択） */}
      <div className={styles.bgmList}>
        <h4 className={styles.bgmListTitle}>BGM一覧</h4>
        <div className={styles.bgmGrid}>
          {BGM_PRESETS.map(preset => (
            <div
              key={preset.value}
              className={`${styles.bgmCard} ${bgm === preset.value ? styles.bgmCardActive : ''}`}
            >
              <div className={styles.bgmCardContent}>
                <button
                  onClick={() => !isReadOnly && onUpdateBgm(preset.value)}
                  disabled={isReadOnly}
                  className={styles.bgmCardSelectArea}
                >
                  <div className={styles.bgmCardHeader}>
                    {preset.value === 'none' ? (
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                    )}
                    <span className={styles.bgmCardTitle}>{preset.label}</span>
                  </div>
                  <div className={styles.bgmCardMood}>{preset.mood}</div>
                  <div className={styles.bgmCardDescription}>{preset.description}</div>
                </button>
                
                {/* 再生ボタン（BGMなし以外） */}
                {preset.value !== 'none' && (
                  <div className={styles.bgmPlayControls}>
                    <button
                      onClick={() => handlePlayPause(preset.value)}
                      disabled={isReadOnly || loadingBgm === preset.value}
                      className={styles.bgmPlayButton}
                      aria-label={playingBgm === preset.value ? '一時停止' : '再生'}
                    >
                      {loadingBgm === preset.value ? (
                        <svg width="24" height="24" className={styles.loadingIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : playingBgm === preset.value ? (
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                      <span className={styles.bgmPlayLabel}>
                        {loadingBgm === preset.value ? '読込中' : playingBgm === preset.value ? '停止' : '試聴'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 使用上の注意 */}
      <div className={styles.bgmNotice}>
        <div className={styles.bgmNoticeIcon}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className={styles.bgmNoticeText}>
          <p>BGMは動画全体に適用されます。物語の雰囲気に最も合うものを選択してください。</p>
          <p className={styles.bgmNoticeSubtext}>デフォルトは「Rise and Shine」が設定されています。</p>
        </div>
      </div>
    </div>
  );
};

export default AudioSettings;