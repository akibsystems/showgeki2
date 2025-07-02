'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">
          エラーが発生しました
        </h2>
        <p className="text-gray-400 mb-6">
          管理画面の読み込み中にエラーが発生しました。
        </p>
        <div className="space-y-3">
          <Button onClick={reset} variant="primary">
            再試行
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="secondary">
            ホームへ戻る
          </Button>
        </div>
      </div>
    </div>
  );
}