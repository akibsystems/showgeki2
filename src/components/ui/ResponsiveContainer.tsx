import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'tablet' | 'desktop' | 'wide' | 'full';
  padding?: boolean;
}

/**
 * レスポンシブコンテナコンポーネント
 * ブレークポイントに応じて適切な幅とパディングを適用
 */
export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'wide',
  padding = true,
}: ResponsiveContainerProps) {
  const containerClasses = cn(
    'w-full mx-auto',
    {
      'px-4 sm:px-6 lg:px-8': padding,
      'max-w-3xl': maxWidth === 'tablet',
      'max-w-6xl': maxWidth === 'desktop',
      'max-w-7xl': maxWidth === 'wide',
    },
    className
  );

  return <div className={containerClasses}>{children}</div>;
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

/**
 * レスポンシブグリッドコンポーネント
 */
export function ResponsiveGrid({
  children,
  className,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
}: ResponsiveGridProps) {
  const gapSize = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  }[gap];

  const gridClasses = cn(
    'grid',
    gapSize,
    {
      [`grid-cols-${columns.mobile || 1}`]: true,
      [`sm:grid-cols-${columns.tablet || 2}`]: columns.tablet,
      [`lg:grid-cols-${columns.desktop || 3}`]: columns.desktop,
    },
    className
  );

  return <div className={gridClasses}>{children}</div>;
}

interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'vertical' | 'horizontal' | 'responsive';
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

/**
 * レスポンシブスタックコンポーネント
 * モバイルでは縦並び、タブレット以上で横並びに切り替え可能
 */
export function ResponsiveStack({
  children,
  className,
  direction = 'responsive',
  gap = 'md',
  align = 'stretch',
}: ResponsiveStackProps) {
  const gapSize = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  }[gap];

  const alignItems = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  }[align];

  const stackClasses = cn(
    'flex',
    gapSize,
    alignItems,
    {
      'flex-col': direction === 'vertical',
      'flex-row': direction === 'horizontal',
      'flex-col sm:flex-row': direction === 'responsive',
    },
    className
  );

  return <div className={stackClasses}>{children}</div>;
}