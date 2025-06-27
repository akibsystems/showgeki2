import React from 'react';
import { BeatItem } from './BeatItem';
import type { MulmoBeat, MulmoSpeakerDataSchema } from '@/lib/schemas';
import type { VoiceId } from '../types';
import { z } from 'zod';
import styles from '../styles/ScriptDirector.module.css';

// schemasに合わせた型定義
type Speaker = z.infer<typeof MulmoSpeakerDataSchema> & {
  voiceId: VoiceId;
};

interface BeatsEditorProps {
  beats: MulmoBeat[];
  speakers: Record<string, Speaker>;
  faceReferences: Record<string, any>;
  onUpdateBeat: (index: number, beat: MulmoBeat) => void;
  onAddBeat: () => void;
  onDeleteBeat: (index: number) => void;
  onMoveBeat: (index: number, direction: 'up' | 'down') => void;
  isReadOnly?: boolean;
}

export function BeatsEditor({
  beats,
  speakers,
  faceReferences,
  onUpdateBeat,
  onAddBeat,
  onDeleteBeat,
  onMoveBeat,
  isReadOnly = false,
}: BeatsEditorProps) {
  const speakerIds = Object.keys(speakers);
  const faceReferenceKeys = Object.keys(faceReferences);

  return (
    <div className={styles.beatsEditor}>
      <div className={styles.beatsHeader}>
        <h3 className={styles.settingsTitle}>📝 台本編集</h3>
        {!isReadOnly && (
          <button
            className={styles.addButton}
            onClick={onAddBeat}
            type="button"
          >
            ➕ 新しいビートを追加
          </button>
        )}
      </div>

      <div className={styles.beatsList}>
        {beats.length === 0 ? (
          <div className={styles.emptyBeats}>
            <p>まだビートが作成されていません。</p>
            <p>「新しいビートを追加」ボタンで台本を作成してください。</p>
          </div>
        ) : (
          beats.map((beat, index) => (
            <BeatItem
              key={index}
              index={index}
              beat={beat}
              speakerIds={speakerIds}
              speakers={speakers}
              faceReferenceKeys={faceReferenceKeys}
              onUpdate={(updatedBeat) => onUpdateBeat(index, updatedBeat)}
              onDelete={() => onDeleteBeat(index)}
              onMoveUp={index > 0 ? () => onMoveBeat(index, 'up') : undefined}
              onMoveDown={index < beats.length - 1 ? () => onMoveBeat(index, 'down') : undefined}
              isReadOnly={isReadOnly}
            />
          ))
        )}
      </div>

      {/* ビート作成のヒント */}
      {!isReadOnly && beats.length < 5 && (
        <div className={styles.beatsHint}>
          <h4>💡 ビート作成のコツ</h4>
          <ul>
            <li>各ビートは物語の1つの場面を表します</li>
            <li>話者を使い分けて、会話に変化をつけましょう</li>
            <li>画像の指示は具体的で視覚的に書きましょう</li>
            <li>シェイクスピア風の5幕構成がおすすめです</li>
          </ul>
        </div>
      )}
    </div>
  );
}