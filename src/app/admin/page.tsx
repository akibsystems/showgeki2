'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Story = {
  id: string;
  story_text: string;
  is_completed: boolean;
  video_url?: string;
  created_at: string;
};

export default function AdminPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await fetch('/api/admin/stories');
      if (!response.ok) {
        throw new Error('ストーリーの取得に失敗しました');
      }
      const data = await response.json();
      setStories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteStory = async (storyId: string) => {
    setProcessingIds(prev => new Set(prev).add(storyId));
    
    try {
      const response = await fetch(`/api/admin/stories/${storyId}/complete`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('完了処理に失敗しました');
      }
      
      await fetchStories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(storyId);
        return newSet;
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
          >
            ← ホームに戻る
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI劇場管理画面
          </h1>
          <p className="text-gray-600 mb-8">
            投稿された願いを確認し、AIが5幕劇を完成させた後に完了フラグを立てることができます。
          </p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            {stories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                投稿された願いはありません
              </div>
            ) : (
              stories.map((story) => (
                <div
                  key={story.id}
                  className={`border rounded-lg p-6 ${
                    story.is_completed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        登録番号: {story.id}
                      </h3>
                      <p className="text-sm text-gray-500">
                        作成日: {new Date(story.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {story.is_completed ? (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          完了済み
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                          制作中
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">願いの内容:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg relative">
                      <pre className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                        {story.story_text}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(story.story_text)}
                        className="absolute top-2 right-2 bg-white hover:bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs border"
                      >
                        コピー
                      </button>
                    </div>
                  </div>
                  
                  {!story.is_completed && (
                    <button
                      onClick={() => handleCompleteStory(story.id)}
                      disabled={processingIds.has(story.id)}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition-colors"
                    >
                      {processingIds.has(story.id) ? '処理中...' : '5幕劇作成完了'}
                    </button>
                  )}
                  
                  {story.is_completed && story.video_url && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-green-800 text-sm">
                        5幕劇URL: <a href={story.video_url} target="_blank" rel="noopener noreferrer" className="underline">{story.video_url}</a>
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}