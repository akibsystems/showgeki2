import React from 'react';
import type { MulmoSpeakerDataSchema } from '@/lib/schemas';
import type { VoiceId } from '../types';
import { z } from 'zod';
import styles from '../styles/ScriptDirector.module.css';

// schemasに合わせた型定義
type Speaker = z.infer<typeof MulmoSpeakerDataSchema> & {
  voiceId: VoiceId;
};

interface SpeechSettingsProps {
  speakers: Record<string, Speaker>;
  onAddSpeaker: () => void;
  onEditSpeaker: (speakerId: string) => void;
  onDeleteSpeaker: (speakerId: string) => void;
  isReadOnly?: boolean;
}

const VOICE_OPTIONS: { value: VoiceId; label: string; description: string }[] = [
  { value: 'alloy', label: 'Alloy', description: 'クリアで自然な声' },
  { value: 'echo', label: 'Echo', description: '落ち着いた大人の声' },
  { value: 'fable', label: 'Fable', description: '物語を語るような声' },
  { value: 'nova', label: 'Nova', description: '明るく若々しい声' },
  { value: 'onyx', label: 'Onyx', description: '力強い男性の声' },
  { value: 'shimmer', label: 'Shimmer', description: '優しく親しみやすい声' },
];

export function SpeechSettings({
  speakers,
  onAddSpeaker,
  onEditSpeaker,
  onDeleteSpeaker,
  isReadOnly = false,
}: SpeechSettingsProps) {
  const speakerEntries = Object.entries(speakers);

  return (
    <div className={styles.speechSettings}>
      <div className={styles.settingsHeader}>
        <h3 className={styles.settingsTitle}>🎤 音声設定</h3>
        <p className={styles.settingsDescription}>
          プロバイダー: OpenAI (固定)
        </p>
      </div>

      <div className={styles.speakersSection}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>🎭 話者設定</h4>
          {!isReadOnly && (
            <button
              className={styles.addButton}
              onClick={onAddSpeaker}
              type="button"
            >
              ➕ 話者を追加
            </button>
          )}
        </div>

        <div className={styles.speakersList}>
          {speakerEntries.length === 0 ? (
            <div className={styles.emptySpeakers}>
              <p>話者が設定されていません。</p>
              <p>「話者を追加」ボタンで新しい話者を追加してください。</p>
            </div>
          ) : (
            speakerEntries.map(([speakerId, speaker]) => (
              <div key={speakerId} className={styles.speakerItem}>
                <div className={styles.speakerInfo}>
                  <div className={styles.speakerHeader}>
                    <span className={styles.speakerIcon}>🎤</span>
                    <span className={styles.speakerId}>{speakerId}</span>
                  </div>
                  
                  <div className={styles.speakerDetails}>
                    <div className={styles.speakerDetail}>
                      <span className={styles.detailLabel}>音声:</span>
                      <span className={styles.detailValue}>
                        {VOICE_OPTIONS.find(v => v.value === speaker.voiceId)?.label || speaker.voiceId}
                      </span>
                      <span className={styles.voiceDescription}>
                        ({VOICE_OPTIONS.find(v => v.value === speaker.voiceId)?.description})
                      </span>
                    </div>
                    
                    <div className={styles.speakerDetail}>
                      <span className={styles.detailLabel}>表示名:</span>
                      <span className={styles.detailValue}>
                        {speaker.displayName?.ja || speaker.displayName?.['ja'] || speakerId} / {speaker.displayName?.en || speaker.displayName?.['en'] || speakerId}
                      </span>
                    </div>
                  </div>
                </div>

                {!isReadOnly && (
                  <div className={styles.speakerActions}>
                    <button
                      className={styles.editButton}
                      onClick={() => onEditSpeaker(speakerId)}
                      type="button"
                      aria-label={`${speakerId}を編集`}
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => onDeleteSpeaker(speakerId)}
                      type="button"
                      aria-label={`${speakerId}を削除`}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 音声プレビュー情報（将来的な拡張用） */}
      <div className={styles.voicePreviewSection}>
        <h4 className={styles.sectionTitle}>💡 音声について</h4>
        <div className={styles.voiceGrid}>
          {VOICE_OPTIONS.map((voice) => (
            <div key={voice.value} className={styles.voiceOption}>
              <span className={styles.voiceName}>{voice.label}</span>
              <span className={styles.voiceDesc}>{voice.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}