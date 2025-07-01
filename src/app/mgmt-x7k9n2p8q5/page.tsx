'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardContent, Button, Spinner } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useSession } from '@/components/auth/SessionProvider';
import { useStories, useVideos } from '@/hooks';
import { useToast } from '@/contexts';
import { useRouter } from 'next/navigation';

// Admin email whitelist
const ADMIN_EMAILS = [
  'admin@showgeki2.com',
  // Add more admin emails here
];

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  );
}

function AdminContent() {
  const { user } = useSession();
  const router = useRouter();
  const { error } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (user && !ADMIN_EMAILS.includes(user.email || '')) {
      error('Access denied. Admin privileges required.');
      router.push('/dashboard');
    }
  }, [user, router, error]);

  const { stories, isLoading: storiesLoading } = useStories();
  const { videos, isLoading: videosLoading } = useVideos();

  // Filter stories by status
  const filteredStories = stories?.filter(story => {
    if (statusFilter === 'all') return true;
    return story.status === statusFilter;
  }) || [];

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      error('Failed to copy ID');
    }
  };

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      error('Failed to copy content');
    }
  };

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return null;
  }

  const isLoading = storiesLoading || videosLoading;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            管理画面
          </h1>
          <p className="text-gray-400 mt-2">ShowGeki2 システム管理</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm text-gray-400">総ストーリー数</h3>
              <p className="text-2xl font-bold text-purple-400">
                {stories?.length || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm text-gray-400">完了済み</h3>
              <p className="text-2xl font-bold text-emerald-400">
                {stories?.filter(s => s.status === 'completed').length || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm text-gray-400">処理中</h3>
              <p className="text-2xl font-bold text-amber-400">
                {stories?.filter(s => s.status === 'processing').length || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm text-gray-400">エラー</h3>
              <p className="text-2xl font-bold text-red-400">
                {stories?.filter(s => s.status === 'error').length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Filter */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            すべて
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
          >
            完了済み
          </Button>
          <Button
            variant={statusFilter === 'processing' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter('processing')}
          >
            処理中
          </Button>
          <Button
            variant={statusFilter === 'script_generated' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter('script_generated')}
          >
            台本生成済み
          </Button>
          <Button
            variant={statusFilter === 'error' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter('error')}
          >
            エラー
          </Button>
        </div>

        {/* Stories Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50 border-b border-purple-500/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">タイトル</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">ユーザー</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">ステータス</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">作成日時</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">アクション</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/10">
                    {filteredStories.map((story) => {
                      const video = videos?.find(v => v.story_id === story.id);
                      return (
                        <tr key={story.id} className="hover:bg-gray-800/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-gray-400">{story.id.slice(0, 8)}...</code>
                              <button
                                onClick={() => handleCopyId(story.id)}
                                className="text-purple-400 hover:text-purple-300"
                              >
                                {copiedId === story.id ? '✓' : '📋'}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-gray-100">{story.title}</p>
                              <button
                                onClick={() => handleCopyContent(story.text_raw)}
                                className="text-xs text-gray-500 hover:text-gray-400"
                              >
                                内容をコピー
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-400">
                              {story.user_id ? story.user_id.slice(0, 8) + '...' : story.uid.slice(0, 8) + '...'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded ${
                              story.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                              story.status === 'processing' ? 'bg-amber-500/20 text-amber-400' :
                              story.status === 'error' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {story.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-400">
                              {new Date(story.created_at).toLocaleString('ja-JP')}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/stories/${story.id}`)}
                              >
                                編集
                              </Button>
                              {video?.url && (
                                <a
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-400 hover:text-purple-300 text-sm"
                                >
                                  動画
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}