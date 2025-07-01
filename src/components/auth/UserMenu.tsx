'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from './SessionProvider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { signOut } from '@/lib/supabase/client';

export function UserMenu() {
  const { user, loading } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="h-10 w-10 rounded-full bg-gray-700 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/auth/login')}
        >
          ログイン
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push('/auth/signup')}
        >
          新規登録
        </Button>
      </div>
    );
  }

  const userInitial = user.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold text-sm hover:from-purple-700 hover:to-purple-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        aria-label="User menu"
      >
        {userInitial}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 rounded-lg shadow-lg shadow-purple-500/20 border border-purple-500/20 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-purple-500/20">
            <p className="text-sm text-gray-300">ログイン中</p>
            <p className="text-sm font-medium text-gray-100 truncate">
              {user.email}
            </p>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                router.push('/dashboard');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-purple-500/10 hover:text-purple-300 transition-colors duration-200"
            >
              ダッシュボード
            </button>
            <button
              onClick={() => {
                router.push('/stories');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-purple-500/10 hover:text-purple-300 transition-colors duration-200"
            >
              マイストーリー
            </button>
            <button
              onClick={() => {
                router.push('/profile');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-purple-500/10 hover:text-purple-300 transition-colors duration-200"
            >
              プロフィール設定
            </button>
          </div>

          <div className="border-t border-purple-500/20 py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-200"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}