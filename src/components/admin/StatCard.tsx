'use client';

import React from 'react';

// ================================================================
// Types
// ================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'purple' | 'green' | 'amber' | 'red';
  loading?: boolean;
}

// ================================================================
// Component
// ================================================================

export function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  color = 'blue',
  loading = false 
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/20 text-green-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400">{title}</p>
          
          {loading ? (
            <div className="mt-1 h-8 w-24 bg-gray-800 rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline mt-1 space-x-2">
              <p className="text-2xl font-bold text-gray-100">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              
              {trend && (
                <span className={`text-sm flex items-center ${
                  trend.isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {trend.isPositive ? (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {Math.abs(trend.value)}%
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}