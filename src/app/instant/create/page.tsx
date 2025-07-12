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
import type { InstantModeInput } from '@/types/instant';

// New UI form data interface
interface NewStoryFormData {
  storyText: string;
  genre?: 'tragedy' | 'comedy' | 'romance' | 'action' | 'mystery' | 'horror';
  style?: 'short' | 'lengthy' | 'detailed' | 'concise';
  mood?: 'fantasy' | 'realistic' | 'dramatic' | 'light' | 'dark' | 'mysterious';
}

// UI Option Definitions
const GENRE_OPTIONS = [
  { value: 'tragedy', label: 'Tragedy', emoji: '😢' },
  { value: 'comedy', label: 'Comedy', emoji: '😄' },
  { value: 'romance', label: 'Romance', emoji: '💕' },
  { value: 'action', label: 'Action', emoji: '⚡' },
  { value: 'mystery', label: 'Mystery', emoji: '🔍' },
  { value: 'horror', label: 'Horror', emoji: '👻' },
] as const;

const STYLE_OPTIONS = [
  { value: 'short', label: 'Short', emoji: '📝' },
  { value: 'lengthy', label: 'Lengthy', emoji: '📚' },
  { value: 'detailed', label: 'Detailed', emoji: '🔬' },
  { value: 'concise', label: 'Concise', emoji: '✨' },
] as const;

const MOOD_OPTIONS = [
  { value: 'fantasy', label: 'Fantasy', emoji: '🧙‍♂️' },
  { value: 'realistic', label: 'Realistic', emoji: '🌍' },
  { value: 'dramatic', label: 'Dramatic', emoji: '🎭' },
  { value: 'light', label: 'Light', emoji: '☀️' },
  { value: 'dark', label: 'Dark', emoji: '🌙' },
  { value: 'mysterious', label: 'Mysterious', emoji: '🌫️' },
] as const;

export default function InstantCreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { error } = useToast();

  const [formData, setFormData] = useState<NewStoryFormData>({
    storyText: '',
    genre: undefined,
    style: undefined,
    mood: undefined,
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
      // Convert new UI data to legacy API format with type assertion
      const apiData: any = {
        storyText: formData.storyText,
        title: '', // Will be auto-generated
        visualStyle: 'anime', // Default visual style (use visualStyle for legacy compatibility)
        duration: 'medium', // Default duration
        // Include new fields for future processing
        ...(formData.genre && { genre: formData.genre }),
        ...(formData.style && { narrativeStyle: formData.style }),
        ...(formData.mood && { mood: formData.mood }),
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

  // Option Button Component
  interface OptionButtonProps {
    option: { value: string; label: string; emoji: string };
    isSelected: boolean;
    onClick: () => void;
  }

  const OptionButton = ({ option, isSelected, onClick }: OptionButtonProps) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all duration-200
        ${isSelected 
          ? 'border-purple-500 bg-purple-500/10 text-purple-400' 
          : 'border-gray-700 hover:border-gray-600 bg-gray-800/50 text-gray-300 hover:text-white'
        }
      `}
    >
      <span className="text-lg mr-2">{option.emoji}</span>
      <span className="font-medium">{option.label}</span>
    </button>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    router.push('/auth/login');
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-300" />
          </button>
          
          <h1 className="text-lg font-semibold text-white">New Story</h1>
          
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
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
              placeholder="A story about a teenager seeking revenge"
              rows={6}
              className="w-full px-4 py-4 bg-gray-800/50 border border-gray-700 rounded-2xl text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 text-right">
              {formData.storyText.length} characters
            </p>
          </div>

          {/* Genre Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Genre
            </h3>
            <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Style
            </h3>
            <div className="grid grid-cols-2 gap-3">
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

          {/* Mood Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Mood
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {MOOD_OPTIONS.map((option) => (
                <OptionButton
                  key={option.value}
                  option={option}
                  isSelected={formData.mood === option.value}
                  onClick={() => setFormData({ 
                    ...formData, 
                    mood: formData.mood === option.value ? undefined : option.value as any
                  })}
                />
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-8">
            <button
              type="submit"
              disabled={!formData.storyText.trim() || isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-2xl transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate'
              )}
            </button>
          </div>

          {/* Alternative Mode Link */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              Need more control?{' '}
              <a 
                href="/workflow/create" 
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Try Advanced Mode
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}