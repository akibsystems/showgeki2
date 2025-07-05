'use client';

import React, { useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { useSession } from '@/components/auth/SessionProvider';

// ================================================================
// Layout Component Types
// ================================================================

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

// ================================================================
// Layout Component
// ================================================================

export const Layout: React.FC<LayoutProps> = ({
  children,
  className = '',
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, loading } = useSession();

  // 認証が無効化されている場合は常に表示
  const showSidebar = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' || !!user;

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={`min-h-screen bg-gray-950 ${className}`}>
      {/* Header with mobile menu button */}
      <Header
        onMobileMenuClick={handleSidebarToggle}
      />

      {/* Main container with sidebar and content */}
      <div className="flex">
        {/* Sidebar - only show when authenticated */}
        {showSidebar && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={handleSidebarClose}
          />
        )}

        {/* Main content area */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

// ================================================================
// Export
// ================================================================

export default Layout;