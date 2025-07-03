'use client';

import React from 'react';

// ================================================================
// Types
// ================================================================

interface ErrorMessageProps {
  error: Error | { message: string } | string | null;
  title?: string;
  showDetails?: boolean;
  onRetry?: () => void;
  className?: string;
}

// ================================================================
// Error Message Component
// ================================================================

export function ErrorMessage({
  error,
  title = 'エラーが発生しました',
  showDetails = process.env.NODE_ENV === 'development',
  onRetry,
  className = ''
}: ErrorMessageProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' 
    ? error 
    : error.message || '不明なエラーが発生しました';

  return (
    <div className={`bg-red-500/10 border border-red-500/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg 
            className="w-5 h-5 text-red-400 mt-0.5" 
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
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-400 mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-300">
            {errorMessage}
          </p>
          
          {/* Error details for development */}
          {showDetails && error instanceof Error && error.stack && (
            <details className="mt-3">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                詳細を表示
              </summary>
              <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-32 p-2 bg-gray-900 rounded">
                {error.stack}
              </pre>
            </details>
          )}
          
          {/* Retry button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm text-purple-400 hover:text-purple-300 font-medium focus:outline-none focus:underline"
            >
              もう一度試す
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// API Error Message Component
// ================================================================

interface APIErrorMessageProps {
  error: any;
  onRetry?: () => void;
  className?: string;
}

export function APIErrorMessage({ error, onRetry, className = '' }: APIErrorMessageProps) {
  if (!error) return null;

  // Parse different error formats
  let title = 'エラーが発生しました';
  let message = '不明なエラーが発生しました';
  
  if (error.response) {
    // Axios-style error
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 400:
        title = '入力エラー';
        message = data?.message || 'リクエストが正しくありません';
        break;
      case 401:
        title = '認証エラー';
        message = 'ログインが必要です';
        break;
      case 403:
        title = 'アクセス拒否';
        message = 'このリソースへのアクセス権限がありません';
        break;
      case 404:
        title = 'ページが見つかりません';
        message = '要求されたリソースが見つかりませんでした';
        break;
      case 409:
        title = '競合エラー';
        message = data?.message || 'リソースの競合が発生しました';
        break;
      case 422:
        title = '検証エラー';
        message = data?.message || '入力内容に問題があります';
        break;
      case 429:
        title = 'レート制限';
        message = 'リクエストが多すぎます。しばらくしてから再試行してください';
        break;
      case 500:
        title = 'サーバーエラー';
        message = 'サーバーで問題が発生しました';
        break;
      case 502:
      case 503:
      case 504:
        title = 'サービス利用不可';
        message = 'サービスが一時的に利用できません。しばらくしてから再試行してください';
        break;
      default:
        title = `エラー (${status})`;
        message = data?.message || message;
    }
  } else if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    title = 'ネットワークエラー';
    message = 'インターネット接続を確認してください';
  } else if (error.name === 'AbortError') {
    title = 'リクエストがキャンセルされました';
    message = 'リクエストがタイムアウトしました';
  } else if (error.message) {
    message = error.message;
  }

  return (
    <ErrorMessage
      error={{ message }}
      title={title}
      onRetry={onRetry}
      className={className}
    />
  );
}

// ================================================================
// Inline Error Message Component
// ================================================================

interface InlineErrorProps {
  error: string | null;
  className?: string;
}

export function InlineError({ error, className = '' }: InlineErrorProps) {
  if (!error) return null;

  return (
    <div className={`flex items-center gap-2 text-sm text-red-400 ${className}`}>
      <svg 
        className="w-4 h-4 flex-shrink-0" 
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
      <span>{error}</span>
    </div>
  );
}