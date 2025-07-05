import React from 'react';
import type { CardProps } from '@/types';

// ================================================================
// Card Component
// ================================================================

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  isLoading = false,
  className = '',
  children,
}) => {
  const cardClasses = [
    'bg-gray-900/50 backdrop-blur-sm rounded-lg shadow-lg shadow-purple-500/10 border border-purple-500/20 overflow-hidden transition-all duration-300 hover:shadow-purple-500/20 hover:border-purple-500/30',
    isLoading ? 'opacity-60' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses}>
      {/* Card Header */}
      {(title || subtitle || actions) && (
        <div className="px-4 py-3 border-b border-purple-500/20 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-medium text-gray-100 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-2 ml-4">{actions}</div>
            )}
          </div>
        </div>
      )}

      {/* Card Body */}
      {isLoading ? (
        <div className="px-4 py-4">
          <div className="animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

// ================================================================
// Card Sub-components
// ================================================================

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={className || 'space-y-3'}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between ${className}`}>
    {children}
  </div>
);

// ================================================================
// Export
// ================================================================

export default Card;