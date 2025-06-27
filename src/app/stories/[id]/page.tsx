'use client';

import React, { useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Spinner, Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';
import { ScriptEditor } from '@/components/editor';
import { VideoModal } from '@/components/video';
import { useApp, useToast } from '@/contexts';
import { useStory, useVideos } from '@/hooks';

// ================================================================
// Story Editor Page Component
// ================================================================

const StoryEditorPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const storyId = params.id as string;
  const { } = useApp();
  const { success, error } = useToast();
  
  // Get initial tab from URL parameter
  const initialTab = searchParams.get('tab') === 'script' ? 'script' : 'content';
  
  // Use SWR hooks for data fetching
  const { story, isLoading, mutate: mutateStory, updateStory, deleteStory, generateScript } = useStory(storyId);
  const { videos } = useVideos({ storyId });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentTab, setCurrentTab] = useState<'content' | 'script'>(initialTab);
  
  const [formData, setFormData] = useState({
    title: story?.title || '',
    text_raw: story?.text_raw || '',
    beats: 5,
  });

  // Update form data when story is loaded
  React.useEffect(() => {
    if (story) {
      setFormData({
        title: story.title || '',
        text_raw: story.text_raw || '',
        beats: story.beats || 5, // Use story's beats value or default to 5
      });
    }
  }, [story]);

  // Update tab when URL parameter changes
  React.useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'script' || tabParam === 'content') {
      setCurrentTab(tabParam);
    }
  }, [searchParams]);

  // Handle tab switching with URL update
  const handleTabChange = (tab: 'content' | 'script') => {
    setCurrentTab(tab);
    // Update URL without causing full page refresh
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', tab);
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'beats' ? parseInt(value) || 5 : value,
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.text_raw.trim()) {
      error('Title and content are required');
      return;
    }

    setIsSaving(true);
    try {
      await updateStory({
        title: formData.title,
        text_raw: formData.text_raw,
        beats: formData.beats,
      });
      
      setIsEditing(false);
      success('Story saved successfully');
    } catch (err) {
      console.error('Failed to save story:', err);
      error('Failed to save story');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    try {
      await generateScript({ beats: formData.beats });
      success('Script generated successfully');
    } catch (err) {
      console.error('Failed to generate script:', err);
      error('Failed to generate script');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateVideo = async () => {
    setIsGeneratingVideo(true);
    try {
      const uid = await import('@/lib/uid').then(m => m.getOrCreateUid());
      
      const response = await fetch(`/api/stories/${storyId}/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': uid,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        success('Video generation started');
        // Navigate to videos page to see generation progress
        router.push('/videos');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Failed to generate video:', err);
      error(err instanceof Error ? err.message : 'Failed to generate video');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStory();
      success('Story deleted successfully');
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to delete story:', err);
      error('Failed to delete story');
    }
  };

  const handleScriptSave = async (script: unknown) => {
    try {
      await updateStory({ script_json: script as Record<string, any> });
      success('Script saved successfully');
    } catch (err) {
      console.error('Failed to save script:', err);
      error('Failed to save script');
    }
  };

  const handleDownloadVideo = async () => {
    const completedVideo = videos?.find(v => v.story_id === storyId && v.status === 'completed');
    if (!completedVideo?.url) return;

    try {
      // Create download link
      const link = document.createElement('a');
      link.href = completedVideo.url;
      link.download = `${story?.title || 'video'}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      success('Video download started');
    } catch (err) {
      console.error('Failed to download video:', err);
      error('Failed to download video');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'processing':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'script_generated':
        return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'error':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${year} at ${hours}:${minutes}`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Loading story...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!story) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Story Not Found</h2>
            <p className="text-gray-600 mb-6">The story you&apos;re looking for doesn&apos;t exist.</p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Get video for this story
  const storyVideo = videos?.find(v => v.story_id === storyId && v.status === 'completed');
  const processingVideo = videos?.find(v => v.story_id === storyId && v.status === 'processing');
  const video = storyVideo || processingVideo || videos?.find(v => v.story_id === storyId);

  const wordCount = (isEditing ? formData.text_raw : story.text_raw || '').split(/\s+/).filter(word => word.length > 0).length;

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {isEditing ? formData.title || 'Untitled Story' : story.title}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(story.status || 'draft')}`}>
                  {(story.status || 'draft').replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Created {formatDate(story.created_at)}</span>
                <span>Updated {formatDate(story.updated_at)}</span>
                <span>{wordCount} words</span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {isEditing ? (
                <>
                  <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Spinner size="sm" color="white" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setShowDeleteModal(true)}>
                    Delete
                  </Button>
                  <Button variant="secondary" onClick={() => setIsEditing(true)}>
                    Edit Story
                  </Button>
                  {story.status === 'draft' && (
                    <Button onClick={handleGenerateScript} disabled={isGeneratingScript}>
                      {isGeneratingScript ? (
                        <>
                          <Spinner size="sm" color="white" className="mr-2" />
                          Generating...
                        </>
                      ) : (
                        'Generate Script'
                      )}
                    </Button>
                  )}
                  {story.status === 'script_generated' && (
                    <Button onClick={handleGenerateVideo} disabled={isGeneratingVideo}>
                      {isGeneratingVideo ? (
                        <>
                          <Spinner size="sm" color="white" className="mr-2" />
                          Starting...
                        </>
                      ) : (
                        'Generate Video'
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                <button
                  onClick={() => handleTabChange('content')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    currentTab === 'content'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Story Content
                </button>
                
                {story.script_json && (
                  <button
                    onClick={() => handleTabChange('script')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      currentTab === 'script'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Script Editor
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {(story.script_json as any)?.beats?.length || 0} beats
                    </span>
                  </button>
                )}
              </nav>
            </div>

            {/* Tab Content */}
            {currentTab === 'content' ? (
              <>
                {/* Story Content */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Story Content</h3>
                    
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            Title
                          </label>
                          <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="text_raw" className="block text-sm font-medium text-gray-700 mb-2">
                            Content
                          </label>
                          <textarea
                            id="text_raw"
                            name="text_raw"
                            value={formData.text_raw}
                            onChange={handleInputChange}
                            rows={10}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="beats" className="block text-sm font-medium text-gray-700 mb-2">
                            Beats (絵の枚数)
                          </label>
                          <input
                            type="number"
                            id="beats"
                            name="beats"
                            value={formData.beats}
                            onChange={handleInputChange}
                            min="1"
                            max="20"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Number of images in the video (1-20, default: 5)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="prose max-w-none">
                          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {story.text_raw}
                          </div>
                        </div>
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span className="font-medium">Beats (絵の枚数):</span>
                            <span>{formData.beats}</span>
                            <span className="text-gray-400">images</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Generated Script Preview */}
                {story.script_json && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Script Preview</h3>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleTabChange('script')}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit Script
                        </Button>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {((story.script_json as any)?.beats || []).map((scene: any, index: number) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-gray-700">{scene.text || scene.content}</p>
                              <p className="text-xs text-gray-500 mt-1">{scene.duration}s • {scene.type}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              /* Script Editor */
              <div className="script-editor-container">
                {story.script_json ? (
                  <ScriptEditor
                    script={story.script_json as any}
                    onChange={(updatedScript: unknown) => {
                      // Revalidate story data when script changes
                      mutateStory();
                    }}
                    onSave={handleScriptSave}
                    isReadOnly={false}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Script Generated</h3>
                      <p className="text-gray-600 mb-4">Generate a script first to start editing</p>
                      <Button onClick={handleGenerateScript} disabled={isGeneratingScript}>
                        {isGeneratingScript ? (
                          <>
                            <Spinner size="sm" color="white" className="mr-2" />
                            Generating...
                          </>
                        ) : (
                          'Generate Script'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Status Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg border ${getStatusColor(story.status || 'draft')}`}>
                      <div className="flex items-center space-x-2">
                        {story.status === 'processing' && <Spinner size="sm" />}
                        <span className="font-medium capitalize">
                          {(story.status || 'draft').replace('_', ' ')}
                        </span>
                      </div>
                      {story.status === 'processing' && (
                        <p className="text-xs mt-1 opacity-75">
                          Video generation in progress...
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Video Card */}
              {video && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Video</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${video.status === 'completed' ? 'bg-green-400' : video.status === 'processing' ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
                        <span className="text-sm capitalize">{video.status}</span>
                      </div>
                      
                      {video.duration_sec && (
                        <p className="text-sm text-gray-600">
                          Duration: {Math.floor(video.duration_sec / 60)}:{(video.duration_sec % 60).toString().padStart(2, '0')}
                        </p>
                      )}
                      
                      {video.status === 'completed' && video.url && (
                        <div className="space-y-2">
                          <Button size="sm" className="w-full" onClick={() => setShowVideoModal(true)}>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Watch Video
                          </Button>
                          <Button variant="secondary" size="sm" className="w-full" onClick={handleDownloadVideo}>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
                  <div className="space-y-2">
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => router.push('/dashboard')}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Dashboard
                    </Button>
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => router.push('/stories/new')}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create New Story
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {video?.url && (
        <VideoModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          videoUrl={video.url}
          title={story.title}
          storyTitle={story.title}
          duration={video.duration_sec}
          onDownload={handleDownloadVideo}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <ModalHeader>
          <h3 className="text-lg font-medium text-gray-900">Delete Story</h3>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this story? This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Story
          </Button>
        </ModalFooter>
      </Modal>
    </Layout>
  );
};

export default StoryEditorPage;