'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts';
import Image from 'next/image';
import { FaceDetectionOverlay } from '@/components/instant/FaceDetectionOverlay';
import { CharacterSelection } from '@/components/instant/CharacterSelection';
import type { DetectedFace } from '@/types/face-detection';

// Custom SVG Icons
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const PhotoIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

// Form data interface
interface NewStoryFormData {
  storyText: string;
  imageUrls?: string[];
  detectedFaces?: DetectedFace[];
  characters?: { [faceId: string]: { enabled: boolean; name: string } };
}

export default function InstantCreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { error, success } = useToast();

  const [formData, setFormData] = useState<NewStoryFormData>({
    storyText: '',
    imageUrls: [],
    detectedFaces: [],
    characters: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showFaceDetection, setShowFaceDetection] = useState(false);
  const [isDetectingFaces, setIsDetectingFaces] = useState(false);
  const [detectingImageUrls, setDetectingImageUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle navigation
  const handleBack = () => {
    router.back();
  };

  const handleCancel = () => {
    router.push('/');
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!user) {
      error('Please log in to upload images');
      return;
    }

    // 既存の画像数 + 新しい画像数が3枚を超えないかチェック
    const currentImageCount = formData.imageUrls?.length || 0;
    if (currentImageCount + files.length > 3) {
      error(`画像は最大3枚までアップロード可能です（現在${currentImageCount}枚）`);
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];
    const previewUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file type
        if (!file.type.startsWith('image/')) {
          error(`${file.name}は画像ファイルではありません`);
          continue;
        }

        // Check file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          error(`${file.name}は10MB以下にしてください`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/instant/upload-image', {
          method: 'POST',
          headers: {
            'X-User-UID': user.id,
          },
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          error(`${file.name}のアップロードに失敗しました: ${data.error}`);
          continue;
        }

        const { url } = await response.json();
        uploadedUrls.push(url);
        previewUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        setFormData(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ...uploadedUrls] }));
        setImagePreviews(prev => [...prev, ...previewUrls]);
        // 新しくアップロードした画像のみから顔検出を実行
        detectFacesFromNewImages(uploadedUrls);
      }
    } catch (err) {
      console.error('Upload error:', err);
      error(err instanceof Error ? err.message : '画像のアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle image removal
  const handleRemoveImage = (index: number) => {
    const removedImageUrl = formData.imageUrls?.[index];
    
    setFormData(prev => {
      const newImageUrls = [...(prev.imageUrls || [])];
      newImageUrls.splice(index, 1);
      
      // 削除した画像に関連する顔を削除
      const newDetectedFaces = prev.detectedFaces?.filter(
        face => face.sourceImageUrl !== removedImageUrl
      ) || [];
      
      // 削除した顔に関連するキャラクター情報も削除
      const newCharacters = { ...prev.characters };
      prev.detectedFaces?.forEach(face => {
        if (face.sourceImageUrl === removedImageUrl) {
          delete newCharacters[face.id];
        }
      });
      
      return { 
        ...prev, 
        imageUrls: newImageUrls,
        detectedFaces: newDetectedFaces,
        characters: newCharacters
      };
    });
    setImagePreviews(prev => {
      const newPreviews = [...prev];
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    if (imagePreviews.length === 1) {
      setShowFaceDetection(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle face detection complete
  const handleFaceDetectionComplete = (faces: DetectedFace[]) => {
    setFormData(prev => ({ ...prev, detectedFaces: faces }));
    setShowFaceDetection(true);
  };

  // Handle character update
  const handleCharacterUpdate = (characterData: { [faceId: string]: { enabled: boolean; name: string } }) => {
    setFormData(prev => ({ ...prev, characters: characterData }));
  };

  // Auto detect faces from new images only (append to existing faces)
  const detectFacesFromNewImages = async (newImageUrls: string[]) => {
    if (!user || newImageUrls.length === 0) return;

    setIsDetectingFaces(true);
    setDetectingImageUrls(newImageUrls);
    const newDetectedFaces: DetectedFace[] = [];

    try {
      // Get current total image count to calculate correct sourceImageIndex
      const currentImageCount = (formData.imageUrls?.length || 0) - newImageUrls.length;
      
      for (let i = 0; i < newImageUrls.length; i++) {
        const imageUrl = newImageUrls[i];
        console.log(`Detecting faces from new image ${i + 1}/${newImageUrls.length}`);

        const response = await fetch('/api/instant/detect-faces', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-UID': user.id,
          },
          body: JSON.stringify({
            imageUrl,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Face detection failed for new image ${i + 1}:`, errorData.error);
          continue;
        }

        const data = await response.json();

        if (data.success && data.faces.length > 0) {
          // 各顔にソース画像の情報を追加（正しいインデックスを使用）
          const facesWithSource = data.faces.map((face: DetectedFace) => ({
            ...face,
            sourceImageUrl: imageUrl,
            sourceImageIndex: currentImageCount + i
          }));
          newDetectedFaces.push(...facesWithSource);
        }
      }

      if (newDetectedFaces.length > 0) {
        // 新しい顔を先頭に追加（上に表示）
        setFormData(prev => ({ 
          ...prev, 
          detectedFaces: [...newDetectedFaces, ...(prev.detectedFaces || [])] 
        }));
        setShowFaceDetection(true);
      }
    } catch (err) {
      console.error('Face detection error:', err);
    } finally {
      setIsDetectingFaces(false);
      setDetectingImageUrls([]);
    }
  };

  // Auto detect faces from multiple images (for initial load)
  const detectFacesFromMultipleImages = async (imageUrls: string[]) => {
    if (!user || imageUrls.length === 0) return;

    setIsDetectingFaces(true);
    const allDetectedFaces: DetectedFace[] = [];

    try {
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        console.log(`Detecting faces from image ${i + 1}/${imageUrls.length}`);

        const response = await fetch('/api/instant/detect-faces', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-UID': user.id,
          },
          body: JSON.stringify({
            imageUrl,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Face detection failed for image ${i + 1}:`, errorData.error);
          continue;
        }

        const data = await response.json();

        if (data.success && data.faces.length > 0) {
          // 各顔にソース画像の情報を追加
          const facesWithSource = data.faces.map((face: DetectedFace) => ({
            ...face,
            sourceImageUrl: imageUrl,
            sourceImageIndex: i
          }));
          allDetectedFaces.push(...facesWithSource);
        }
      }

      if (allDetectedFaces.length > 0) {
        handleFaceDetectionComplete(allDetectedFaces);
      }
    } catch (err) {
      console.error('Face detection error:', err);
    } finally {
      setIsDetectingFaces(false);
    }
  };

  // Get enabled characters with names
  const getEnabledCharacters = () => {
    if (!formData.characters || !formData.detectedFaces) return [];
    
    return formData.detectedFaces
      .filter(face => formData.characters?.[face.id]?.enabled)
      .map((face, index) => {
        const character = formData.characters![face.id];
        return {
          name: character.name.trim() || `__AUTO_NAME_${index}__`, // 名前がない場合は自動生成用マーカー
          role: 'その他',
          description: '',
          faceImageUrl: face.imageUrl,
        };
      });
  };

  // Check if all enabled characters have names (removed - no longer required)

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      error('Please wait while we verify your authentication');
      return;
    }

    if (!user) {
      error('Please log in to continue');
      router.push('/auth/login');
      return;
    }

    if (!formData.storyText.trim()) {
      error('Please enter your story');
      return;
    }

    setIsSubmitting(true);

    try {
      // 名前のチェックは削除（名前がない場合は後で自動生成）

      // Get enabled characters
      const characters = getEnabledCharacters();
      
      // API data format
      const apiData = {
        storyText: formData.storyText,
        title: '', // Will be auto-generated
        visualStyle: 'anime', // Default to anime
        duration: 'medium', // Default duration
        imageUrls: formData.imageUrls, // Include image URLs if present
        characters: characters,
      };

      const response = await fetch('/api/instant/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start generation');
      }

      const { instantId } = await response.json();
      router.push(`/instant/${instantId}/status`);

    } catch (err) {
      console.error('Submit error:', err);
      error(err instanceof Error ? err.message : 'Failed to start generation');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">認証確認中...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    router.push('/auth/login');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">ログインページへ移動中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="戻る"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>

          <h1 className="text-lg font-semibold text-gray-900">新しいストーリー</h1>

          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
          {/* Story Input */}
          <div className="space-y-2">
            <textarea
              value={formData.storyText}
              onChange={(e) => setFormData({ ...formData, storyText: e.target.value })}
              placeholder={"ToBe（トゥービー）\n    一行が、あなたの物語になる。"}
              rows={6}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              style={{ fontSize: '18px', lineHeight: '1.8' }}
              required
            />
            <p className="text-xs text-gray-500 text-right">
              {formData.storyText.length} 文字
            </p>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">参考画像（任意・最大3枚）</p>
            
            {/* Upload Area - Hide when 3 images are uploaded or uploading */}
            {(imagePreviews.length < 3 && !isUploading) && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <PhotoIcon className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600">
                  {isUploading ? '画像をアップロード中...' : 'クリックして画像を選択'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPEG、PNG、GIF（最大10MB、残り{3 - imagePreviews.length}枚）
                </p>
              </div>
            )}

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden bg-gray-100">
                      <div className="relative aspect-square">
                        <Image
                          src={preview}
                          alt={`アップロードした画像${index + 1}`}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                        {/* Loading overlay for face detection */}
                        {detectingImageUrls.includes(preview) && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 p-1 bg-gray-900 bg-opacity-70 text-white rounded-full hover:bg-opacity-90 transition-opacity"
                        disabled={isUploading || isDetectingFaces}
                      >
                        <CloseIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {detectingImageUrls.length > 0 && (
                  <p className="text-sm text-gray-600 text-center">顔を検出中...</p>
                )}
              </div>
            )}
          </div>

          {/* Face Detection Results */}
          {showFaceDetection && formData.detectedFaces && formData.detectedFaces.length > 0 && (
            <div className="space-y-4">
              {/* Face Detection Overlay (Debug Mode Only) */}
              {process.env.NEXT_PUBLIC_SHOW_FACE_DETECTION_DEBUG === 'true' && (
                <div className="h-64">
                  <FaceDetectionOverlay
                    originalImage={formData.imageUrls?.[0] || ''}
                    detectedFaces={formData.detectedFaces}
                  />
                </div>
              )}

              {/* Character Selection */}
              <CharacterSelection
                faces={formData.detectedFaces}
                onCharacterUpdate={handleCharacterUpdate}
              />
            </div>
          )}

          {/* Generate Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!formData.storyText.trim() || isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  生成中...
                </span>
              ) : (
                '生成する'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}