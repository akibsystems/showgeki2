import React, { useState, useEffect } from 'react';
import type { VoiceId } from '../../types';
import styles from '../../styles/ScriptDirector.module.css';

interface SpeakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (speakerId: string, voiceId: VoiceId, displayName: { ja: string; en: string }) => void;
  initialData?: {
    speakerId: string;
    voiceId: VoiceId;
    displayName: { ja: string; en: string };
  };
  existingSpeakerIds: string[];
  isEditing?: boolean;
}

const VOICE_OPTIONS: { value: VoiceId; label: string; description: string }[] = [
  { value: 'alloy', label: 'Alloy', description: 'クリアで自然な声' },
  { value: 'echo', label: 'Echo', description: '落ち着いた大人の声' },
  { value: 'fable', label: 'Fable', description: '物語を語るような声' },
  { value: 'nova', label: 'Nova', description: '明るく若々しい声' },
  { value: 'onyx', label: 'Onyx', description: '力強い男性の声' },
  { value: 'shimmer', label: 'Shimmer', description: '優しく親しみやすい声' },
];

export function SpeakerModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingSpeakerIds,
  isEditing = false,
}: SpeakerModalProps) {
  const [formData, setFormData] = useState({
    speakerId: '',
    voiceId: 'shimmer' as VoiceId,
    displayName: {
      ja: '',
      en: '',
    },
  });
  const [errors, setErrors] = useState<string[]>([]);

  // 初期データを設定
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          speakerId: '',
          voiceId: 'shimmer',
          displayName: {
            ja: '',
            en: '',
          },
        });
      }
      setErrors([]);
    }
  }, [isOpen, initialData]);

  // バリデーション
  const validateForm = (): string[] => {
    const newErrors: string[] = [];

    // 話者IDバリデーション
    if (!formData.speakerId.trim()) {
      newErrors.push('話者IDを入力してください');
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.speakerId)) {
      newErrors.push('話者IDは英数字とアンダースコアのみ使用可能で、英字で始まる必要があります');
    } else if (formData.speakerId.length > 50) {
      newErrors.push('話者IDは50文字以内で入力してください');
    } else if (!isEditing && existingSpeakerIds.includes(formData.speakerId)) {
      newErrors.push('この話者IDは既に使用されています');
    }

    // 表示名バリデーション
    if (!formData.displayName.ja.trim()) {
      newErrors.push('日本語表示名を入力してください');
    } else if (formData.displayName.ja.length > 100) {
      newErrors.push('日本語表示名は100文字以内で入力してください');
    }

    if (!formData.displayName.en.trim()) {
      newErrors.push('英語表示名を入力してください');
    } else if (formData.displayName.en.length > 100) {
      newErrors.push('英語表示名は100文字以内で入力してください');
    }

    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSave(formData.speakerId, formData.voiceId, formData.displayName);
    onClose();
  };

  const handleClose = () => {
    setErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            🎤 {isEditing ? '話者を編集' : '話者を追加'}
          </h3>
          <button
            className={styles.modalCloseButton}
            onClick={handleClose}
            type="button"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {/* 話者ID */}
          <div className={styles.formGroup}>
            <label htmlFor="speaker-id" className={styles.formLabel}>
              話者ID (英数字のみ):
            </label>
            <input
              id="speaker-id"
              type="text"
              value={formData.speakerId}
              onChange={(e) => setFormData(prev => ({ ...prev, speakerId: e.target.value }))}
              className={styles.formInput}
              placeholder="例: NewCharacter"
              maxLength={50}
              disabled={isEditing} // 編集時はID変更不可
            />
            <div className={styles.formHint}>
              英字で始まり、英数字とアンダースコアのみ使用可能
            </div>
          </div>

          {/* 音声選択 */}
          <div className={styles.formGroup}>
            <label htmlFor="voice-id" className={styles.formLabel}>
              音声:
            </label>
            <select
              id="voice-id"
              value={formData.voiceId}
              onChange={(e) => setFormData(prev => ({ ...prev, voiceId: e.target.value as VoiceId }))}
              className={styles.formSelect}
            >
              {VOICE_OPTIONS.map((voice) => (
                <option key={voice.value} value={voice.value}>
                  {voice.label} - {voice.description}
                </option>
              ))}
            </select>
          </div>

          {/* 日本語表示名 */}
          <div className={styles.formGroup}>
            <label htmlFor="display-name-ja" className={styles.formLabel}>
              日本語表示名:
            </label>
            <input
              id="display-name-ja"
              type="text"
              value={formData.displayName.ja}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                displayName: { ...prev.displayName, ja: e.target.value }
              }))}
              className={styles.formInput}
              placeholder="例: 新キャラクター"
              maxLength={100}
            />
          </div>

          {/* 英語表示名 */}
          <div className={styles.formGroup}>
            <label htmlFor="display-name-en" className={styles.formLabel}>
              英語表示名:
            </label>
            <input
              id="display-name-en"
              type="text"
              value={formData.displayName.en}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                displayName: { ...prev.displayName, en: e.target.value }
              }))}
              className={styles.formInput}
              placeholder="例: New Character"
              maxLength={100}
            />
          </div>

          {/* エラー表示 */}
          {errors.length > 0 && (
            <div className={styles.errorList}>
              {errors.map((error, index) => (
                <div key={index} className={styles.errorMessage}>
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* アクションボタン */}
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className={styles.saveButton}
            >
              {isEditing ? '更新する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}