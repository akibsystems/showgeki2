import React, { useState } from 'react';
import { SpeechSettings } from './components/SpeechSettings';
import { BeatsEditor } from './components/BeatsEditor';
import { ImageSettings } from './components/ImageSettings';
import { AudioSettings } from './components/AudioSettings';
import { CaptionSettings } from './components/CaptionSettings';
import { SpeakerModal } from './components/modals/SpeakerModal';
import { ImageModal } from './components/modals/ImageModal';
import { useScriptDirector } from './hooks/useScriptDirector';
import { useSpeakerManager } from './hooks/useSpeakerManager';
import { useBeatsManager } from './hooks/useBeatsManager';
import { useImageManager } from './hooks/useImageManager';
import type { ScriptDirectorProps, VoiceId, CaptionParams } from './types';
import type { ImageReference } from './hooks/useImageManager';
import styles from './styles/ScriptDirector.module.css';

export function ScriptDirector({
  script,
  onChange,
  onSave,
  isReadOnly = false,
  className = '',
  previewData = null,
  previewStatus,
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
    setActiveTab,
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
    images: ((currentScript.imageParams as { images?: Record<string, ImageReference> })?.images || {}) as Record<string, ImageReference>,
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

  // BGM更新
  const handleUpdateBgm = (bgm: string) => {
    const updatedScript = {
      ...currentScript,
      audioParams: bgm === 'none' ? undefined : {
        padding: currentScript.audioParams?.padding ?? 0.3,
        introPadding: currentScript.audioParams?.introPadding ?? 1.0,
        closingPadding: currentScript.audioParams?.closingPadding ?? 0.8,
        outroPadding: currentScript.audioParams?.outroPadding ?? 1.0,
        bgmVolume: currentScript.audioParams?.bgmVolume ?? 0.2,
        audioVolume: currentScript.audioParams?.audioVolume ?? 1.0,
        bgm: {
          kind: 'url' as const,
          url: bgm
        }
      }
    };
    updateScript(updatedScript);
  };

  // 音量更新（MulmoScriptでは音量設定がないようなので、この関数は削除または空にする）
  const handleUpdateVolume = (volume: number) => {
    // MulmoScriptでは音量設定をサポートしていないため、何もしない
    console.log('Volume setting is not supported in MulmoScript format');
  };

  // 字幕有効/無効切り替え
  const handleToggleCaption = (enabled: boolean) => {
    const newScript = { ...currentScript };
    if (enabled && !newScript.captionParams) {
      // 字幕を有効にする場合、デフォルト設定を追加
      newScript.captionParams = {
        lang: 'ja',
        styles: [
          'font-size: 48px',
          'color: white',
          'text-shadow: 2px 2px 4px rgba(0,0,0,0.8)',
          'font-family: \'Noto Sans JP\', sans-serif',
          'font-weight: bold',
        ],
      } as CaptionParams;
    } else if (!enabled && newScript.captionParams) {
      // 字幕を無効にする場合、captionParamsを削除
      delete newScript.captionParams;
    }
    updateScript(newScript);
  };

  // 字幕言語更新
  const handleUpdateCaptionLang = (lang: string) => {
    if (!currentScript.captionParams) return;
    const newScript = {
      ...currentScript,
      captionParams: {
        ...currentScript.captionParams,
        lang,
      } as CaptionParams,
    };
    updateScript(newScript);
  };

  // 字幕スタイル更新
  const handleUpdateCaptionStyles = (styles: string[]) => {
    if (!currentScript.captionParams) return;
    const newScript = {
      ...currentScript,
      captionParams: {
        ...currentScript.captionParams,
        styles,
      } as CaptionParams,
    };
    updateScript(newScript);
  };

  return (
    <div className={`${styles.scriptDirector} ${className}`}>
      {/* タイトル編集セクションを削除 - ヘッダーで編集するため */}

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
        <button
          className={`${styles.tabButton} ${
            state.activeTab === 'audio' ? styles.tabButtonActive : ''
          }`}
          onClick={() => setActiveTab('audio')}
          disabled={isReadOnly}
        >
          🎵 BGM
        </button>
        <button
          className={`${styles.tabButton} ${
            state.activeTab === 'caption' ? styles.tabButtonActive : ''
          }`}
          onClick={() => setActiveTab('caption')}
          disabled={isReadOnly}
        >
          📝 字幕
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
            style={currentScript.imageParams?.style || 'アニメ風、ソフトパステルカラー、繊細な線画、シネマティック照明'}
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
            faceReferences={((currentScript.imageParams as { images?: Record<string, ImageReference> })?.images || {}) as Record<string, ImageReference>}
            previewData={previewData}
            previewStatus={previewStatus}
            onUpdateBeat={beatsManager.updateBeat}
            onAddBeat={beatsManager.addBeat}
            onDeleteBeat={beatsManager.deleteBeat}
            onMoveBeat={beatsManager.moveBeat}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* BGM設定タブ */}
        <div
          className={`${styles.tabContent} ${
            state.activeTab === 'audio' ? styles.tabContentActive : ''
          }`}
        >
          <AudioSettings
            bgm={currentScript.audioParams?.bgm?.url || 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3'}
            onUpdateBgm={handleUpdateBgm}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* 字幕設定タブ */}
        <div
          className={`${styles.tabContent} ${
            state.activeTab === 'caption' ? styles.tabContentActive : ''
          }`}
        >
          <CaptionSettings
            enabled={!!currentScript.captionParams}
            lang={(currentScript.captionParams as CaptionParams)?.lang || 'ja'}
            styles={(currentScript.captionParams as CaptionParams)?.styles || []}
            onToggleEnabled={handleToggleCaption}
            onUpdateLang={handleUpdateCaptionLang}
            onUpdateStyles={handleUpdateCaptionStyles}
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