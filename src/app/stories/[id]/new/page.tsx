'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/layout';
import { Spinner } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { WorkflowDirector } from '@/components/workflow/WorkflowDirector';
import { useStory } from '@/hooks';

const WorkflowPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyId = params.id as string;
  const stepFromUrl = searchParams.get('step');
  
  const { story, isLoading, error } = useStory(storyId);

  // ストーリーの状態をチェック
  useEffect(() => {
    if (!isLoading && story) {
      // 既に完成しているストーリーの場合は編集ページへリダイレクト
      if (story.status === 'completed' || story.script_json) {
        router.replace(`/stories/${storyId}`);
      }
    }
  }, [story, isLoading, storyId, router]);

  // エラー時の処理
  useEffect(() => {
    if (error) {
      console.error('Failed to load story:', error);
      router.replace('/dashboard');
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-400">読み込み中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!story) {
    return null; // エラー時はuseEffectでリダイレクトされる
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <WorkflowDirector 
          storyId={storyId}
          initialStep={stepFromUrl ? parseInt(stepFromUrl, 10) : undefined}
          enableSpecialMode={process.env.NEXT_PUBLIC_ENABLE_SPECIAL_MODE === 'true'}
        />
      </div>
    </Layout>
  );
};

export default function StoryWorkflowPage() {
  return (
    <ProtectedRoute>
      <WorkflowPage />
    </ProtectedRoute>
  );
}