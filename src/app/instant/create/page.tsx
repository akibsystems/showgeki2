'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts';
// Custom SVG Icons
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

// New UI form data interface
interface NewStoryFormData {
  storyText: string;
  genre?: 'tragedy' | 'comedy';
  style?: 'anime' | 'realistic' | 'watercolor';
  castImage?: File;
}

// UI Option Definitions
const GENRE_OPTIONS = [
  { value: 'tragedy', label: '悲劇' },
  { value: 'comedy', label: '喜劇' },
] as const;

const STYLE_OPTIONS = [
  { value: 'anime', label: 'アニメ' },
  { value: 'realistic', label: '実写' },
  { value: 'watercolor', label: '水彩画' },
] as const;

export default function InstantCreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { error } = useToast();

  const [formData, setFormData] = useState<NewStoryFormData>({
    storyText: '',
    genre: undefined,
    style: undefined,
    castImage: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Handle navigation
  const handleBack = () => {
    router.back();
  };

  const handleCancel = () => {
    router.push('/');
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, castImage: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, castImage: undefined });
    setImagePreview(null);
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
      // Convert new UI data to API format
      const apiData: any = {
        storyText: formData.storyText,
        title: '', // Will be auto-generated
        visualStyle: formData.style || 'anime', // Use selected style or default to anime
        duration: 'medium', // Default duration
        // Include genre for future processing
        ...(formData.genre && { genre: formData.genre }),
      };

      // TODO: Handle cast image upload
      // If castImage exists, upload it first and include reference in apiData

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

  // Option Button Component
  interface OptionButtonProps {
    option: { value: string; label: string };
    isSelected: boolean;
    onClick: () => void;
  }

  const OptionButton = ({ option, isSelected, onClick }: OptionButtonProps) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center justify-center px-4 py-3 rounded-xl border transition-all duration-200
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 text-blue-600' 
          : 'border-gray-300 hover:border-gray-400 bg-white text-gray-700 hover:text-gray-900'
        }
      `}
    >
      <span className="font-medium">{option.label}</span>
    </button>
  );

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4">
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
      <div className="px-4 py-6">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-8">
          {/* Story Input */}
          <div className="space-y-3">
            <textarea
              value={formData.storyText}
              onChange={(e) => setFormData({ ...formData, storyText: e.target.value })}
              placeholder="今日、久しぶりに実家に帰りました。母が作ってくれた手料理を食べながら、家族みんなで昔話に花を咲かせました。"
              rows={6}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 text-right">
              {formData.storyText.length} 文字
            </p>
          </div>

          {/* Genre Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              ジャンル
            </h3>
            <div className="flex gap-3">
              {GENRE_OPTIONS.map((option) => (
                <OptionButton
                  key={option.value}
                  option={option}
                  isSelected={formData.genre === option.value}
                  onClick={() => setFormData({ 
                    ...formData, 
                    genre: formData.genre === option.value ? undefined : option.value as any
                  })}
                />
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              スタイル
            </h3>
            <div className="flex gap-3">
              {STYLE_OPTIONS.map((option) => (
                <OptionButton
                  key={option.value}
                  option={option}
                  isSelected={formData.style === option.value}
                  onClick={() => setFormData({ 
                    ...formData, 
                    style: formData.style === option.value ? undefined : option.value as any
                  })}
                />
              ))}
            </div>
          </div>

          {/* Cast Image Upload */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              キャスト
            </h3>
            <div className="flex items-start gap-4">
              <input
                type="file"
                id="cast-image"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative w-24 h-24 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                  <img 
                    src={imagePreview} 
                    alt="Cast preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs hover:bg-black/70 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label 
                  htmlFor="cast-image"
                  className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs text-gray-600">アップロード</span>
                </label>
              )}
              <p className="text-sm text-gray-600 pt-2">
                キャラクターの顔画像をアップロードすると、その人物を登場人物として使用できます。
              </p>
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-8">
            <button
              type="submit"
              disabled={!formData.storyText.trim() || isSubmitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
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