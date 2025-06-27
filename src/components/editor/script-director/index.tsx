import React, { useState } from 'react';
import { TitleEditor } from './components/TitleEditor';
import { SpeechSettings } from './components/SpeechSettings';
import { BeatsEditor } from './components/BeatsEditor';
import { ImageSettings } from './components/ImageSettings';
import { SpeakerModal } from './components/modals/SpeakerModal';
import { ImageModal } from './components/modals/ImageModal';
import { useScriptDirector } from './hooks/useScriptDirector';
import { useSpeakerManager } from './hooks/useSpeakerManager';
import { useBeatsManager } from './hooks/useBeatsManager';
import { useImageManager } from './hooks/useImageManager';
import type { ScriptDirectorProps, VoiceId } from './types';
import styles from './styles/ScriptDirector.module.css';

export function ScriptDirector({
  script,
  onChange,
  onSave,
  isReadOnly = false,
  className = '',
}: ScriptDirectorProps) {
  const [editingSpeaker, setEditingSpeaker] = useState<{
    speakerId: string;
    voiceId: VoiceId;
    displayName: { ja: string; en: string };
  } | null>(null);
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);

  const [editingImage, setEditingImage] = useState<{
    imageName: string;
    sourceType: 'url' | 'path';
    source: string;
  } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const {
    script: currentScript,
    state,
    updateTitle,
    setActiveTab,
    validateTitle,
    updateScript,
  } = useScriptDirector(script, onChange);

  // 音声設定の管理
  const speakerManager = useSpeakerManager({
    speakers: (currentScript.speechParams?.speakers || {}) as Record<string, { voiceId: VoiceId; displayName?: Record<string, string> }>,
    onUpdate: (speakers) => {
      const newScript = {
        ...currentScript,
        speechParams: {
          ...currentScript.speechParams,
          provider: 'openai' as const,
          speakers,
        },
      };
      updateScript(newScript);
    },
  });

  // ビート管理
  const beatsManager = useBeatsManager({
    beats: currentScript.beats || [],
    onUpdate: (beats) => {
      const newScript = { ...currentScript, beats };
      updateScript(newScript);
    },
  });

  // 画像管理
  const imageManager = useImageManager({
    images: (currentScript.imageParams as any)?.images || {},
    onUpdate: (images) => {
      // MulmoScript用にクリーンアップ（storagePathとisUploadedFileを除去）
      const cleanImages = Object.fromEntries(
        Object.entries(images).map(([key, image]) => {
          const { storagePath, isUploadedFile, ...cleanImage } = image;
          return [key, cleanImage];
        })
      );
      
      const newScript = {
        ...currentScript,
        imageParams: {
          ...currentScript.imageParams,
          images: cleanImages,
        },
      };
      updateScript(newScript);
    },
  });

  // タイトルバリデーション
  const handleTitleValidation = (title: string) => {
    return validateTitle(title);
  };

  // 話者追加
  const handleAddSpeaker = () => {
    setEditingSpeaker(null);
    setShowSpeakerModal(true);
  };

  // 話者編集
  const handleEditSpeaker = (speakerId: string) => {
    const speaker = speakerManager.getSpeaker(speakerId);
    if (speaker) {
      setEditingSpeaker({
        speakerId,
        voiceId: speaker.voiceId as VoiceId,
        displayName: {
          ja: speaker.displayName?.ja || speaker.displayName?.['ja'] || speakerId,
          en: speaker.displayName?.en || speaker.displayName?.['en'] || speakerId,
        },
      });
      setShowSpeakerModal(true);
    }
  };

  // 話者保存
  const handleSaveSpeaker = (speakerId: string, voiceId: VoiceId, displayName: { ja: string; en: string }) => {
    try {
      if (editingSpeaker) {
        // 編集モード
        speakerManager.updateSpeaker(editingSpeaker.speakerId, { voiceId, displayName });
      } else {
        // 新規追加モード
        speakerManager.addSpeaker(speakerId, voiceId, displayName);
      }
      setShowSpeakerModal(false);
      setEditingSpeaker(null);
    } catch (error) {
      console.error('話者保存エラー:', error);
      // エラーハンドリング（必要に応じてUIに表示）
    }
  };

  // モーダルクローズ
  const handleCloseModal = () => {
    setShowSpeakerModal(false);
    setEditingSpeaker(null);
  };

  // スタイル更新
  const handleUpdateStyle = (style: string) => {
    const newScript = {
      ...currentScript,
      imageParams: {
        ...currentScript.imageParams,
        style,
      },
    };
    updateScript(newScript);
  };

  // 画像追加
  const handleAddImage = () => {
    setEditingImage(null);
    setShowImageModal(true);
  };

  // 画像編集
  const handleEditImage = (imageName: string) => {
    const image = imageManager.getImage(imageName);
    if (image) {
      setEditingImage({
        imageName,
        sourceType: image.isUploadedFile ? 'path' : 'url', // UI表示用のタイプ
        source: image.source.url,
      });
      setShowImageModal(true);
    }
  };

  // 画像保存（新しいシグネチャ）
  const handleSaveImage = (imageName: string, url: string, isUploadedFile: boolean, storagePath?: string) => {
    try {
      if (editingImage) {
        // 編集モード
        imageManager.updateImage(editingImage.imageName, {
          name: imageName,
          url,
          isUploadedFile,
          storagePath,
        });
      } else {
        // 新規追加モード
        imageManager.addImage(imageName, url, isUploadedFile, storagePath);
      }
      setShowImageModal(false);
      setEditingImage(null);
    } catch (error) {
      console.error('画像保存エラー:', error);
      // エラーハンドリング（必要に応じてUIに表示）
    }
  };

  // 画像モーダルクローズ
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setEditingImage(null);
  };

  return (
    <div className={`${styles.scriptDirector} ${className}`}>
      {/* タイトル編集セクション */}
      <TitleEditor
        title={currentScript.title || ''}
        onChange={updateTitle}
        onValidate={handleTitleValidation}
        isReadOnly={isReadOnly}
        error={state.errors.title}
      />

      {/* モバイル用タブナビゲーション */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tabButton} ${
            state.activeTab === 'image' ? styles.tabButtonActive : ''
          }`}
          onClick={() => setActiveTab('image')}
          disabled={isReadOnly}
        >
          🎨 画像
        </button>
        <button
          className={`${styles.tabButton} ${
            state.activeTab === 'speech' ? styles.tabButtonActive : ''
          }`}
          onClick={() => setActiveTab('speech')}
          disabled={isReadOnly}
        >
          🎤 音声
        </button>
        <button
          className={`${styles.tabButton} ${
            state.activeTab === 'beats' ? styles.tabButtonActive : ''
          }`}
          onClick={() => setActiveTab('beats')}
          disabled={isReadOnly}
        >
          📝 台本
        </button>
      </div>

      {/* コンテンツエリア */}
      <div className={styles.contentArea}>
        {/* 画像設定タブ */}
        <div
          className={`${styles.tabContent} ${
            state.activeTab === 'image' ? styles.tabContentActive : ''
          }`}
        >
          <ImageSettings
            style={currentScript.imageParams?.style || 'ジブリ風アニメ、ソフトパステルカラー、繊細な線画、シネマティック照明'}
            images={imageManager.images}
            onUpdateStyle={handleUpdateStyle}
            onAddImage={handleAddImage}
            onEditImage={handleEditImage}
            onDeleteImage={async (imageName: string) => {
              try {
                await imageManager.deleteImage(imageName);
              } catch (error) {
                console.error('削除エラー:', error);
              }
            }}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* 音声設定タブ */}
        <div
          className={`${styles.tabContent} ${
            state.activeTab === 'speech' ? styles.tabContentActive : ''
          }`}
        >
          <SpeechSettings
            speakers={speakerManager.speakers}
            onAddSpeaker={handleAddSpeaker}
            onEditSpeaker={handleEditSpeaker}
            onDeleteSpeaker={speakerManager.deleteSpeaker}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* 台本編集タブ */}
        <div
          className={`${styles.tabContent} ${
            state.activeTab === 'beats' ? styles.tabContentActive : ''
          }`}
        >
          <BeatsEditor
            beats={beatsManager.beats}
            speakers={speakerManager.speakers}
            faceReferences={(currentScript.imageParams as any)?.images || {}}
            onUpdateBeat={beatsManager.updateBeat}
            onAddBeat={beatsManager.addBeat}
            onDeleteBeat={beatsManager.deleteBeat}
            onMoveBeat={beatsManager.moveBeat}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>

      {/* 話者追加/編集モーダル */}
      <SpeakerModal
        isOpen={showSpeakerModal}
        onClose={handleCloseModal}
        onSave={handleSaveSpeaker}
        initialData={editingSpeaker || undefined}
        existingSpeakerIds={speakerManager.getSpeakerIds()}
        isEditing={!!editingSpeaker}
      />

      {/* 画像追加/編集モーダル */}
      <ImageModal
        isOpen={showImageModal}
        onClose={handleCloseImageModal}
        onSave={handleSaveImage}
        initialData={editingImage || undefined}
        existingImageNames={imageManager.getImageNames()}
        isEditing={!!editingImage}
      />

      {/* デバッグ情報（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <details style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>
          <summary>Debug Info (Dev Only)</summary>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.7rem' }}>
            Active Tab: {state.activeTab}{'\n'}
            Title: {currentScript.title || '(empty)'}{'\n'}
            Speakers: {Object.keys(speakerManager.speakers).length}{'\n'}
            Images: {imageManager.getImageCount()}{'\n'}
            Beats: {beatsManager.getBeatCount()}{'\n'}
            Errors: {JSON.stringify(state.errors, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// エクスポート用のデフォルト
export default ScriptDirector;