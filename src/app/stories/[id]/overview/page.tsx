'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardContent, PageLoading } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SceneOverview } from '@/components/story/scene-overview';
import { useStory } from '@/hooks';
import Link from 'next/link';

const StoryOverviewContent: React.FC = () => {
  const params = useParams();
  const storyId = params.id as string;
  const { story, isLoading, error } = useStory(storyId);

  if (isLoading) {
    return <PageLoading />;
  }

  if (error || !story) {
    return (
      <Layout>
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-red-500">ストーリーの読み込みに失敗しました</p>
            <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 underline mt-4 inline-block">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link href={`/stories/${storyId}`} className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block">
            ← ストーリー編集に戻る
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">
            {story.title || 'タイトル未設定'}
          </h1>
          <p className="text-sm text-gray-400">
            シーン数: {story.beats || 10}
          </p>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            {/* Story Content Preview */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-3">ストーリー内容</h2>
              <div className="bg-gray-800/50 border border-purple-500/20 rounded-md p-4">
                <p className="text-gray-300 whitespace-pre-wrap line-clamp-5">
                  {story.text_raw}
                </p>
              </div>
            </div>

            {/* Scene Overview */}
            <SceneOverview
              storyText={story.text_raw}
              beatCount={story.beats || 10}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

const StoryOverviewPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <StoryOverviewContent />
    </ProtectedRoute>
  );
};

export default StoryOverviewPage;