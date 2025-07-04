import React, { useState } from 'react';
import type { MulmoBeat } from '@/lib/schemas';
import type { PreviewImage } from '@/types/preview';
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
  previewImage?: PreviewImage;
  previewTimestamp?: string;
  previewStatus?: string;
  isPreviewLoading?: boolean;
  onGeneratePreview?: () => void;
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
  previewImage,
  previewTimestamp,
  previewStatus,
  isPreviewLoading,
  onGeneratePreview,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isReadOnly = false,
}: BeatItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);

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
          <div className={styles.beatContentLeft}>
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

          {/* プレビュー画像表示（右側） */}
          <div className={styles.beatContentRight}>
            {/* プレビュー生成/再生成ボタン */}
            {!isReadOnly && onGeneratePreview && (
              <button
                className={styles.previewGenerateButton}
                onClick={onGeneratePreview}
                disabled={isPreviewLoading || previewStatus === 'processing' || previewStatus === 'pending'}
                type="button"
              >
                {isPreviewLoading || previewStatus === 'processing' || previewStatus === 'pending' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    生成中...
                  </>
                ) : previewImage ? (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    再生成
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    プレビュー生成
                  </>
                )}
              </button>
            )}
            
            <div className={styles.previewImageContainer}>
              {previewImage ? (
                // プレビュー画像がある場合
                <>
                  <img
                    src={previewTimestamp 
                      ? `${previewImage.url}${previewImage.url.includes('?') ? '&' : '?'}t=${new Date(previewTimestamp).getTime()}`
                      : previewImage.url
                    }
                    alt={`シーン ${index + 1} プレビュー`}
                    className={styles.previewImage}
                    loading="lazy"
                    onClick={() => setShowImageModal(true)}
                    style={{ cursor: 'pointer' }}
                  />
                </>
              ) : previewStatus === 'processing' || previewStatus === 'pending' ? (
                // プレビュー生成中
                <div className={styles.previewPlaceholder}>
                  <div className={styles.loadingSpinner}>
                    <svg className="animate-spin h-8 w-8 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className={styles.placeholderText}>画像を生成中...</p>
                </div>
              ) : (
                // プレビュー未生成
                <div className={styles.previewPlaceholder}>
                  <svg className={styles.placeholderIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className={styles.placeholderText}>プレビュー未生成</p>
                  <p className={styles.placeholderHint}>上部のプレビューボタンから生成できます</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 画像拡大モーダル */}
      {showImageModal && previewImage && (
        <div className={styles.imageModal} onClick={() => setShowImageModal(false)}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.imageModalClose}
              onClick={() => setShowImageModal(false)}
              aria-label="閉じる"
            >
              ×
            </button>
            <img
              src={previewTimestamp 
                ? `${previewImage.url}${previewImage.url.includes('?') ? '&' : '?'}t=${new Date(previewTimestamp).getTime()}`
                : previewImage.url
              }
              alt={`シーン ${index + 1} プレビュー`}
              className={styles.imageModalImage}
            />
            <div className={styles.imageModalInfo}>
              <h3 className={styles.imageModalTitle}>シーン {index + 1}</h3>
              {beat.imagePrompt && (
                <div className={styles.imageModalPrompt}>
                  <span className={styles.imageModalPromptLabel}>画像生成プロンプト:</span>
                  <p className={styles.imageModalPromptText}>{beat.imagePrompt}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}