'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts';
import type { InstantModeInput } from '@/types/instant';

export default function InstantCreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { error } = useToast();

  const [formData, setFormData] = useState<InstantModeInput>({
    storyText: '',
    title: '',
    style: 'anime',
    duration: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 認証情報ロード中またはユーザーが存在しない場合
    if (loading) {
      error('認証情報を確認中です');
      return;
    }

    if (!user) {
      error('ログインが必要です');
      router.push('/auth/login');
      return;
    }

    if (!formData.storyText.trim()) {
      error('ストーリーを入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/instant/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '生成開始に失敗しました');
      }

      const { instantId } = await response.json();
      router.push(`/instant/${instantId}/status`);

    } catch (err) {
      console.error('Submit error:', err);
      error(err instanceof Error ? err.message : '生成開始に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 認証情報ロード中の表示
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  // 認証情報ロード完了後、未ログインの場合は自動リダイレクト
  if (!user) {
    router.push('/auth/login');
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">ログインページにリダイレクト中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-2">⚡ Instant Mode</h1>
        <p className="text-gray-400 mb-8">
          ストーリーを入力するだけで、AIが自動で動画を作成します
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* タイトル（任意） */}
          <div>
            <label className="block text-sm font-medium mb-2">
              タイトル（任意）
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="例：未来への旅"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400"
            />
          </div>

          {/* ストーリー */}
          <div>
            <label className="block text-sm font-medium mb-2">
              ストーリー <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.storyText}
              onChange={(e) => setFormData({ ...formData, storyText: e.target.value })}
              placeholder="あなたの物語を入力してください..."
              rows={8}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.storyText.length}文字
            </p>
          </div>

          {/* オプション設定 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                画風
              </label>
              <select
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value as any })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="anime">アニメ風</option>
                <option value="realistic">リアル風</option>
                <option value="watercolor">水彩画風</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                動画の長さ
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value as any })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="short">短め（〜30秒）</option>
                <option value="medium">標準（〜60秒）</option>
                <option value="long">長め（〜90秒）</option>
              </select>
            </div>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={!formData.storyText.trim() || isSubmitting}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                生成を開始しています...
              </span>
            ) : (
              '🚀 動画を生成する'
            )}
          </button>

          {/* 詳細モードへのリンク */}
          <div className="text-center text-sm text-gray-400">
            細かく設定したい場合は
            <a href="/workflow/create" className="text-purple-400 hover:text-purple-300 ml-1">
              詳細モード
            </a>
            をご利用ください
          </div>
        </form>
      </div>
    </div>
  );
}