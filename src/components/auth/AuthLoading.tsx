'use client';

import React from 'react';
import { Spinner } from '@/components/ui';

export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-400">認証情報を確認中...</p>
      </div>
    </div>
  );
}