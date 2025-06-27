import React, { useState, useEffect, useRef } from 'react';
import styles from '../../styles/ScriptDirector.module.css';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageName: string, url: string, isUploadedFile: boolean, storagePath?: string) => void;
  initialData?: {
    imageName: string;
    sourceType: 'url' | 'path';
    source: string;
  };
  existingImageNames: string[];
  isEditing?: boolean;
}

export function ImageModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingImageNames,
  isEditing = false,
}: ImageModalProps) {
  const [formData, setFormData] = useState({
    imageName: '',
    sourceType: 'url' as 'url' | 'path',
    url: '',
    file: null as File | null,
    preview: null as string | null,
    storagePath: null as string | null,
    isUploadedFile: false, // アップロード完了フラグ
    uploadedFileName: null as string | null, // アップロードファイル名
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初期データを設定
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          imageName: initialData.imageName,
          sourceType: initialData.sourceType,
          url: initialData.sourceType === 'url' ? initialData.source : '',
          file: null,
          preview: initialData.sourceType === 'url' ? initialData.source : null,
          storagePath: null,
          isUploadedFile: false,
          uploadedFileName: null,
        });
      } else {
        setFormData({
          imageName: '',
          sourceType: 'url',
          url: '',
          file: null,
          preview: null,
          storagePath: null,
          isUploadedFile: false,
          uploadedFileName: null,
        });
      }
      setErrors([]);
    }
  }, [isOpen, initialData]);

  // バリデーション
  const validateForm = (): string[] => {
    const newErrors: string[] = [];

    // 画像名バリデーション（緩和版）
    if (!formData.imageName.trim()) {
      newErrors.push('画像名を入力してください');
    } else if (formData.imageName.length > 50) {
      newErrors.push('画像名は50文字以内で入力してください');
    } else if (!isEditing && existingImageNames.includes(formData.imageName)) {
      newErrors.push('この画像名は既に使用されています');
    }

    // ソースバリデーション
    if (formData.sourceType === 'url') {
      if (!formData.url.trim()) {
        newErrors.push('画像URLを入力してください');
      } else {
        try {
          const url = new URL(formData.url);
          
          // 基本的なURL形式チェック（httpsまたはhttp）
          if (!['http:', 'https:'].includes(url.protocol)) {
            newErrors.push('HTTPまたはHTTPS URLを入力してください');
          }
          
          // 拡張子チェックは緩和（拡張子がある場合のみチェック）
          const urlPath = url.pathname.toLowerCase();
          const hasExtension = urlPath.includes('.');
          if (hasExtension) {
            const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.tiff', '.ico'];
            const hasValidExtension = validExtensions.some(ext => urlPath.includes(ext));
            
            if (!hasValidExtension) {
              // 警告として表示するが、エラーにはしない
              console.warn('Unknown image extension, but allowing URL:', formData.url);
            }
          }
          
        } catch {
          newErrors.push('有効なURLを入力してください');
        }
      }
    } else {
      if (!formData.file) {
        newErrors.push('画像ファイルを選択してください');
      }
    }

    return newErrors;
  };

  // ファイル選択ハンドラー
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイル形式チェック
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setErrors(['サポートされていないファイル形式です。JPEG、PNG、WebP、GIFのいずれかを選択してください']);
      return;
    }

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      setErrors(['ファイルサイズが大きすぎます。10MB以下のファイルを選択してください']);
      return;
    }

    setFormData(prev => ({ ...prev, file }));
    setErrors([]);

    // プレビュー生成
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({ ...prev, preview: e.target?.result as string }));
    };
    reader.readAsDataURL(file);

    // Supabaseアップロード処理
    if (formData.imageName.trim()) {
      await uploadFileToSupabase(file);
    }
  };

  // Supabaseアップロード処理
  const uploadFileToSupabase = async (file: File) => {
    setIsUploading(true);
    setErrors([]);

    try {
      // UIDを取得
      const { getOrCreateUid } = await import('@/lib/uid');
      const uid = getOrCreateUid();

      if (!uid) {
        throw new Error('User ID could not be obtained');
      }

      // FormDataを作成
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('imageName', formData.imageName);

      // API呼び出し
      const response = await fetch('/api/upload-face-reference', {
        method: 'POST',
        headers: {
          'X-User-UID': uid,
        },
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      // アップロード成功時にURLとstoragePathを設定（内部的に保持、UI上はファイルアップロードのまま）
      setFormData(prev => ({
        ...prev,
        url: result.url,
        // sourceTypeは'path'のまま変更しない（UI表示用）
        preview: result.url,
        storagePath: result.path,
        isUploadedFile: true,
        uploadedFileName: file.name,
      }));

    } catch (error) {
      console.error('Upload error:', error);
      setErrors([error instanceof Error ? error.message : 'アップロードに失敗しました']);
    } finally {
      setIsUploading(false);
    }
  };

  // URL変更ハンドラー
  const handleUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, url, preview: null }));
    
    if (url.trim()) {
      // URL形式の基本チェック
      try {
        new URL(url);
        setFormData(prev => ({ ...prev, preview: url }));
      } catch {
        // 無効なURLの場合はプレビューをクリア
      }
    }
  };

  // URL検証
  const validateUrl = async () => {
    if (!formData.url.trim()) return;

    setIsValidatingUrl(true);
    try {
      const response = await fetch(formData.url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        setErrors(['URLにアクセスできません']);
      } else if (!contentType || !contentType.startsWith('image/')) {
        setErrors(['指定されたURLは画像ファイルではありません']);
      } else {
        setErrors([]);
      }
    } catch {
      setErrors(['URLの検証に失敗しました']);
    } finally {
      setIsValidatingUrl(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // ファイルが選択されているがまだアップロードされていない場合
    if (formData.sourceType === 'path' && formData.file && !formData.url) {
      await uploadFileToSupabase(formData.file);
      // アップロード後にURLが設定されるまで待つ
      if (!formData.url) {
        setErrors(['アップロードに失敗しました。もう一度お試しください。']);
        return;
      }
    }

    // 新しいシグネチャで保存：すべてURLとして扱い、ファイルアップロード由来かどうかをフラグで管理
    const isUploadedFile = formData.sourceType === 'path';
    onSave(formData.imageName, formData.url, isUploadedFile, formData.storagePath || undefined);
    
    onClose();
  };

  // 画像名変更ハンドラー
  const handleImageNameChange = (imageName: string) => {
    setFormData(prev => ({ ...prev, imageName }));
    
    // ファイルが選択されている場合は再アップロード
    if (formData.file && imageName.trim()) {
      uploadFileToSupabase(formData.file);
    }
  };

  const handleClose = () => {
    setErrors([]);
    setFormData({
      imageName: '',
      sourceType: 'url',
      url: '',
      file: null,
      preview: null,
      storagePath: null,
      isUploadedFile: false,
      uploadedFileName: null,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            🎭 {isEditing ? '顔参照画像を編集' : '顔参照画像を追加'}
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
          {/* 画像名 */}
          <div className={styles.formGroup}>
            <label htmlFor="image-name" className={styles.formLabel}>
              キャラクター名:
            </label>
            <input
              id="image-name"
              type="text"
              value={formData.imageName}
              onChange={(e) => handleImageNameChange(e.target.value)}
              className={styles.formInput}
              placeholder="例: 村口、大谷、キャラクター1"
              maxLength={50}
              disabled={isEditing || isUploading} // 編集時やアップロード中は変更不可
            />
            <div className={styles.formHint}>
              ビート編集で選択する際の表示名になります（日本語・英数字・記号など自由に入力可能）
            </div>
          </div>

          {/* ソースタイプ選択 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>画像ソース:</label>
            <div className={styles.sourceTypeSelector}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  value="url"
                  checked={formData.sourceType === 'url'}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    sourceType: e.target.value as 'url',
                    file: null,
                    preview: prev.url || null
                  }))}
                  className={styles.radioInput}
                />
                <span>URL指定</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  value="path"
                  checked={formData.sourceType === 'path'}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    sourceType: e.target.value as 'path',
                    url: '',
                    preview: null
                  }))}
                  className={styles.radioInput}
                />
                <span>ファイルアップロード</span>
              </label>
            </div>
          </div>

          {/* URL入力 */}
          {formData.sourceType === 'url' && (
            <div className={styles.formGroup}>
              <label htmlFor="image-url" className={styles.formLabel}>
                画像URL:
              </label>
              <input
                id="image-url"
                type="url"
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onBlur={validateUrl}
                className={styles.formInput}
                placeholder="https://example.com/image.jpg"
              />
              {isValidatingUrl && (
                <div className={styles.validatingMessage}>
                  URL検証中...
                </div>
              )}
              {isUploading && (
                <div className={styles.validatingMessage}>
                  画像をアップロード中...
                </div>
              )}
              <div className={styles.formHint}>
                HTTPSまたはHTTPの画像URLを入力してください<br />
                対応形式：JPEG、PNG、WebP、GIF、SVG、BMP、TIFF等（拡張子なしでも可）
              </div>
            </div>
          )}

          {/* ファイル選択 */}
          {formData.sourceType === 'path' && (
            <div className={styles.formGroup}>
              <label htmlFor="image-file" className={styles.formLabel}>
                画像ファイル:
              </label>
              
              {!formData.isUploadedFile ? (
                <div className={styles.fileInputWrapper}>
                  <input
                    id="image-file"
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={styles.fileSelectButton}
                    disabled={isUploading}
                  >
                    📁 ファイルを選択
                  </button>
                  {formData.file && !formData.isUploadedFile && (
                    <span className={styles.fileName}>{formData.file.name}</span>
                  )}
                </div>
              ) : (
                <div className={styles.uploadedFileStatus}>
                  <div className={styles.uploadedIcon}>✅</div>
                  <div className={styles.uploadedInfo}>
                    <div className={styles.uploadedLabel}>アップロード完了</div>
                    <div className={styles.uploadedFileName}>{formData.uploadedFileName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        file: null,
                        isUploadedFile: false,
                        uploadedFileName: null,
                        url: '',
                        storagePath: null,
                        preview: null,
                      }));
                    }}
                    className={styles.reUploadButton}
                  >
                    再選択
                  </button>
                </div>
              )}
              
              {isUploading && (
                <div className={styles.validatingMessage}>
                  Supabaseストレージにアップロード中...
                </div>
              )}
              
              <div className={styles.formHint}>
                JPEG、PNG、WebP、GIF形式（10MB以下）
              </div>
            </div>
          )}

          {/* プレビュー */}
          {formData.preview && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>プレビュー:</label>
              <div className={styles.imagePreviewContainer}>
                <img
                  src={formData.preview}
                  alt="プレビュー"
                  className={styles.modalPreviewImage}
                  onError={() => {
                    setFormData(prev => ({ ...prev, preview: null }));
                    setErrors(['画像の読み込みに失敗しました']);
                  }}
                />
              </div>
            </div>
          )}

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
              disabled={isValidatingUrl || isUploading}
            >
              {isUploading ? 'アップロード中...' : isEditing ? '更新する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}