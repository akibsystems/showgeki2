'use client';

import React, { useState } from 'react';
import { Button, Card, CardContent } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useRateLimit } from './RateLimiter';

interface AuthFormProps {
  mode?: 'signin' | 'signup';
  redirectTo?: string;
}

export function AuthForm({ mode = 'signin', redirectTo = '/dashboard' }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const { isBlocked, remainingAttempts, resetTime, recordAttempt } = useRateLimit('auth_form');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isBlocked) {
      setError(`Too many attempts. Please try again after ${resetTime?.toLocaleTimeString()}`);
      return;
    }

    if (!recordAttempt()) {
      setError(`Too many attempts. Please try again later.`);
      return;
    }

    setIsLoading(true);

    try {
      await signInWithEmail(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="space-y-6 p-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            {mode === 'signin' ? 'ログイン' : 'アカウント作成'}
          </h2>
          <p className="text-gray-400">
            Tokyo Shakespeare Studioでシェイクスピア風の動画を作成しましょう
          </p>
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <p className="text-emerald-400 text-center">
              メールを送信しました！メール内のリンクからログインしてください。
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isLoading}
                disabled={!email || isLoading || isBlocked}
                className="w-full"
              >
                Login Linkを送信
              </Button>

              {remainingAttempts < 3 && !isBlocked && (
                <p className="text-xs text-amber-400 text-center mt-2">
                  残り試行回数: {remainingAttempts}回
                </p>
              )}
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-purple-500/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">または</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Googleでログイン
            </Button>
          </>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-400">
            {mode === 'signin' ? (
              <>
                アカウントをお持ちでない方は
                <button
                  type="button"
                  onClick={() => router.push('/auth/signup')}
                  className="text-purple-400 hover:text-purple-300 ml-1"
                >
                  新規登録
                </button>
              </>
            ) : (
              <>
                すでにアカウントをお持ちの方は
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  className="text-purple-400 hover:text-purple-300 ml-1"
                >
                  ログイン
                </button>
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}