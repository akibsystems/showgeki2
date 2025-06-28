'use client';

import React, { useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Spinner, Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';
import { ScriptEditor, ScriptDirector } from '@/components/editor';
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
  
  // Get initial tab from URL parameter (but fallback to content if script editor is disabled)
  const initialTab = searchParams.get('tab') === 'script' && process.env.NEXT_PUBLIC_ENABLE_SCRIPT_EDITOR === 'true' 
    ? 'script' 
    : 'content';
  
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
    // Script Editorタブが無効の場合は'script'タブに切り替えできない
    if (tab === 'script' && process.env.NEXT_PUBLIC_ENABLE_SCRIPT_EDITOR !== 'true') {
      return;
    }
    
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
      error('タイトルと内容は必須です');
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
      // success('Story saved successfully');
    } catch (err) {
      console.error('Failed to save story:', err);
      error('ストーリーの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    try {
      await generateScript({ beats: formData.beats });
      // success('Script generated successfully');
    } catch (err) {
      console.error('Failed to generate script:', err);
      error('台本の生成に失敗しました');
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
        // success('Video generation started');
        // Navigate to videos page to see generation progress
        router.push('/videos');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Failed to generate video:', err);
      error(err instanceof Error ? err.message : '動画の生成に失敗しました');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStory();
      // success('Story deleted successfully');
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to delete story:', err);
      error('ストーリーの削除に失敗しました');
    }
  };

  const handleScriptSave = async (script: unknown) => {
    try {
      await updateStory({ script_json: script as Record<string, any> });
      // success('Script saved successfully');
      // Refresh story data after successful save
      mutateStory();
    } catch (err) {
      console.error('Failed to save script:', err);
      error('台本の保存に失敗しました');
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
      
      // success('Video download started');
    } catch (err) {
      console.error('Failed to download video:', err);
      error('動画のダウンロードに失敗しました');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400 bg-emerald-900/30 border-emerald-500/50';
      case 'processing':
        return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
      case 'script_generated':
        return 'text-purple-400 bg-purple-900/30 border-purple-500/50';
      case 'error':
        return 'text-red-400 bg-red-900/30 border-red-500/50';
      default:
        return 'text-gray-400 bg-gray-800/30 border-gray-600/50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'processing':
        return '処理中';
      case 'script_generated':
        return '台本生成済み';
      case 'error':
        return 'エラー';
      case 'draft':
        return '下書き';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  };

  if (isLoading) {
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

  if (!story) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">ストーリーが見つかりません</h2>
            <p className="text-gray-400 mb-6">お探しのストーリーは存在しません。</p>
            <Button onClick={() => router.push('/dashboard')}>
              ダッシュボードに戻る
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
  const charCount = (isEditing ? formData.text_raw : story.text_raw || '').length;

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header - Mobile optimized */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-100">
                  {isEditing ? formData.title || '無題のストーリー' : story.title}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${getStatusColor(story.status || 'draft')}`}>
                  {getStatusText(story.status || 'draft')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                <span>作成: {formatDate(story.created_at)}</span>
                <span>更新: {formatDate(story.updated_at)}</span>
                <span>{charCount} 文字</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {isEditing ? (
                <>
                  <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={isSaving} className="text-sm sm:text-base">
                    キャンセル
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving} className="text-sm sm:text-base">
                    {isSaving ? (
                      <>
                        <Spinner size="sm" color="white" className="mr-2" />
                        保存中...
                      </>
                    ) : (
                      '変更を保存'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {story.status === 'completed' && storyVideo && (
                    <Button onClick={handleDownloadVideo} className="text-sm sm:text-base">
                      <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      動画を見る
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setShowDeleteModal(true)} className="text-sm sm:text-base">
                    削除
                  </Button>
                  {story.status === 'draft' && (
                    <Button onClick={handleGenerateScript} disabled={isGeneratingScript} className="text-sm sm:text-base">
                      {isGeneratingScript ? (
                        <>
                          <Spinner size="sm" color="white" className="mr-2" />
                          生成中...
                        </>
                      ) : (
                        '台本を生成'
                      )}
                    </Button>
                  )}
                  {story.status === 'script_generated' && (
                    <Button onClick={handleGenerateVideo} disabled={isGeneratingVideo} className="text-sm sm:text-base">
                      {isGeneratingVideo ? (
                        <>
                          <Spinner size="sm" color="white" className="mr-2" />
                          開始中...
                        </>
                      ) : (
                        '動画を生成'
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className={story.status === 'completed' ? '' : 'grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8'}>
          {/* Main Content */}
          <div className={story.status === 'completed' ? 'space-y-6' : 'lg:col-span-2 space-y-6'}>
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="flex space-x-4 sm:space-x-8 min-w-max">
                <button
                  onClick={() => handleTabChange('content')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    currentTab === 'content'
                      ? 'border-purple-400 text-purple-300'
                      : 'border-transparent text-gray-400 hover:text-purple-300 hover:border-purple-500/50'
                  }`}
                >
                  <svg className="w-4 h-4 mr-1 sm:mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  台本ディレクター
                </button>
                
                {process.env.NEXT_PUBLIC_ENABLE_SCRIPT_EDITOR === 'true' && story.script_json && (
                  <button
                    onClick={() => handleTabChange('script')}
                    className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                      currentTab === 'script'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-1 sm:mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    台本エディター
                    <span className="ml-2 inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-500/50">
                      {(story.script_json as any)?.beats?.length || 0} シーン
                    </span>
                  </button>
                )}
              </nav>
            </div>

            {/* Tab Content */}
            {currentTab === 'content' ? (
              <ScriptDirector
                script={story.script_json as any || { $mulmocast: { version: '1.0' }, beats: [] }}
                onChange={handleScriptSave}
                isReadOnly={story.status === 'completed'}
              />
            ) : process.env.NEXT_PUBLIC_ENABLE_SCRIPT_EDITOR === 'true' ? (
              /* Script Editor */
              <div className="script-editor-container">
                {story.script_json ? (
                  <ScriptEditor
                    script={story.script_json as any}
                    onChange={() => {
                      // No action needed - Script Editor handles internal state management
                    }}
                    onSave={handleScriptSave}
                    isReadOnly={story.status === 'completed'}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-6 sm:p-8 text-center">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <h3 className="text-base sm:text-lg font-medium text-gray-100 mb-2">台本がありません</h3>
                      <p className="text-sm text-gray-400 mb-4">先に台本を生成してください</p>
                      <Button onClick={handleGenerateScript} disabled={isGeneratingScript} className="text-sm sm:text-base">
                        {isGeneratingScript ? (
                          <>
                            <Spinner size="sm" color="white" className="mr-2" />
                            生成中...
                          </>
                        ) : (
                          '台本を生成'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* Script Editor is disabled, show Script Director instead */
              <ScriptDirector
                script={story.script_json as any || { $mulmocast: { version: '1.0' }, beats: [] }}
                onChange={handleScriptSave}
                isReadOnly={story.status === 'completed'}
              />
            )}

            {/* Bottom Action Button - Generate Video */}
            {story.status === 'script_generated' && (
              <div className="mt-8 flex justify-center">
                <Button 
                  onClick={handleGenerateVideo} 
                  disabled={isGeneratingVideo} 
                  size="lg"
                  className="w-full sm:w-auto text-base sm:text-lg px-8 py-3"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Spinner size="sm" color="white" className="mr-2" />
                      動画を生成中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      動画を生成する
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar - Video only (hide for completed status) */}
          {story.status !== 'completed' && (
            <div className="lg:col-span-1">
              {video && (
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-medium text-gray-100 mb-4">動画</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${video.status === 'completed' ? 'bg-green-400' : video.status === 'processing' ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
                        <span className="text-sm capitalize">
                          {video.status === 'completed' ? '完了' : video.status === 'processing' ? '処理中' : video.status}
                        </span>
                      </div>
                      
                      {video.duration_sec && (
                        <p className="text-xs sm:text-sm text-gray-400">
                          再生時間: {Math.floor(video.duration_sec / 60)}:{(video.duration_sec % 60).toString().padStart(2, '0')}
                        </p>
                      )}
                      
                      {video.status === 'completed' && video.url && (
                        <div className="space-y-2">
                          <Button size="sm" className="w-full text-xs sm:text-sm" onClick={() => setShowVideoModal(true)}>
                            <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            動画を見る
                          </Button>
                          <Button variant="secondary" size="sm" className="w-full text-xs sm:text-sm" onClick={handleDownloadVideo}>
                            <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            ダウンロード
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
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
          <h3 className="text-lg font-medium text-gray-100">ストーリーを削除</h3>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-400">
            このストーリーを削除してもよろしいですか？この操作は取り消せません。
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            削除する
          </Button>
        </ModalFooter>
      </Modal>
    </Layout>
  );
};

export default StoryEditorPage;