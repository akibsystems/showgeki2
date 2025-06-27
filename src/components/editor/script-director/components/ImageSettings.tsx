import React, { useState } from 'react';
import styles from '../styles/ScriptDirector.module.css';

interface ImageReference {
  type: 'image';
  source: {
    kind: 'url';
    url: string;
  };
  storagePath?: string;
  isUploadedFile?: boolean;
}

interface ImageSettingsProps {
  style: string;
  images: Record<string, ImageReference>;
  onUpdateStyle: (style: string) => void;
  onAddImage: () => void;
  onEditImage: (imageName: string) => void;
  onDeleteImage: (imageName: string) => void;
  isReadOnly?: boolean;
}

const STYLE_PRESETS = [
  {
    value: 'ジブリ風アニメ、ソフトパステルカラー、繊細な線画、シネマティック照明',
    label: 'ジブリ風アニメ（デフォルト）',
    description: 'ソフトパステルカラー、繊細な線画'
  },
  {
    value: 'リアル写真、高解像度、プロフェッショナル照明',
    label: 'リアル写真',
    description: '高解像度、プロフェッショナル照明'
  },
  {
    value: '油絵風、古典的な絵画スタイル、豊かな色彩',
    label: '油絵風',
    description: '古典的な絵画スタイル、豊かな色彩'
  },
  {
    value: '水彩画風、柔らかいタッチ、透明感のある色合い',
    label: '水彩画風',
    description: '柔らかいタッチ、透明感のある色合い'
  },
  {
    value: 'アニメーション風、鮮やかな色彩、ダイナミックな構図',
    label: 'アニメーション風',
    description: '鮮やかな色彩、ダイナミックな構図'
  }
];

export function ImageSettings({
  style,
  images,
  onUpdateStyle,
  onAddImage,
  onEditImage,
  onDeleteImage,
  isReadOnly = false,
}: ImageSettingsProps) {
  const [isCustomStyle, setIsCustomStyle] = useState(
    !STYLE_PRESETS.some(preset => preset.value === style)
  );

  const imageEntries = Object.entries(images);

  const handleStylePresetChange = (selectedStyle: string) => {
    if (selectedStyle === 'custom') {
      setIsCustomStyle(true);
      // カスタムの場合は現在のスタイルを保持
    } else {
      setIsCustomStyle(false);
      onUpdateStyle(selectedStyle);
    }
  };

  const handleCustomStyleChange = (customStyle: string) => {
    onUpdateStyle(customStyle);
  };

  const getImageSourceDisplay = (image: ImageReference) => {
    if (image.isUploadedFile) {
      // ファイルアップロードの場合は「アップロード済み」と表示
      return `📁 アップロード済み`;
    } else if (image.source.url) {
      return `🔗 ${image.source.url.substring(0, 50)}${image.source.url.length > 50 ? '...' : ''}`;
    }
    return '❓ 不明なソース';
  };

  return (
    <div className={styles.imageSettings}>
      <div className={styles.settingsHeader}>
        <h3 className={styles.settingsTitle}>🎨 画像設定</h3>
        <p className={styles.settingsDescription}>
          画像生成のスタイルと顔参照画像を設定します
        </p>
      </div>

      {/* スタイル設定セクション */}
      <div className={styles.styleSection}>
        <h4 className={styles.sectionTitle}>画像スタイル</h4>
        
        <div className={styles.styleSelector}>
          <label htmlFor="style-preset" className={styles.formLabel}>
            プリセットスタイル:
          </label>
          <select
            id="style-preset"
            value={isCustomStyle ? 'custom' : style}
            onChange={(e) => handleStylePresetChange(e.target.value)}
            className={styles.formSelect}
            disabled={isReadOnly}
          >
            {STYLE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
            <option value="custom">カスタム入力</option>
          </select>
          
          {!isCustomStyle && (
            <div className={styles.presetDescription}>
              {STYLE_PRESETS.find(p => p.value === style)?.description}
            </div>
          )}
        </div>

        {isCustomStyle && (
          <div className={styles.customStyleSection}>
            <label htmlFor="custom-style" className={styles.formLabel}>
              カスタムスタイル:
            </label>
            <textarea
              id="custom-style"
              value={style}
              onChange={(e) => handleCustomStyleChange(e.target.value)}
              className={styles.styleTextarea}
              placeholder="例: 写実的な油絵風、温かい色調、印象派の技法..."
              disabled={isReadOnly}
              rows={3}
            />
            <div className={styles.formHint}>
              画像生成AIに伝えたいスタイルを詳しく記述してください
            </div>
          </div>
        )}
      </div>

      {/* 顔参照画像セクション */}
      <div className={styles.faceReferenceSection}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>🎭 顔参照画像</h4>
          {!isReadOnly && (
            <button
              className={styles.addButton}
              onClick={onAddImage}
              type="button"
            >
              ➕ 顔参照を追加
            </button>
          )}
        </div>

        <div className={styles.faceReferenceDescription}>
          <p>特定のキャラクターの顔を一貫して生成するための参照画像です。</p>
          <p>OpenAIのGPT-4 Visionが対応している形式（JPEG、PNG、WebP、GIF）をサポートします。</p>
        </div>

        <div className={styles.imagesList}>
          {imageEntries.length === 0 ? (
            <div className={styles.emptyImages}>
              <p>顔参照画像が設定されていません。</p>
              <p>「顔参照を追加」ボタンで画像を追加してください。</p>
            </div>
          ) : (
            imageEntries.map(([imageName, image]) => (
              <div key={imageName} className={styles.imageItem}>
                <div className={styles.imagePreview}>
                  {/* URLが設定されていればプレビュー表示 */}
                  {image.source.url ? (
                    <img
                      src={image.source.url}
                      alt={imageName}
                      className={styles.previewImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={styles.previewPlaceholder}>
                      📷
                    </div>
                  )}
                </div>
                
                <div className={styles.imageInfo}>
                  <div className={styles.imageHeader}>
                    <span className={styles.imageName}>{imageName}</span>
                  </div>
                  
                  <div className={styles.imageSource}>
                    {getImageSourceDisplay(image)}
                  </div>
                </div>

                {!isReadOnly && (
                  <div className={styles.imageActions}>
                    <button
                      className={styles.editButton}
                      onClick={() => onEditImage(imageName)}
                      type="button"
                      aria-label={`${imageName}を編集`}
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => onDeleteImage(imageName)}
                      type="button"
                      aria-label={`${imageName}を削除`}
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

      {/* 使用上の注意 */}
      <div className={styles.usageNotice}>
        <h4 className={styles.sectionTitle}>💡 使用上の注意</h4>
        <ul className={styles.noticeList}>
          <li>顔参照画像は高品質で顔がはっきり見えるものを選んでください</li>
          <li>画像サイズは1024x1024、1536x1024、1024x1536のいずれかが推奨です</li>
          <li>OpenAIプロバイダー（model: "gpt-image-1"）でのみ利用可能です</li>
          <li>著作権に配慮し、使用許可のある画像のみご利用ください</li>
        </ul>
      </div>
    </div>
  );
}