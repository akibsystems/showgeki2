'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Spinner } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApp, useToast } from '@/contexts';
import { useStories, useUserWorkspace, useStory } from '@/hooks';

// ================================================================
// New Story Page Component
// ================================================================

const NewStoryContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { } = useApp();
  const { error } = useToast();
  
  // Get storyId and beats from query params
  const existingStoryId = searchParams.get('storyId');
  const beatsFromUrl = searchParams.get('beats');
  
  // Hooks for API calls
  const { ensureWorkspace } = useUserWorkspace();
  const { createStory, updateStory } = useStories();
  const { story: existingStory, isLoading: storyLoading } = useStory(existingStoryId || '');
  
  const [formData, setFormData] = useState({
    text_raw: '',
    beats: 10,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load existing story data if editing
  useEffect(() => {
    if (existingStory && existingStoryId) {
      setFormData({
        text_raw: existingStory.text_raw || '',
        beats: beatsFromUrl ? parseInt(beatsFromUrl, 10) : (existingStory.beats || 10),
      });
    } else if (beatsFromUrl && !existingStoryId) {
      // If only beats is provided in URL (shouldn't happen normally)
      setFormData(prev => ({
        ...prev,
        beats: parseInt(beatsFromUrl, 10),
      }));
    }
  }, [existingStory, existingStoryId, beatsFromUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'beats' ? Math.max(1, Math.min(20, parseInt(value) || 10)) : value,
    }));
  };


  const handleAnalyzeScenes = async () => {
    if (!formData.text_raw.trim()) {
      error('ストーリー内容を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      let storyId: string;
      
      if (existingStoryId && existingStory) {
        // Update existing story
        await updateStory(existingStoryId, {
          text_raw: formData.text_raw.trim(),
          beats: formData.beats,
        });
        storyId = existingStoryId;
      } else {
        // Create new story
        const workspace = await ensureWorkspace();
        
        const result = await createStory({
          workspace_id: workspace.id,
          text_raw: formData.text_raw.trim(),
          beats: formData.beats,
          auto_generate_script: false,
        });
        
        console.log('Created story:', result); // Debug log
        
        // Check if result contains story data
        let storyData: { id?: string } | undefined;
        if (result && typeof result === 'object' && 'story' in result) {
          storyData = (result as { story: { id?: string } }).story;
        } else {
          storyData = result as { id?: string };
        }
        
        if (!storyData || !storyData.id) {
          throw new Error('Invalid story response - missing ID');
        }
        
        storyId = storyData.id;
      }
      
      // Set navigation path in session storage
      sessionStorage.setItem('navigationPath', 'story-scenes-script');
      
      // Navigate to scene editor with beats parameter
      router.push(`/stories/${storyId}/scenes?beats=${formData.beats}`);
    } catch (err) {
      console.error('Failed to create/update story:', err);
      error('ストーリーの処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!formData.text_raw.trim()) {
      error('ストーリー内容を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      let storyId: string;
      
      if (existingStoryId && existingStory) {
        // Update existing story
        await updateStory(existingStoryId, {
          text_raw: formData.text_raw.trim(),
          beats: formData.beats,
        });
        
        // Generate script for existing story
        const uid = await import('@/lib/uid').then(m => m.getOrCreateUid());
        const response = await fetch(`/api/stories/${existingStoryId}/generate-script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-UID': uid,
          },
          body: JSON.stringify({ beats: formData.beats }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate script');
        }
        
        storyId = existingStoryId;
      } else {
        // Create new story with auto script generation
        const workspace = await ensureWorkspace();
        
        const result = await createStory({
          workspace_id: workspace.id,
          text_raw: formData.text_raw.trim(),
          beats: formData.beats,
          auto_generate_script: true,
        });
        
        console.log('Created story with script:', result); // Debug log
        
        // Check if result contains story data
        let storyData: { id?: string } | undefined;
        if (result && typeof result === 'object' && 'story' in result) {
          storyData = (result as { story: { id?: string } }).story;
        } else {
          storyData = result as { id?: string };
        }
        
        if (!storyData || !storyData.id) {
          throw new Error('Invalid story response - missing ID');
        }
        
        storyId = storyData.id;
      }
      
      // Set navigation path in session storage (direct path)
      sessionStorage.setItem('navigationPath', 'story-script');
      
      // Navigate to story editor
      router.push(`/stories/${storyId}?tab=content`);
    } catch (err) {
      console.error('Failed to create/update story and generate script:', err);
      error('ストーリーと台本の処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (existingStoryId) {
      // If editing existing story, go back to scene editor
      router.push(`/stories/${existingStoryId}/scenes`);
    } else {
      // Otherwise go to dashboard
      router.push('/dashboard');
    }
  };

  const charCount = (formData.text_raw || '').length;

  // Show loading spinner while fetching existing story
  if (existingStoryId && storyLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-400">読み込み中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Header - Mobile optimized */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">
            {existingStoryId ? 'ストーリーを編集' : 'ストーリーから台本を作成'}
          </h1>
          <p className="text-sm text-gray-400">
            {existingStoryId 
              ? 'ストーリーを編集して、シーン構成や台本を更新できます'
              : 'ストーリーを入力して台本を作成すると、AIが自動でシェイクスピア風の動画を生成します'}
          </p>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            {/* Content Input */}
            <div className="mb-6">
              <label htmlFor="text_raw" className="block text-sm font-medium text-gray-300 mb-2">
                ストーリー内容
              </label>
              <textarea
                id="text_raw"
                name="text_raw"
                value={formData.text_raw}
                onChange={handleInputChange}
                placeholder="あなたの物語をここに書いてください。&#10;&#10;場面や情景が目に浮かぶような視覚的な表現を心がけ、始まり・展開・結末がはっきりした構成にすると、より良い動画が生成されます。"
                rows={12}
                className="w-full px-3 py-2 bg-gray-800/50 border border-purple-500/20 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-vertical text-sm sm:text-base text-gray-100"
                disabled={isLoading}
              />
              
              {/* Word/Character Count */}
              <div className="mt-2 flex flex-col sm:flex-row sm:justify-between text-xs text-gray-400">
                <span>{charCount} 文字</span>
                <span className={charCount > 5000 ? 'text-orange-500 mt-1 sm:mt-0' : ''}>
                  {charCount > 5000 ? '文字数が多いです。より短くすることをお勧めします' : ''}
                </span>
              </div>
            </div>

            {/* Scene Count Input */}
            <div className="mb-6">
              <label htmlFor="beats" className="block text-sm font-medium text-gray-300 mb-2">
                シーンの数: <span className="text-purple-400 font-bold">{formData.beats}</span>
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="range"
                    id="beats"
                    name="beats"
                    value={formData.beats}
                    onChange={handleInputChange}
                    min="1"
                    max="20"
                    step="1"
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    disabled={isLoading}
                    style={{
                      background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${((formData.beats - 1) / 19) * 100}%, #374151 ${((formData.beats - 1) / 19) * 100}%, #374151 100%)`
                    }}
                  />
                  {/* 目盛り */}
                  <div className="flex justify-between mt-2 px-1">
                    <span className="text-xs text-gray-500">1</span>
                    <span className="text-xs text-gray-500">5</span>
                    <span className="text-xs text-gray-500">10</span>
                    <span className="text-xs text-gray-500">15</span>
                    <span className="text-xs text-gray-500">20</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  動画に使用するシーンの数 (デフォルト: 10シーン)
                </p>
              </div>
            </div>
            
            <style jsx>{`
              .slider::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                background: #a855f7;
                border: 2px solid #1f2937;
                cursor: pointer;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                transition: all 0.2s;
              }
              .slider::-webkit-slider-thumb:hover {
                background: #9333ea;
                transform: scale(1.1);
              }
              .slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                background: #a855f7;
                border: 2px solid #1f2937;
                cursor: pointer;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                transition: all 0.2s;
              }
              .slider::-moz-range-thumb:hover {
                background: #9333ea;
                transform: scale(1.1);
              }
            `}</style>

            {/* Button Explanation */}
            <div className="mb-4 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
              <p className="text-sm text-gray-300">
                <span className="font-semibold">シーン構成を分析</span>: 各シーンのタイトルを確認・編集してから台本を作成します
                {process.env.NEXT_PUBLIC_ENABLE_DIRECT_SCRIPT_GENERATION === 'true' && (
                  <>
                    <br/>
                    <span className="font-semibold">台本を作成</span>: 直接台本を生成して編集画面へ進みます
                  </>
                )}
              </p>
            </div>

            {/* Action Buttons - Mobile optimized */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
              <Button 
                variant="secondary" 
                onClick={handleCancel} 
                disabled={isLoading}
                className="w-full sm:w-auto order-3 sm:order-1"
              >
                キャンセル
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
                <Button 
                  onClick={handleAnalyzeScenes} 
                  disabled={isLoading || !formData.text_raw.trim()}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" color="white" className="mr-2" />
                      分析中...
                    </>
                  ) : (
                    'シーン構成を分析'
                  )}
                </Button>
                {process.env.NEXT_PUBLIC_ENABLE_DIRECT_SCRIPT_GENERATION === 'true' && (
                  <Button 
                    onClick={handleGenerateScript} 
                    disabled={isLoading || !formData.text_raw.trim()}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Spinner size="sm" color="white" className="mr-2" />
                        作成中...
                      </>
                    ) : (
                      '台本を作成'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

const NewStoryPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <NewStoryContent />
    </ProtectedRoute>
  );
};

export default NewStoryPage;