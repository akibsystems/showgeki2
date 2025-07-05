'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/components/auth/SessionProvider';

// ================================================================
// Sidebar Component Types
// ================================================================

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  current?: boolean;
}

// ================================================================
// Navigation Icons
// ================================================================

const DashboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4"
    />
  </svg>
);

const StoriesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const VideosIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

// ================================================================
// Sidebar Component
// ================================================================

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  className = '',
}) => {
  const pathname = usePathname();
  const { user } = useSession();

  const navigation: NavigationItem[] = [
    {
      name: 'ダッシュボード',
      href: '/dashboard',
      icon: DashboardIcon,
      current: pathname === '/dashboard',
    },
    {
      name: '脚本',
      href: '/stories',
      icon: StoriesIcon,
      current: pathname.startsWith('/stories'),
    },
    {
      name: '動画',
      href: '/videos',
      icon: VideosIcon,
      current: pathname.startsWith('/videos'),
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-80 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-md border-r border-purple-500/20 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${className}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-purple-500/20 lg:hidden">
            <span className="text-lg font-semibold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent">メニュー</span>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${
                      item.current
                        ? 'bg-purple-500/20 text-purple-300 border-r-2 border-purple-400'
                        : 'text-gray-300 hover:text-white hover:bg-purple-500/10'
                    }
                  `}
                  onClick={onClose}
                >
                  <Icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${item.current ? 'text-purple-400' : 'text-gray-500 group-hover:text-purple-300'}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-purple-500/20 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-100 truncate">
                  {user?.email || 'ゲストユーザー'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user ? 'ログイン中' : 'ローカルセッション'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ================================================================
// Export
// ================================================================

export default Sidebar;