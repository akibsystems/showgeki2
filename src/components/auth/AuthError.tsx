'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

export function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  if (!error) return null;

  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
    'Email not confirmed': 'メールアドレスの確認が完了していません。確認メールをご確認ください。',
    'User already registered': 'このメールアドレスは既に登録されています',
    'Authentication failed': '認証に失敗しました。もう一度お試しください。',
  };

  const displayMessage = errorMessages[error] || error;

  return (
    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
      <div className="flex items-start">
        <svg 
          className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <p className="text-red-400 text-sm">{displayMessage}</p>
      </div>
    </div>
  );
}