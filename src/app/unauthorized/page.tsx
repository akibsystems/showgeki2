'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { useState, useEffect } from 'react';

// ================================================================
// Unauthorized Page
// ================================================================

export default function UnauthorizedPage() {
  const [requestId, setRequestId] = useState<string>('N/A');
  
  useEffect(() => {
    // Generate request ID on client side only
    setRequestId(crypto.randomUUID());
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            アクセス権限がありません
          </h1>
          
          <p className="text-gray-400">
            このページにアクセスするには管理者権限が必要です
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/">
            <Button variant="primary" size="md" className="w-full">
              ホームに戻る
            </Button>
          </Link>
          
          <Link href="/dashboard">
            <Button variant="secondary" size="md" className="w-full">
              ダッシュボードへ
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800">
          <p className="text-sm text-gray-500">
            管理者権限が必要な場合は、システム管理者にお問い合わせください
          </p>
        </div>
      </div>
    </div>
  );
}