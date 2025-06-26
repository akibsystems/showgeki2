import React, { useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';

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

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header with mobile menu button */}
      <Header
        onMobileMenuClick={handleSidebarToggle}
      />

      {/* Main container with sidebar and content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={handleSidebarClose}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// ================================================================
// Export
// ================================================================

export default Layout;