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

// Form data interface
interface NewStoryFormData {
  storyText: string;
}

export default function InstantCreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { error } = useToast();

  const [formData, setFormData] = useState<NewStoryFormData>({
    storyText: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle navigation
  const handleBack = () => {
    router.back();
  };

  const handleCancel = () => {
    router.push('/');
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
      // API data format
      const apiData = {
        storyText: formData.storyText,
        title: '', // Will be auto-generated
        visualStyle: 'anime', // Default to anime
        duration: 'medium', // Default duration
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