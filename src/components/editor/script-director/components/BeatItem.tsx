import React, { useState } from 'react';
import type { MulmoBeat } from '@/lib/schemas';
import styles from '../styles/ScriptDirector.module.css';

import type { MulmoSpeakerDataSchema } from '@/lib/schemas';
import type { VoiceId } from '../types';
import { z } from 'zod';

// schemasに合わせた型定義
type Speaker = z.infer<typeof MulmoSpeakerDataSchema> & {
  voiceId: VoiceId;
};

interface BeatItemProps {
  index: number;
  beat: MulmoBeat;
  speakerIds: string[];
  speakers: Record<string, Speaker>;
  faceReferenceKeys: string[];
  onUpdate: (beat: MulmoBeat) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isReadOnly?: boolean;
}

export function BeatItem({
  index,
  beat,
  speakerIds,
  speakers,
  faceReferenceKeys,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isReadOnly = false,
}: BeatItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSpeakerChange = (speaker: string) => {
    onUpdate({ ...beat, speaker });
  };

  const handleTextChange = (text: string) => {
    onUpdate({ ...beat, text });
  };

  const handleImagePromptChange = (imagePrompt: string) => {
    onUpdate({ ...beat, imagePrompt });
  };

  const handleFaceReferenceToggle = (faceName: string) => {
    // MulmoBeatスキーマにはimageNamesがないため、将来の拡張として一時的に管理
    const currentNames = (beat as any).imageNames || [];
    const newNames = currentNames.includes(faceName)
      ? currentNames.filter((name: string) => name !== faceName)
      : [...currentNames, faceName];
    
    onUpdate({ ...beat, imageNames: newNames } as MulmoBeat);
  };

  const getBeatTitle = (index: number) => {
    return `シーン ${index + 1}`;
  };

  const getSpeakerDisplayName = (speakerId: string) => {
    const speaker = speakers[speakerId];
    return speaker?.displayName?.ja || speaker?.displayName?.['ja'] || speakerId;
  };

  return (
    <div className={styles.beatItem}>
      <div className={styles.beatHeader}>
        <button
          className={styles.beatToggle}
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
          aria-label={isExpanded ? '折りたたむ' : '展開する'}
        >
          <span className={styles.beatIcon}>🎬</span>
          <span className={styles.beatTitle}>{getBeatTitle(index)}</span>
          <span className={styles.toggleIcon}>
            {isExpanded ? '▼' : '▶'}
          </span>
        </button>

        {!isReadOnly && (
          <div className={styles.beatActions}>
            {onMoveUp && (
              <button
                className={styles.moveButton}
                onClick={onMoveUp}
                type="button"
                aria-label="上に移動"
              >
                ⬆️
              </button>
            )}
            {onMoveDown && (
              <button
                className={styles.moveButton}
                onClick={onMoveDown}
                type="button"
                aria-label="下に移動"
              >
                ⬇️
              </button>
            )}
            <button
              className={styles.deleteButton}
              onClick={onDelete}
              type="button"
              aria-label="削除"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className={styles.beatContent}>
          {/* 話者選択 */}
          <div className={styles.beatField}>
            <label className={styles.beatLabel}>話者:</label>
            <select
              value={beat.speaker || ''}
              onChange={(e) => handleSpeakerChange(e.target.value)}
              className={styles.beatSelect}
              disabled={isReadOnly}
            >
              <option value="">話者を選択してください</option>
              {speakerIds.map((speakerId) => (
                <option key={speakerId} value={speakerId}>
                  {getSpeakerDisplayName(speakerId)} ({speakerId})
                </option>
              ))}
            </select>
          </div>

          {/* 台詞入力 */}
          <div className={styles.beatField}>
            <label className={styles.beatLabel}>台詞:</label>
            <textarea
              value={beat.text || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              className={styles.beatTextarea}
              placeholder="この場面の台詞を入力してください..."
              disabled={isReadOnly}
              rows={3}
            />
            <div className={styles.characterCount}>
              {(beat.text || '').length} 文字
            </div>
          </div>

          {/* 画像プロンプト入力 */}
          <div className={styles.beatField}>
            <label className={styles.beatLabel}>画像の指示:</label>
            <textarea
              value={beat.imagePrompt || ''}
              onChange={(e) => handleImagePromptChange(e.target.value)}
              className={styles.beatTextarea}
              placeholder="この場面で表示したい画像の内容を詳しく説明してください..."
              disabled={isReadOnly}
              rows={3}
            />
            <div className={styles.characterCount}>
              {(beat.imagePrompt || '').length} 文字
            </div>
          </div>

          {/* 顔参照選択 */}
          {faceReferenceKeys.length > 0 && (
            <div className={styles.beatField}>
              <label className={styles.beatLabel}>顔参照:</label>
              <div className={styles.faceReferenceGrid}>
                {faceReferenceKeys.map((faceName) => (
                  <label key={faceName} className={styles.faceReferenceItem}>
                    <input
                      type="checkbox"
                      checked={((beat as any).imageNames || []).includes(faceName)}
                      onChange={() => handleFaceReferenceToggle(faceName)}
                      disabled={isReadOnly}
                      className={styles.faceReferenceCheckbox}
                    />
                    <span className={styles.faceReferenceName}>{faceName}</span>
                  </label>
                ))}
              </div>
              <div className={styles.formHint}>
                選択した顔参照が画像生成時に使用されます
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}