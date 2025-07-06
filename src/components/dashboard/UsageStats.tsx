'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

interface Stats {
  totalScripts: number;
  totalVideos: number;
  totalDurationSec: number;
  totalWorkflows: number;
}

export function UsageStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'X-User-UID': user.id,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data.stats);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0分';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex justify-center">
            <Spinner size="md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">利用状況</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">作成した脚本</span>
            <span className="text-white font-medium">
              {stats?.totalScripts || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">生成した動画</span>
            <span className="text-white font-medium">
              {stats?.totalVideos || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">総再生時間</span>
            <span className="text-white font-medium">
              {formatDuration(stats?.totalDurationSec || 0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}