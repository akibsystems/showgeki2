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
    <div 
      className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/50 hover:border-purple-400/70 hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer rounded-lg overflow-hidden"
      onClick={handleCreateWorkflow}
    >
      <div className="p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-purple-600/20 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-3">新しい脚本を作成</h3>
        <p className="text-gray-300">
          あなたの物語をシェイクスピア風の脚本に変換し、<br />
          アニメ動画を自動生成します
        </p>
      </div>
    </div>
  );
}