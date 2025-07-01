import { useCallback } from 'react';

export interface ImageReference {
  type: 'image';
  source: {
    kind: 'url'; // 内部的には常にurl
    url: string;
  };
  // Supabaseストレージのパス（削除用）
  storagePath?: string;
  // UI表示用：ファイルアップロード由来かどうか
  isUploadedFile?: boolean;
}

interface ImageManagerProps {
  images: Record<string, ImageReference>;
  onUpdate: (images: Record<string, ImageReference>) => void;
}

export function useImageManager({ images, onUpdate }: ImageManagerProps) {
  // 新しい画像を追加
  const addImage = useCallback((
    imageName: string,
    url: string,
    isUploadedFile: boolean = false,
    storagePath?: string
  ) => {
    if (images[imageName]) {
      throw new Error(`画像名 "${imageName}" は既に存在します`);
    }

    const newImage: ImageReference = {
      type: 'image',
      source: {
        kind: 'url',
        url: url
      },
      ...(storagePath && { storagePath }),
      ...(isUploadedFile && { isUploadedFile })
    };

    const newImages = {
      ...images,
      [imageName]: newImage,
    };

    onUpdate(newImages);
    return imageName;
  }, [images, onUpdate]);

  // 画像を更新
  const updateImage = useCallback((
    imageName: string,
    updates: {
      name?: string;
      url?: string;
      isUploadedFile?: boolean;
      storagePath?: string;
    }
  ) => {
    if (!images[imageName]) {
      throw new Error(`画像名 "${imageName}" が見つかりません`);
    }

    const currentImage = images[imageName];
    let newImages = { ...images };

    // 名前が変更された場合
    if (updates.name && updates.name !== imageName) {
      if (newImages[updates.name]) {
        throw new Error(`画像名 "${updates.name}" は既に存在します`);
      }
      
      // 古い名前を削除して新しい名前で追加
      delete newImages[imageName];
      newImages[updates.name] = { ...currentImage };
    }

    const targetName = updates.name || imageName;
    const targetImage = newImages[targetName];

    // URLの更新
    if (updates.url) {
      targetImage.source = {
        kind: 'url',
        url: updates.url
      };
    }

    // isUploadedFileフラグの更新
    if (updates.isUploadedFile !== undefined) {
      if (updates.isUploadedFile) {
        targetImage.isUploadedFile = true;
      } else {
        delete targetImage.isUploadedFile;
      }
    }

    // storagePathの更新
    if (updates.storagePath !== undefined) {
      if (updates.storagePath) {
        targetImage.storagePath = updates.storagePath;
      } else {
        delete targetImage.storagePath;
      }
    }

    onUpdate(newImages);
    return targetName;
  }, [images, onUpdate]);

  // MulmoScript用にstoragePathとisUploadedFileを除去したimagesを取得
  const getCleanImagesForMulmoScript = useCallback(() => {
    const cleanImages: Record<string, Omit<ImageReference, 'storagePath' | 'isUploadedFile'>> = {};
    
    Object.entries(images).forEach(([key, image]) => {
      const { storagePath, isUploadedFile, ...cleanImage } = image;
      cleanImages[key] = cleanImage;
    });
    
    return cleanImages;
  }, [images]);

  // 画像を削除
  const deleteImage = useCallback(async (imageName: string) => {
    if (!images[imageName]) {
      throw new Error(`画像名 "${imageName}" が見つかりません`);
    }

    const imageToDelete = images[imageName];
    
    // Supabaseストレージからも削除
    if (imageToDelete.storagePath) {
      try {
        // UIDを取得
        const { getOrCreateUid } = await import('@/lib/uid');
        const uid = getOrCreateUid();

        if (uid) {
          await fetch('/api/delete-face-reference', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-User-UID': uid,
            },
            body: JSON.stringify({ filePath: imageToDelete.storagePath }),
          });
        }
      } catch (error) {
        console.error('Failed to delete from storage:', error);
        // ストレージからの削除に失敗してもローカルからは削除する
      }
    }

    const newImages = { ...images };
    delete newImages[imageName];
    onUpdate(newImages);
  }, [images, onUpdate]);

  // 画像名の重複チェック
  const isImageNameExists = useCallback((imageName: string) => {
    return !!images[imageName];
  }, [images]);

  // 新しい画像名を生成（重複回避）
  const generateImageName = useCallback((baseName: string = 'Character') => {
    let counter = 1;
    let candidateName = baseName;

    while (images[candidateName]) {
      candidateName = `${baseName}${counter}`;
      counter++;
    }

    return candidateName;
  }, [images]);

  // 画像数を取得
  const getImageCount = useCallback(() => {
    return Object.keys(images).length;
  }, [images]);

  // 画像名リストを取得
  const getImageNames = useCallback(() => {
    return Object.keys(images);
  }, [images]);

  // 画像情報を取得
  const getImage = useCallback((imageName: string) => {
    return images[imageName] || null;
  }, [images]);

  // 全画像をクリア
  const clearAllImages = useCallback(() => {
    onUpdate({});
  }, [onUpdate]);

  // バリデーション
  const validateImageData = useCallback((
    imageName: string,
    url: string
  ): string[] => {
    const errors: string[] = [];

    // 画像名バリデーション（緩和版）
    if (!imageName.trim()) {
      errors.push('画像名を入力してください');
    } else if (imageName.length > 50) {
      errors.push('画像名は50文字以内で入力してください');
    }

    // URL形式チェック
    if (!url.trim()) {
      errors.push('画像URLを入力してください');
    } else {
      try {
        const urlObj = new URL(url);
        
        // 基本的なURL形式チェック
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          errors.push('HTTPまたはHTTPS URLを入力してください');
        }
        
        // 拡張子チェックは緩和（拡張子がある場合のみ）
        const urlPath = urlObj.pathname.toLowerCase();
        const hasExtension = urlPath.includes('.');
        if (hasExtension) {
          const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.tiff', '.ico'];
          const hasValidExtension = validExtensions.some(ext => urlPath.includes(ext));
          
          if (!hasValidExtension) {
            // 拡張子が不明でも警告のみ
            console.warn('Unknown image extension, but allowing URL:', url);
          }
        }
        
      } catch {
        errors.push('有効なURLを入力してください');
      }
    }

    return errors;
  }, []);

  // URLの有効性チェック
  const validateImageUrl = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      
      return response.ok && 
             contentType !== null && 
             contentType.startsWith('image/');
    } catch {
      return false;
    }
  }, []);

  // 画像統計情報を取得
  const getImageStats = useCallback(() => {
    const imageList = Object.entries(images);
    const urlCount = imageList.filter(([, img]) => !img.isUploadedFile).length;
    const uploadedCount = imageList.filter(([, img]) => img.isUploadedFile).length;

    return {
      total: imageList.length,
      urlImages: urlCount,
      uploadedImages: uploadedCount, // pathCountの代わりにuploadedCountに
      imageNames: Object.keys(images),
    };
  }, [images]);

  return {
    // アクション
    addImage,
    updateImage,
    deleteImage,
    clearAllImages,
    
    // ユーティリティ
    isImageNameExists,
    generateImageName,
    getImageCount,
    getImageNames,
    getImage,
    validateImageData,
    validateImageUrl,
    getImageStats,
    getCleanImagesForMulmoScript,
    
    // 状態
    images,
  };
}