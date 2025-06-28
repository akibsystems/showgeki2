'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Spinner } from '@/components/ui';
import { useApp, useToast } from '@/contexts';
import { useStories, useUserWorkspace } from '@/hooks';

// ================================================================
// New Story Page Component
// ================================================================

const NewStoryPage: React.FC = () => {
  const router = useRouter();
  const { state } = useApp();
  const { success, error } = useToast();
  
  // Hooks for API calls
  const { ensureWorkspace } = useUserWorkspace();
  const { createStory } = useStories();
  
  const [formData, setFormData] = useState({
    text_raw: '',
    beats: 5,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'beats' ? parseInt(value) || 5 : value,
    }));
  };


  const handleGenerateScript = async () => {
    if (!formData.text_raw.trim()) {
      error('ストーリー内容を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      // Ensure workspace exists for the user
      const workspace = await ensureWorkspace();
      
      // Create story with auto script generation
      const result = await createStory({
        workspace_id: workspace.id,
        text_raw: formData.text_raw.trim(),
        beats: formData.beats,
        auto_generate_script: true,
      });
      
      console.log('Created story with script:', result); // Debug log
      
      // Check if result contains story data
      // When auto_generate_script is true, the response structure might be different
      let storyData: any;
      if (result && typeof result === 'object' && 'story' in result) {
        storyData = (result as any).story;
      } else {
        storyData = result;
      }
      
      if (!storyData || !storyData.id) {
        throw new Error('Invalid story response - missing ID');
      }
      
      // success('Story and script generated successfully');
      
      // Navigate to content tab (default view)
      router.push(`/stories/${storyData.id}?tab=content`);
    } catch (err) {
      console.error('Failed to create story and generate script:', err);
      error('ストーリーと台本の作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  const wordCount = (formData.text_raw || '').split(/\s+/).filter(word => word.length > 0).length;
  const charCount = (formData.text_raw || '').length;

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Header - Mobile optimized */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            新しいストーリー作成
          </h1>
          <p className="text-sm text-gray-600">
            ストーリーを入力して台本を作成すると、AIが自動でシェイクスピア風の動画を生成します
          </p>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            {/* Content Input */}
            <div className="mb-6">
              <label htmlFor="text_raw" className="block text-sm font-medium text-gray-700 mb-2">
                ストーリー内容
              </label>
              <textarea
                id="text_raw"
                name="text_raw"
                value={formData.text_raw}
                onChange={handleInputChange}
                placeholder="あなたの物語をここに書いてください。&#10;&#10;場面や情景が目に浮かぶような視覚的な表現を心がけ、始まり・展開・結末がはっきりした構成にすると、より良い動画が生成されます。"
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical text-sm sm:text-base"
                disabled={isLoading}
              />
              
              {/* Word/Character Count */}
              <div className="mt-2 flex flex-col sm:flex-row sm:justify-between text-xs text-gray-500">
                <span>{charCount} 文字</span>
                <span className={charCount > 5000 ? 'text-orange-500 mt-1 sm:mt-0' : ''}>
                  {charCount > 5000 ? '文字数が多いです。より短くすることをお勧めします' : ''}
                </span>
              </div>
            </div>

            {/* Scene Count Input */}
            <div className="mb-6">
              <label htmlFor="beats" className="block text-sm font-medium text-gray-700 mb-2">
                シーンの数
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, beats: Math.max(1, prev.beats - 1) }))}
                  disabled={isLoading || formData.beats <= 1}
                  className="w-10 h-10 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <input
                  type="number"
                  id="beats"
                  name="beats"
                  value={formData.beats}
                  onChange={handleInputChange}
                  min="1"
                  max="20"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-16 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-center"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, beats: Math.min(20, prev.beats + 1) }))}
                  disabled={isLoading || formData.beats >= 20}
                  className="w-10 h-10 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                動画に使用するシーンの数 (1-20シーン、デフォルト: 5シーン)
              </p>
            </div>

            {/* Action Buttons - Mobile optimized */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button 
                variant="secondary" 
                onClick={handleCancel} 
                disabled={isLoading}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                キャンセル
              </Button>
              <Button 
                onClick={handleGenerateScript} 
                disabled={isLoading || !formData.text_raw.trim()}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" color="white" className="mr-2" />
                    台本を作成中...
                  </>
                ) : (
                  '台本を作成'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default NewStoryPage;