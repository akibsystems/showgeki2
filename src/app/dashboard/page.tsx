'use client';

import React from 'react';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Spinner } from '@/components/ui';
import { useApp, useToast } from '@/contexts';
import { useUserWorkspace } from '@/hooks';
import Link from 'next/link';
import { useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// ================================================================
// Dashboard Page Component
// ================================================================

const DashboardContent: React.FC = () => {
  const { state } = useApp();
  const { error } = useToast();

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

  const steps = [
    {
      number: 1,
      title: "台本を作成",
      description: "ストーリーからシェイクスピア風の台本を作ります",
      icon: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      action: (
        <Link href="/stories/new">
          <Button variant="primary" size="md" className="w-full">
            台本を作成
          </Button>
        </Link>
      ),
      color: "blue"
    },
    {
      number: 2,
      title: "台本を編集",
      description: "作成した台本を確認・編集できます",
      icon: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      action: (
        <Link href="/stories">
          <Button variant="secondary" size="md" className="w-full">
            台本一覧
          </Button>
        </Link>
      ),
      color: "purple"
    },
    {
      number: 3,
      title: "動画を生成する",
      description: "台本をもとにAIがアニメ風の動画を自動生成します",
      icon: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      action: (
        <Link href="/videos">
          <Button variant="secondary" size="md" className="w-full">
            動画一覧
          </Button>
        </Link>
      ),
      color: "green"
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-gradient-to-br from-blue-900/50 to-purple-900/50',
          text: 'text-blue-400',
          border: 'border-blue-500/50'
        };
      case 'yellow':
        return {
          bg: 'bg-gradient-to-br from-amber-900/50 to-orange-900/50',
          text: 'text-amber-400',
          border: 'border-amber-500/50'
        };
      case 'purple':
        return {
          bg: 'bg-gradient-to-br from-purple-900/50 to-pink-900/50',
          text: 'text-purple-400',
          border: 'border-purple-500/50'
        };
      case 'green':
        return {
          bg: 'bg-gradient-to-br from-emerald-900/50 to-teal-900/50',
          text: 'text-emerald-400',
          border: 'border-emerald-500/50'
        };
      default:
        return {
          bg: 'bg-gray-900/50',
          text: 'text-gray-400',
          border: 'border-gray-700'
        };
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-12 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">
            <span className="shakespeare-title">Tokyo Shakespeare Anime Studio</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto px-4 sm:px-0">
            あなたの物語をシェイクスピア風のアニメ動画に変換します
          </p>
        </div>

        {/* How to Use Section */}
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-100 text-center mb-6 sm:mb-8">
            使い方
          </h2>
          
          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, index) => {
              const colors = getColorClasses(step.color);
              return (
                <Card key={step.number} className="bg-gray-900/50 border-purple-500/20 hover:border-purple-400/40 hover:shadow-purple-500/20 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Step Number Circle */}
                      <div className={`w-16 h-16 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                        <span className={`text-2xl font-bold ${colors.text}`}>
                          {step.number}
                        </span>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={colors.text}>
                            {step.icon}
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-100">
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 mb-4">
                          {step.description}
                        </p>
                        <div>
                          {step.action}
                        </div>
                      </div>
                    </div>
                    
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 sm:mt-12 bg-gradient-to-r from-purple-900/30 to-amber-900/30 rounded-lg p-6 sm:p-8 text-center border border-purple-500/20 shadow-xl shakespeare-glow">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-100 mb-3 sm:mb-4">
            準備はいいですか？
          </h3>
          <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">
            今すぐあなたの物語をアニメ動画にしましょう
          </p>
          <Link href="/stories/new">
            <Button variant="primary" size="lg" className="shakespeare-button-hover">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              台本を作成
            </Button>
          </Link>
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