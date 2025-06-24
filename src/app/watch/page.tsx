'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type VideoData = {
  id: string;
  story_text: string;
  is_completed: boolean;
  video_url?: string;
  created_at: string;
};

export default function WatchPage() {
  const [registrationId, setRegistrationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // ローカルストレージから登録番号を読み込み
  useEffect(() => {
    const savedId = localStorage.getItem('lastRegistrationId');
    if (savedId) {
      setRegistrationId(savedId);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registrationId.trim()) {
      setError('登録番号を入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setVideoData(null);

    try {
      const response = await fetch(`/api/stories/${registrationId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('指定された登録番号は見つかりませんでした');
        }
        throw new Error('動画の取得に失敗しました');
      }

      const data = await response.json();
      setVideoData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (videoData?.video_url) {
      try {
        // モバイル環境でのダウンロード対応
        if (navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
          // モバイルの場合は新しいタブで開く
          window.open(videoData.video_url, '_blank');
        } else {
          // デスクトップの場合は従来の方法
          const response = await fetch(videoData.video_url);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `showgeki_${videoData.id}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('ダウンロードに失敗しました:', error);
        // フォールバック: 新しいタブで開く
        window.open(videoData.video_url, '_blank');
      }
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rating) {
      setError('評価を選択してください');
      return;
    }

    setIsSubmittingReview(true);
    setError('');

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story_id: videoData?.id,
          review_text: reviewText.trim(),
          rating: rating,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '感想の投稿に失敗しました');
      }

      setReviewSubmitted(true);
      setShowReviewForm(false);
      setRating(0);
      setReviewText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '感想の投稿に失敗しました');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <Link
              href="/"
              className="text-purple-600 hover:text-purple-800 active:text-purple-900 font-medium flex items-center gap-2 touch-manipulation"
            >
              ← ホームに戻る
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight">
              5幕劇視聴
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed">
              登録番号を入力して、AIが作成したあなたの未来の5幕劇を視聴・ダウンロードできます。
            </p>
            
            <form onSubmit={handleSubmit} className="mb-6 sm:mb-8">
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="registrationId" className="block text-sm font-medium text-gray-700 mb-2">
                    登録番号 *
                  </label>
                  <input
                    type="text"
                    id="registrationId"
                    value={registrationId}
                    onChange={(e) => setRegistrationId(e.target.value.toUpperCase())}
                    className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-base sm:text-lg"
                    placeholder="例: ABC12345"
                    maxLength={8}
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !registrationId.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors touch-manipulation text-sm sm:text-base"
                >
                  {isLoading ? '検索中...' : '5幕劇を検索'}
                </button>
              </div>
            </form>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
            
            {videoData && (
              <div className="border-t pt-8">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 break-all">
                    登録番号: {videoData.id}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    作成日: {new Date(videoData.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                
                <div className="mb-4 sm:mb-6">
                  <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">あなたの願い:</h3>
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <p className="whitespace-pre-wrap text-gray-700 text-sm sm:text-base leading-relaxed">{videoData.story_text}</p>
                  </div>
                </div>
                
                {videoData.is_completed && videoData.video_url ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 font-medium">✅ 5幕劇が完成しました！</p>
                    </div>
                    
                    <div className="bg-black rounded-lg overflow-hidden">
                      <video
                        controls
                        className="w-full max-h-64 sm:max-h-96"
                        src={videoData.video_url}
                        playsInline
                      >
                        お使いのブラウザは動画の再生に対応していません。
                      </video>
                    </div>
                    
                    <button
                      onClick={handleDownload}
                      className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors touch-manipulation text-sm sm:text-base"
                    >
                      5幕劇をダウンロード
                    </button>

                    {/* 感想投稿セクション */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      {reviewSubmitted ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-blue-800 font-medium">✅ 感想を投稿いただきありがとうございました！</p>
                        </div>
                      ) : !showReviewForm ? (
                        <button
                          onClick={() => setShowReviewForm(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors touch-manipulation text-sm sm:text-base"
                        >
                          感想を書く
                        </button>
                      ) : (
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                          <h3 className="font-medium text-gray-900 text-lg">この5幕劇の感想をお聞かせください</h3>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              評価 *
                            </label>
                            <div className="flex space-x-4 justify-center">
                              {[
                                { value: 1, emoji: '😞', label: '残念' },
                                { value: 2, emoji: '😐', label: '普通' },
                                { value: 3, emoji: '🙂', label: '良い' },
                                { value: 4, emoji: '😊', label: 'とても良い' },
                                { value: 5, emoji: '🤩', label: '最高' }
                              ].map((item) => (
                                <button
                                  key={item.value}
                                  type="button"
                                  onClick={() => setRating(item.value)}
                                  onMouseEnter={() => setHoveredRating(item.value)}
                                  onMouseLeave={() => setHoveredRating(0)}
                                  className={`flex flex-col items-center p-4 rounded-xl transition-all duration-200 touch-manipulation ${
                                    rating && rating !== item.value
                                      ? 'bg-gray-100 border-2 border-gray-200 opacity-40'
                                      : item.value === (hoveredRating || rating)
                                      ? 'bg-blue-100 border-2 border-blue-500 transform scale-110'
                                      : 'bg-gray-100 border-2 border-gray-300 hover:bg-gray-200 hover:border-gray-400'
                                  }`}
                                  title={item.label}
                                >
                                  <span className={`text-4xl mb-2 transition-all duration-200 ${
                                    rating && rating !== item.value
                                      ? 'filter grayscale'
                                      : ''
                                  }`}>{item.emoji}</span>
                                  <span className="text-xs text-gray-600 font-medium">{item.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label htmlFor="reviewText" className="block text-sm font-medium text-gray-700 mb-2">
                              感想（任意）
                            </label>
                            <textarea
                              id="reviewText"
                              value={reviewText}
                              onChange={(e) => setReviewText(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={4}
                              placeholder="この5幕劇の感想があれば自由にお書きください（未入力でも投稿できます）"
                              maxLength={1000}
                              disabled={isSubmittingReview}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {reviewText.length}/1000文字
                            </p>
                          </div>

                          <div className="flex space-x-3">
                            <button
                              type="submit"
                              disabled={isSubmittingReview || !rating}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors touch-manipulation text-sm sm:text-base"
                            >
                              {isSubmittingReview ? '投稿中...' : '感想を投稿'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowReviewForm(false);
                                setRating(0);
                                setReviewText('');
                                setError('');
                              }}
                              className="flex-1 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors touch-manipulation text-sm sm:text-base"
                            >
                              キャンセル
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 font-medium">🎭 AIが5幕劇を制作中です</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      AIシェイクスピアがあなたの未来を壮大な劇として編縂中です。しばらくお待ちください。
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}