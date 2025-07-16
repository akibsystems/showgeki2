'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts';
import Image from 'next/image';
import { FaceDetectionButton } from '@/components/instant/FaceDetectionButton';
import { FaceDetectionOverlay } from '@/components/instant/FaceDetectionOverlay';
import { FaceTaggingPanel } from '@/components/instant/FaceTaggingPanel';
import { CharacterPreview } from '@/components/instant/CharacterPreview';
import type { DetectedFace, FaceTag } from '@/types/face-detection';

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
  imageUrl?: string;
  detectedFaces?: DetectedFace[];
  characterTags?: Record<string, FaceTag>;
}

export default function InstantCreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { error, success } = useToast();

  const [formData, setFormData] = useState<NewStoryFormData>({
    storyText: '',
    imageUrl: undefined,
    detectedFaces: [],
    characterTags: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showFaceDetection, setShowFaceDetection] = useState(false);
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
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
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      error('Please log in to upload images');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      error('画像ファイルのみアップロード可能です');
      return;
    }

    // Check file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      error('画像サイズは10MB以下にしてください');
      return;
    }

    setIsUploading(true);

    try {
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
        throw new Error(data.error || 'Upload failed');
      }

      const { url } = await response.json();
      setFormData(prev => ({ ...prev, imageUrl: url }));
      setImagePreview(url);
      success('画像をアップロードしました');
    } catch (err) {
      console.error('Upload error:', err);
      error(err instanceof Error ? err.message : '画像のアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setFormData(prev => ({ 
      ...prev, 
      imageUrl: undefined,
      detectedFaces: [],
      characterTags: {}
    }));
    setImagePreview(null);
    setShowFaceDetection(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle face detection complete
  const handleFaceDetectionComplete = (faces: DetectedFace[]) => {
    setFormData(prev => ({ ...prev, detectedFaces: faces }));
    setShowFaceDetection(true);
    success(`${faces.length}人の顔を検出しました`);
  };

  // Handle face tag update
  const handleFaceTagUpdate = (faceId: string, tag: FaceTag) => {
    setFormData(prev => ({
      ...prev,
      characterTags: {
        ...prev.characterTags,
        [faceId]: tag
      }
    }));
  };

  // Handle face reorder
  const handleFaceReorder = (reorderedFaces: DetectedFace[]) => {
    setFormData(prev => ({ ...prev, detectedFaces: reorderedFaces }));
  };

  // Handle face delete
  const handleFaceDelete = (faceId: string) => {
    setFormData(prev => ({
      ...prev,
      detectedFaces: prev.detectedFaces?.filter(f => f.id !== faceId) || [],
      characterTags: Object.fromEntries(
        Object.entries(prev.characterTags || {}).filter(([id]) => id !== faceId)
      )
    }));
  };

  // Get all detected faces (with or without tags)
  const getAllDetectedFaces = () => {
    return formData.detectedFaces?.map((face, index) => {
      const tag = formData.characterTags?.[face.id];
      return {
        name: tag?.name || `人物${index + 1}`,
        role: tag?.role || 'その他',
        description: tag?.description || '',
        faceImageUrl: face.imageUrl,
      };
    }) || [];
  };

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
      // Get all detected faces (tagged or untagged)
      const characters = getAllDetectedFaces();
      
      // API data format
      const apiData = {
        storyText: formData.storyText,
        title: '', // Will be auto-generated
        visualStyle: 'anime', // Default to anime
        duration: 'medium', // Default duration
        imageUrl: formData.imageUrl, // Include image URL if present
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
            <p className="text-sm font-medium text-gray-700">参考画像（任意）</p>
            
            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <PhotoIcon className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600">
                  {isUploading ? '画像をアップロード中...' : 'クリックして画像を選択'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPEG、PNG、GIF（最大10MB）
                </p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                <div className="relative h-48">
                  <Image
                    src={imagePreview}
                    alt="アップロードした画像"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 bg-gray-900 bg-opacity-70 text-white rounded-full hover:bg-opacity-90 transition-opacity"
                  disabled={isUploading}
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500">
              ※ 画像をもとにストーリーが生成されます
            </p>
            
            {/* Face Detection Button */}
            {imagePreview && (
              <FaceDetectionButton
                imageUrl={formData.imageUrl!}
                onDetectionComplete={handleFaceDetectionComplete}
                disabled={isUploading || showFaceDetection}
              />
            )}
          </div>

          {/* Face Detection Results */}
          {showFaceDetection && formData.detectedFaces && formData.detectedFaces.length > 0 && (
            <div className="space-y-4">
              {/* Face Detection Overlay (Debug Mode Only) */}
              {process.env.NEXT_PUBLIC_SHOW_FACE_DETECTION_DEBUG === 'true' && (
                <div className="h-64">
                  <FaceDetectionOverlay
                    originalImage={formData.imageUrl!}
                    detectedFaces={formData.detectedFaces}
                    selectedFaceId={selectedFaceId || undefined}
                    onFaceClick={(face) => setSelectedFaceId(face.id)}
                  />
                </div>
              )}

              {/* Face Tagging Panel */}
              <FaceTaggingPanel
                faces={formData.detectedFaces}
                selectedFaceId={selectedFaceId || undefined}
                onFaceSelect={setSelectedFaceId}
                onTagUpdate={handleFaceTagUpdate}
                onReorder={handleFaceReorder}
                onDelete={handleFaceDelete}
              />

              {/* Character Preview */}
              <CharacterPreview
                characters={formData.detectedFaces?.filter(face => formData.characterTags?.[face.id]?.name).map(face => ({
                  face,
                  tag: formData.characterTags![face.id]
                })) || []}
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