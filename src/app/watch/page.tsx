'use client';

import { useState } from 'react';
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

  const handleDownload = () => {
    if (videoData?.video_url) {
      const link = document.createElement('a');
      link.href = videoData.video_url;
      link.download = `showgeki_${videoData.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href="/"
              className="text-purple-600 hover:text-purple-800 font-medium flex items-center gap-2"
            >
              ← ホームに戻る
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              5幕劇視聴
            </h1>
            <p className="text-gray-600 mb-8">
              登録番号を入力して、AIが作成したあなたの未来の5幕劇を視聴・ダウンロードできます。
            </p>
            
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="registrationId" className="block text-sm font-medium text-gray-700 mb-2">
                    登録番号 *
                  </label>
                  <input
                    type="text"
                    id="registrationId"
                    value={registrationId}
                    onChange={(e) => setRegistrationId(e.target.value.toUpperCase())}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-lg"
                    placeholder="例: ABC12345"
                    maxLength={8}
                    disabled={isLoading}
                  />
                </div>
                <div className="sm:pt-7">
                  <button
                    type="submit"
                    disabled={isLoading || !registrationId.trim()}
                    className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-4 px-8 rounded-lg transition-colors"
                  >
                    {isLoading ? '検索中...' : '5幕劇を検索'}
                  </button>
                </div>
              </div>
            </form>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
            
            {videoData && (
              <div className="border-t pt-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    登録番号: {videoData.id}
                  </h2>
                  <p className="text-sm text-gray-500">
                    作成日: {new Date(videoData.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">あなたの願い:</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap text-gray-700">{videoData.story_text}</p>
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
                        className="w-full max-h-96"
                        src={videoData.video_url}
                      >
                        お使いのブラウザは動画の再生に対応していません。
                      </video>
                    </div>
                    
                    <button
                      onClick={handleDownload}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      5幕劇をダウンロード
                    </button>
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