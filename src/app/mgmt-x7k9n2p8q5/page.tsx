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

type Review = {
  id: string;
  story_id: string;
  review_text: string;
  rating: number;
  created_at: string;
};

export default function AdminPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [reviews, setReviews] = useState<Map<string, Review[]>>(new Map());
  const [loadingReviews, setLoadingReviews] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStories();
  }, []);

  // 「全て」タブが選択された時に完了済みストーリーの感想を自動読み込み
  useEffect(() => {
    if (activeTab === 'all') {
      const completedStories = stories.filter(story => story.is_completed);
      completedStories.forEach(story => {
        // 各ストーリーの感想を自動読み込み
        if (!loadingReviews.has(story.id) && !reviews.has(story.id)) {
          fetchReviews(story.id);
        }
      });
    }
  }, [activeTab, stories]);

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

  const fetchReviews = async (storyId: string) => {
    if (loadingReviews.has(storyId) || reviews.has(storyId)) {
      return; // 既に読み込み中または読み込み済み
    }

    setLoadingReviews(prev => new Set(prev).add(storyId));

    try {
      const response = await fetch(`/api/admin/reviews?story_id=${storyId}`);
      if (!response.ok) {
        throw new Error('レビューの取得に失敗しました');
      }
      const reviewData = await response.json();
      setReviews(prev => new Map(prev).set(storyId, reviewData));
    } catch (err) {
      console.error('レビューの取得エラー:', err);
    } finally {
      setLoadingReviews(prev => {
        const newSet = new Set(prev);
        newSet.delete(storyId);
        return newSet;
      });
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 簡易的なフィードバック（必要に応じてtoast等に変更可能）
      console.log('コピーしました:', text);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
    }
  };

  // ストーリーをフィルタリング・ソート
  const getFilteredAndSortedStories = () => {
    let filteredStories = stories;
    
    if (activeTab === 'pending') {
      // 未完了のみフィルタリング
      filteredStories = stories.filter(story => !story.is_completed);
      // 古い順にソート
      return filteredStories.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      // すべて表示、新しい順にソート
      return filteredStories.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };

  const displayedStories = getFilteredAndSortedStories();

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
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 active:text-blue-900 font-medium flex items-center gap-2 touch-manipulation"
          >
            ← ホームに戻る
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight">
            AI劇場管理画面
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed">
            投稿された願いを確認し、AIが5幕劇を完成させた後に完了フラグを立てることができます。
          </p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          
          {/* タブ */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              未完了 ({stories.filter(s => !s.is_completed).length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              すべて ({stories.length})
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {displayedStories.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
                {activeTab === 'pending' ? '未完了の願いはありません' : '投稿された願いはありません'}
              </div>
            ) : (
              displayedStories.map((story) => (
                <div
                  key={story.id}
                  className={`border rounded-lg p-4 sm:p-6 ${
                    story.is_completed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-all">
                          登録番号: {story.id}
                        </h3>
                        <button
                          onClick={() => copyToClipboard(story.id)}
                          className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 px-2 py-1 rounded text-xs border touch-manipulation flex-shrink-0"
                          title="登録番号をコピー"
                        >
                          コピー
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500">
                        作成日: {new Date(story.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {story.is_completed ? (
                        <span className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                          完了済み
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                          制作中
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">願いの内容:</h4>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg relative">
                      <pre className="whitespace-pre-wrap text-gray-700 text-xs sm:text-sm leading-relaxed pr-16">
                        {story.story_text}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(story.story_text)}
                        className="absolute top-2 right-2 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs border touch-manipulation"
                      >
                        コピー
                      </button>
                    </div>
                  </div>
                  
                  {!story.is_completed && (
                    <button
                      onClick={() => handleCompleteStory(story.id)}
                      disabled={processingIds.has(story.id)}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded transition-colors touch-manipulation text-sm sm:text-base"
                    >
                      {processingIds.has(story.id) ? '処理中...' : '5幕劇作成完了'}
                    </button>
                  )}
                  
                  {story.is_completed && story.video_url && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-green-800 text-xs sm:text-sm break-all">
                        5幕劇URL: <a href={story.video_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-900">{story.video_url}</a>
                      </p>
                    </div>
                  )}

                  {/* 感想セクション（完了済みストーリーのみ） */}
                  {story.is_completed && (
                    <div className="mt-4">
                      {activeTab === 'pending' ? (
                        // 未完了タブでは従来通りボタンクリックで表示
                        !reviews.has(story.id) && !loadingReviews.has(story.id) ? (
                          <button
                            onClick={() => fetchReviews(story.id)}
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            感想を表示
                          </button>
                        ) : loadingReviews.has(story.id) ? (
                          <p className="text-gray-500 text-sm">感想を読み込み中...</p>
                        ) : (
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-900 text-sm sm:text-base">
                                感想 ({reviews.get(story.id)?.length || 0}件)
                              </h5>
                              <button
                                onClick={() => {
                                  setReviews(prev => {
                                    const newMap = new Map(prev);
                                    newMap.delete(story.id);
                                    return newMap;
                                  });
                                }}
                                className="text-gray-500 hover:text-gray-700 text-xs"
                              >
                                ×
                              </button>
                            </div>
                            
                            {reviews.get(story.id)?.length === 0 ? (
                              <p className="text-gray-500 text-sm">まだ感想は投稿されていません</p>
                            ) : (
                              <div className="space-y-3">
                                {reviews.get(story.id)?.map((review) => (
                                  <div key={review.id} className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <div className="flex items-center">
                                          <span className="text-lg mr-1">
                                            {review.rating === 1 && '😞'}
                                            {review.rating === 2 && '😐'}
                                            {review.rating === 3 && '🙂'}
                                            {review.rating === 4 && '😊'}
                                            {review.rating === 5 && '🤩'}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {review.rating}/5
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {new Date(review.created_at).toLocaleDateString('ja-JP', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                      {review.review_text || '（感想の記載なし）'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                        // 全てタブでは最初から展開表示
                        loadingReviews.has(story.id) ? (
                          <div className="border-t pt-4">
                            <p className="text-gray-500 text-sm">感想を読み込み中...</p>
                          </div>
                        ) : (
                          <div className="border-t pt-4">
                            <h5 className="font-medium text-gray-900 text-sm sm:text-base mb-3">
                              感想 ({reviews.get(story.id)?.length || 0}件)
                            </h5>
                            
                            {reviews.get(story.id)?.length === 0 ? (
                              <p className="text-gray-500 text-sm">まだ感想は投稿されていません</p>
                            ) : (
                              <div className="space-y-3">
                                {reviews.get(story.id)?.map((review) => (
                                  <div key={review.id} className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <div className="flex items-center">
                                          <span className="text-lg mr-1">
                                            {review.rating === 1 && '😞'}
                                            {review.rating === 2 && '😐'}
                                            {review.rating === 3 && '🙂'}
                                            {review.rating === 4 && '😊'}
                                            {review.rating === 5 && '🤩'}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {review.rating}/5
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {new Date(review.created_at).toLocaleDateString('ja-JP', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                      {review.review_text || '（感想の記載なし）'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      )}
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