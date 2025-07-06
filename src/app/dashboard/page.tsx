'use client';

import React from 'react';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Spinner } from '@/components/ui';
import { useApp, useToast } from '@/contexts';
import { useUserWorkspace } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { CreateScriptCard, RecentWorkflows, RecentVideos, UsageStats } from '@/components/dashboard';

// ================================================================
// Dashboard Page Component
// ================================================================

const DashboardContent: React.FC = () => {
  const { state } = useApp();
  const { error } = useToast();
  const { user } = useAuth();

  // Fetch data using SWR hooks
  const { workspace, isLoading: workspaceLoading, ensureWorkspace } = useUserWorkspace();

  // Ensure workspace exists for first-time users
  useEffect(() => {
    const initializeWorkspace = async () => {
      // Only run when loading is complete and no workspace exists
      if (!workspaceLoading && !workspace && !state.isLoading) {
        // Check if already attempting to create workspace
        const isCreatingWorkspace = sessionStorage.getItem('creatingWorkspace');
        if (isCreatingWorkspace) {
          return;
        }
        
        try {
          console.log('[Dashboard] Initializing workspace...');
          sessionStorage.setItem('creatingWorkspace', 'true');
          await ensureWorkspace();
        } catch (err) {
          console.error('[Dashboard] Failed to initialize workspace:', err);
          error('Failed to initialize workspace');
        } finally {
          sessionStorage.removeItem('creatingWorkspace');
        }
      }
    };

    initializeWorkspace();
    // Only depend on loading states to avoid re-running when workspace is created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceLoading, state.isLoading]);

  // Show loading state while essential data is loading
  const isLoading = state.isLoading || workspaceLoading;
  
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-400">ダッシュボードを読み込み中...</p>
          </div>
        </div>
      </Layout>
    );
  }


  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Tokyo Shakespeare Studio
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
            あなたの物語をシェイクスピア風のアニメ動画に変換します
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Create Script & Recent Workflows */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create New Script Card */}
            <CreateScriptCard />

            {/* Recent Workflows */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">最近の脚本</h2>
                <Link href="/stories">
                  <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                    すべて見る →
                  </Button>
                </Link>
              </div>
              <RecentWorkflows />
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            {/* Quick Access Cards */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">クイックアクセス</h3>
                <div className="space-y-3">
                  <Link href="/stories">
                    <Button variant="secondary" size="md" className="w-full justify-start">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      脚本一覧
                    </Button>
                  </Link>
                  <Link href="/videos">
                    <Button variant="secondary" size="md" className="w-full justify-start">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      動画一覧
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Usage Stats */}
            <UsageStats />
          </div>
        </div>

        {/* Recent Videos Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">最近の動画</h2>
            <Link href="/videos">
              <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                すべて見る →
              </Button>
            </Link>
          </div>
          <RecentVideos />
        </div>

      </div>
    </Layout>
  );
};

const DashboardPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
};

export default DashboardPage;