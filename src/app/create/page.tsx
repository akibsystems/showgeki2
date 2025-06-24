'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CreatePage() {
  const [story, setStory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(registrationId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      console.error('コピーに失敗しました');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!story.trim()) {
      setError('ストーリーを入力してください');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ story_text: story }),
      });

      if (!response.ok) {
        throw new Error('ストーリーの投稿に失敗しました');
      }

      const data = await response.json();
      setRegistrationId(data.id);
      setStory('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              5幕劇が登録されました！
            </h1>
            <p className="text-gray-600 mb-6">
              あなたの登録番号は以下の通りです。<br />
              AIが劇を完成させたら、この番号で視聴できます。
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6 relative">
              <p className="text-xs text-gray-500 mb-1">登録番号</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-blue-600 break-all">{registrationId}</p>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm transition-colors touch-manipulation"
              >
                {copySuccess ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              ※この番号は大切に保管してください
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/watch"
                onClick={() => {
                  // ローカルストレージに登録番号を保存
                  localStorage.setItem('lastRegistrationId', registrationId);
                }}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors touch-manipulation"
              >
                5幕劇を視聴する
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-2xl mx-auto">
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
              未来の5幕劇作成
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed">
              あなたの願いや夢、理想の未来を入力してください。AIがシェイクスピア風の5幕劇として動画化します。
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="story" className="block text-sm font-medium text-gray-700 mb-2">
                  あなたの未来への願い *
                </label>
                <textarea
                  id="story"
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  className="w-full h-48 sm:h-64 p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base"
                  placeholder="例：10年後に理想のカフェを経営していたい、家族と幸せに暮らしたい、など..."
                  disabled={isSubmitting}
                />
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={isSubmitting || !story.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors touch-manipulation text-sm sm:text-base"
              >
                {isSubmitting ? 'AI劇場に送信中...' : '5幕劇を作成依頼する'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}