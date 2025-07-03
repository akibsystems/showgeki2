'use client';

import React from 'react';

// ================================================================
// Types
// ================================================================

interface SkeletonProps {
  className?: string;
  animate?: boolean;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

// ================================================================
// Skeleton Component
// ================================================================

export function Skeleton({
  className = '',
  animate = true,
  variant = 'text',
  width,
  height,
  count = 1
}: SkeletonProps) {
  const baseClasses = 'bg-gray-800';
  
  const animateClasses = animate ? 'animate-pulse' : '';
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full'
  }[variant];

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? height : undefined),
    height: height || (variant === 'text' ? '1em' : undefined),
  };

  const elements = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClasses} ${animateClasses} ${variantClasses} ${className}`}
      style={style}
    />
  ));

  return count > 1 ? <>{elements}</> : elements[0];
}

// ================================================================
// Table Skeleton Component
// ================================================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  className = ''
}: TableSkeletonProps) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden ${className}`}>
      <table className="w-full">
        {showHeader && (
          <thead className="bg-gray-800/50">
            <tr>
              {Array.from({ length: columns }, (_, i) => (
                <th key={i} className="px-6 py-3">
                  <Skeleton height={16} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex} className="border-t border-gray-800">
              {Array.from({ length: columns }, (_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <Skeleton height={16} width={colIndex === 0 ? '60%' : '80%'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ================================================================
// Card Skeleton Component
// ================================================================

interface CardSkeletonProps {
  showImage?: boolean;
  showActions?: boolean;
  className?: string;
}

export function CardSkeleton({
  showImage = true,
  showActions = true,
  className = ''
}: CardSkeletonProps) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden ${className}`}>
      {showImage && (
        <Skeleton variant="rectangular" height={200} className="w-full" />
      )}
      <div className="p-4 space-y-3">
        <Skeleton height={20} width="60%" />
        <Skeleton height={16} width="40%" />
        <div className="space-y-2 pt-2">
          <Skeleton height={14} />
          <Skeleton height={14} width="90%" />
        </div>
        {showActions && (
          <div className="flex gap-2 pt-4">
            <Skeleton variant="rectangular" height={32} width={80} />
            <Skeleton variant="rectangular" height={32} width={80} />
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// Grid Skeleton Component
// ================================================================

interface GridSkeletonProps {
  count?: number;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  component?: React.ReactNode;
  className?: string;
}

export function GridSkeleton({
  count = 8,
  columns = { default: 1, sm: 2, lg: 3, xl: 4 },
  component = <CardSkeleton />,
  className = ''
}: GridSkeletonProps) {
  const gridClasses = [
    'grid',
    'gap-4',
    columns.default && `grid-cols-${columns.default}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{component}</div>
      ))}
    </div>
  );
}

// ================================================================
// Stat Card Skeleton Component
// ================================================================

export function StatCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <Skeleton variant="rectangular" width={60} height={24} />
      </div>
      <Skeleton height={16} width="50%" className="mb-2" />
      <Skeleton height={32} width="70%" />
    </div>
  );
}

// ================================================================
// Chart Skeleton Component
// ================================================================

interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

export function ChartSkeleton({ height = 300, className = '' }: ChartSkeletonProps) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg p-6 ${className}`}>
      <Skeleton height={24} width="30%" className="mb-4" />
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end justify-between gap-2 px-8">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex-1">
              <Skeleton
                variant="rectangular"
                height={`${20 + Math.random() * 60}%`}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between mt-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height={14} width={60} />
        ))}
      </div>
    </div>
  );
}