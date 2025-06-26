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
    title: '',
    text_raw: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      error('Title is required');
      return;
    }
    
    if (!formData.text_raw.trim()) {
      error('Story content is required');
      return;
    }

    setIsLoading(true);
    try {
      // Ensure workspace exists for the user
      const workspace = await ensureWorkspace();
      
      // Create the story
      const newStory = await createStory({
        workspace_id: workspace.id,
        title: formData.title.trim(),
        text_raw: formData.text_raw.trim(),
      });
      
      success('Story created successfully');
      router.push(`/stories/${newStory.id}`);
    } catch (err) {
      console.error('Failed to create story:', err);
      error('Failed to create story');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  const wordCount = formData.text_raw.split(/\s+/).filter(word => word.length > 0).length;
  const charCount = formData.text_raw.length;

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Story</h1>
              <p className="mt-1 text-sm text-gray-600">
                Write your story content and we'll help you turn it into a video.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="secondary" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading || !formData.title.trim() || !formData.text_raw.trim()}>
                {isLoading ? (
                  <>
                    <Spinner size="sm" color="white" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Story'
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {/* Title Input */}
                <div className="mb-6">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Story Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter a compelling title for your story..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  />
                </div>

                {/* Content Input */}
                <div>
                  <label htmlFor="text_raw" className="block text-sm font-medium text-gray-700 mb-2">
                    Story Content
                  </label>
                  <textarea
                    id="text_raw"
                    name="text_raw"
                    value={formData.text_raw}
                    onChange={handleInputChange}
                    placeholder="Write your story here... Be descriptive and engaging. This text will be used to generate your video script."
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                    disabled={isLoading}
                  />
                  
                  {/* Word/Character Count */}
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>{wordCount} words • {charCount} characters</span>
                    <span className={charCount > 5000 ? 'text-orange-500' : ''}>
                      {charCount > 5000 ? 'Consider shorter content for better results' : ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Tips Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Writing Tips</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Be specific:</strong> Include details about characters, settings, and actions.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Visual language:</strong> Use descriptive words that paint a picture.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Clear structure:</strong> Organize your story with a beginning, middle, and end.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Story Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-gray-600">Draft</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Your story will be saved as a draft. You can generate a script and video once it's saved.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Next Steps Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                      <span>Save your story</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                      <span>Generate script</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                      <span>Create video</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NewStoryPage;