import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { UserMenu } from '@/components/auth/UserMenu';

// ================================================================
// Header Component Types
// ================================================================

interface HeaderProps {
  onMobileMenuClick?: () => void;
  className?: string;
}

// ================================================================
// Header Component
// ================================================================

export const Header: React.FC<HeaderProps> = ({
  onMobileMenuClick,
  className = '',
}) => {
  return (
    <header className={`bg-gray-900/80 backdrop-blur-md border-b border-purple-500/20 shadow-lg ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo only */}
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <img
                src="/TSAS_logo.jpg"
                alt="Tokyo Shakespeare Anime Studio"
                className="h-10 w-auto rounded-lg shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300"
              />
              <span className="text-sm sm:text-xl font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent group-hover:from-amber-300 group-hover:to-purple-300 transition-all duration-300">
                Tokyo Shakespeare Anime Studio
              </span>
            </Link>
          </div>


          {/* Right side - User menu and mobile menu button */}
          <div className="flex items-center gap-4">
            {/* User Menu */}
            <UserMenu />

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={onMobileMenuClick}
              aria-label="Open menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

// ================================================================
// Export
// ================================================================

export default Header;