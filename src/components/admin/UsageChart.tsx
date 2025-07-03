'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';

// ================================================================
// Types
// ================================================================

interface UsageChartProps {
  data: Array<{
    date: string;
    stories_created: number;
    videos_created: number;
    unique_users: number;
  }>;
  loading?: boolean;
}

// ================================================================
// Component
// ================================================================

export function UsageChart({ data, loading = false }: UsageChartProps) {
  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">グラフを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-gray-400">データがありません</p>
        </div>
      </div>
    );
  }

  // Format data for display
  const formattedData = data.map(item => ({
    ...item,
    displayDate: format(new Date(item.date), 'M/d', { locale: ja }),
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-100">利用状況の推移（過去30日間）</h3>
        <p className="text-sm text-gray-400 mt-1">
          日別のストーリー作成数、動画生成数、アクティブユーザー数
        </p>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorStories" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            
            <XAxis
              dataKey="displayDate"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
              }}
              labelStyle={{ color: '#e5e7eb' }}
              itemStyle={{ color: '#e5e7eb' }}
              formatter={(value: number) => value.toLocaleString()}
              labelFormatter={(label: any) => {
                try {
                  const date = new Date(label);
                  if (!isNaN(date.getTime())) {
                    return format(date, 'yyyy年M月d日', { locale: ja });
                  }
                } catch (e) {
                  // Fallback to original label
                }
                return label;
              }}
            />
            
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
              formatter={(value: string) => {
                const labels: { [key: string]: string } = {
                  stories_created: 'ストーリー作成',
                  videos_created: '動画生成',
                  unique_users: 'アクティブユーザー',
                };
                return labels[value] || value;
              }}
            />
            
            <Area
              type="monotone"
              dataKey="stories_created"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorStories)"
              strokeWidth={2}
            />
            
            <Area
              type="monotone"
              dataKey="videos_created"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorVideos)"
              strokeWidth={2}
            />
            
            <Area
              type="monotone"
              dataKey="unique_users"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorUsers)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}