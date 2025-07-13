'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { INSTANT_STEPS } from '@/types/instant';
import type { InstantGenerationStatus } from '@/types/instant';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function InstantStatusPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<InstantGenerationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 認証情報のロード中は何もしない
    if (loading) {
      return;
    }

    // ロード完了後、ユーザーがログインしていない場合のみリダイレクト
    if (!user) {
      router.push('/auth/login');
      return;
    }

    let interval: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/instant/${id}/status`, {
          headers: {
            'X-User-UID': user.id,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'ステータスの取得に失敗しました');
        }

        const data: InstantGenerationStatus = await response.json();
        setStatus(data);

        // 完了または失敗したらポーリングを停止
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);

          // 完了したら動画ページへリダイレクト
          if (data.status === 'completed' && data.videoId) {
            setTimeout(() => {
              router.push('/videos');
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Status fetch error:', err);
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
        clearInterval(interval);
      }
    };

    // 初回実行
    fetchStatus();

    // 2秒ごとにポーリング
    interval = setInterval(fetchStatus, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, router, user, loading]);

  // 認証情報ロード中の表示
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ エラー</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/instant/create')}
              className="text-blue-600 hover:text-blue-700"
            >
              もう一度試す
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => router.push('/videos')}
              className="text-gray-600 hover:text-gray-700"
            >
              動画一覧に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">生成状況</h1>
          <button
            onClick={() => router.push('/videos')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            動画一覧に戻る
          </button>
        </div>

        {/* 進捗バー */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>進捗</span>
            <span>{status.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>

        {/* ステータス表示 */}
        <div className="space-y-4">
          {/* 現在のステップ */}
          {status.currentStep && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-lg text-gray-800">
                  {INSTANT_STEPS[status.currentStep as keyof typeof INSTANT_STEPS] || status.currentStep}
                </span>
              </div>
            </div>
          )}

          {/* ステータスメッセージ */}
          {status.message && (
            <p className="text-gray-600">{status.message}</p>
          )}

          {/* 完了時 */}
          {status.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="text-green-600 text-2xl mb-2">✅ 完成しました！</div>
              <p className="text-gray-700 mb-4">動画の生成が完了しました</p>
              <p className="text-sm text-gray-500">まもなく動画ページへ移動します...</p>
            </div>
          )}

          {/* エラー時 */}
          {status.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="text-red-600 text-xl mb-2">❌ エラーが発生しました</div>
              <p className="text-gray-700 mb-4">{status.error || '生成中にエラーが発生しました'}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/instant/create')}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  もう一度試す
                </button>
                <button
                  onClick={() => router.push('/videos')}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
                >
                  動画一覧に戻る
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ステップ一覧 */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">処理フェーズ</h2>
          <div className="space-y-2">
            {Object.entries(INSTANT_STEPS).map(([key, label]) => {
              const isCompleted = getStepStatus(key, status.currentStep, status.status) === 'completed';
              const isCurrent = key === status.currentStep;
              const isPending = getStepStatus(key, status.currentStep, status.status) === 'pending';

              return (
                <div
                  key={key}
                  className={`
                    flex items-center p-3 rounded-lg border
                    ${isCompleted ? 'bg-green-50 border-green-200' : ''}
                    ${isCurrent ? 'bg-blue-50 border-blue-300' : ''}
                    ${isPending ? 'bg-gray-50 border-gray-200' : ''}
                  `}
                >
                  <div className="mr-3">
                    {isCompleted && <span className="text-green-600">✓</span>}
                    {isCurrent && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                    {isPending && <span className="text-gray-400">○</span>}
                  </div>
                  <span className={`
                    ${isCompleted ? 'text-green-600' : ''}
                    ${isCurrent ? 'text-gray-800' : ''}
                    ${isPending ? 'text-gray-400' : ''}
                  `}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ステップの状態を判定
function getStepStatus(
  step: string,
  currentStep?: string,
  overallStatus?: string
): 'completed' | 'current' | 'pending' {
  const steps = Object.keys(INSTANT_STEPS);
  const stepIndex = steps.indexOf(step);
  const currentIndex = currentStep ? steps.indexOf(currentStep) : -1;

  if (overallStatus === 'completed') {
    return 'completed';
  }

  if (stepIndex < currentIndex) {
    return 'completed';
  } else if (stepIndex === currentIndex) {
    return 'current';
  } else {
    return 'pending';
  }
}