'use client';

import React from 'react';
import { Layout } from '@/components/layout';
import { Card, CardContent, Button } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useSession } from '@/components/auth/SessionProvider';
import { restoreSession, clearStoredSession } from '@/lib/supabase/client';

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, session } = useSession();
  const [restoring, setRestoring] = React.useState(false);

  const handleRestoreSession = async () => {
    setRestoring(true);
    try {
      const { error } = await restoreSession();
      if (error) {
        console.error('Failed to restore session:', error);
      } else {
        // Reload to update session state
        window.location.reload();
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleClearSession = () => {
    clearStoredSession();
    alert('保存されたセッションを削除しました');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
          プロフィール設定
        </h1>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-100">アカウント情報</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">メールアドレス</label>
                  <p className="text-gray-100">{user?.email}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">ユーザーID</label>
                  <p className="text-gray-100 font-mono text-sm">{user?.id}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">登録日</label>
                  <p className="text-gray-100">
                    {user?.created_at && new Date(user.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-100">セッション管理</h2>
              
              <p className="text-sm text-gray-400">
                他のデバイスでもログイン状態を維持できるように、セッション情報を保存・復元できます。
              </p>

              <div className="space-y-3">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/20">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">現在のセッション状態</h3>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-400">
                      有効期限: {session?.expires_at && new Date(session.expires_at * 1000).toLocaleString('ja-JP')}
                    </p>
                    <p className="text-gray-400">
                      セッションID: <span className="font-mono">{session?.access_token?.substring(0, 20)}...</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRestoreSession}
                    loading={restoring}
                  >
                    セッションを復元
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSession}
                  >
                    保存済みセッションを削除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-100">モバイルアクセス</h2>
              
              <p className="text-sm text-gray-400">
                スマートフォンやタブレットからもアクセスできます。ブラウザで以下のURLを開いてください：
              </p>

              <div className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/20">
                <p className="text-sm font-mono text-purple-400 break-all">
                  {typeof window !== 'undefined' && window.location.origin}
                </p>
              </div>

              <p className="text-xs text-gray-500">
                ※ 同じGoogleアカウントでログインするか、Magic Linkを使用してください
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}