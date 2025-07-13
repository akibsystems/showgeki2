'use client';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts';

export function CreateScriptCard() {
  const { user } = useAuth();
  const { error } = useToast();

  const handleCreateWorkflow = async () => {
    if (!user) {
      error('ログインが必要です');
      return;
    }

    try {
      const response = await fetch('/api/workflow/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create workflow');
      }

      const data = await response.json();
      window.location.href = data.redirect_url;
    } catch (err) {
      console.error('Failed to create workflow:', err);
      error('ワークフローの作成に失敗しました');
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/50 rounded-lg overflow-hidden">
      <div className="p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-purple-600/20 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-3">新しい脚本を作成</h3>
        <p className="text-gray-300 mb-6">
          あなたの物語をシェイクスピア風の脚本に変換し、<br />
          アニメ動画を自動生成します
        </p>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/instant/create'}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            かんたんモード
          </button>
          <button
            onClick={handleCreateWorkflow}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            プロフェッショナルモード
          </button>
        </div>
      </div>
    </div>
  );
}