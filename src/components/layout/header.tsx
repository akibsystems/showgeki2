import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';

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
    <header className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo only */}
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <img
                src="/TSAS_logo.jpg"
                alt="Tokyo Shakespeare Anime Studio"
                className="h-10 w-auto"
              />
              <span className="text-sm sm:text-xl font-semibold text-gray-900">
                Tokyo Shakespeare Anime Studio
              </span>
            </Link>
          </div>


          {/* Right side - Mobile menu button only */}
          <div className="flex items-center">

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