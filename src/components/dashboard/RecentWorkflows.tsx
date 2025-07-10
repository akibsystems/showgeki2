'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface WorkflowItem {
  id: string;
  title: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  hasVideo?: boolean; // 動画生成済みかどうか
}

export function RecentWorkflows() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchWorkflows = async () => {
      try {
        const response = await fetch('/api/dashboard/recent-workflows', {
          headers: {
            'X-User-UID': user.id,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch workflows');
        }

        const data = await response.json();
        setWorkflows(data.workflows);
      } catch (error) {
        console.error('Failed to fetch recent workflows:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflows();
  }, [user]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'in_progress':
        return '作成中';
      case 'draft':
        return '下書き';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'in_progress':
        return 'text-yellow-400';
      case 'draft':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStepLabel = (step: number) => {
    const labels = [
      'ストーリー入力',
      '幕場構成',
      'キャラクター設定',
      '台本作成',
      '音声設定',
      'BGM・字幕',
      '最終確認'
    ];
    return labels[step - 1] || `ステップ${step}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400">まだ脚本がありません</p>
          <p className="text-sm text-gray-500 mt-2">新しい脚本を作成してみましょう</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {workflows.map((workflow) => {
        // completedステータスのworkflowのみ無効化（動画生成済みかどうかは関係なく編集可能にする）
        const isDisabled = workflow.status === 'completed';
        
        const CardComponent = (
          <Card key={workflow.id} className={`bg-gray-800/50 border-gray-700 transition-all ${
            isDisabled 
              ? 'opacity-60 cursor-not-allowed' 
              : 'hover:border-purple-500/50 cursor-pointer'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${
                    isDisabled ? 'text-gray-400' : 'text-white'
                  }`}>
                    {workflow.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`${getStatusColor(workflow.status)}`}>
                      {getStatusLabel(workflow.status)}
                      {workflow.hasVideo && ' 🎬'}
                    </span>
                    <span className="text-gray-400">
                      {getStepLabel(workflow.currentStep)} ({workflow.currentStep}/{workflow.totalSteps})
                    </span>
                  </div>
                </div>
                
                {/* プログレスバー */}
                <div className="w-32">
                  <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all"
                      style={{ width: `${(workflow.currentStep / workflow.totalSteps) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-1">
                    {Math.round((workflow.currentStep / workflow.totalSteps) * 100)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        
        // completedステータスの場合のみリンクを無効化
        if (isDisabled) {
          return CardComponent;
        }
        
        return (
          <Link key={workflow.id} href={`/workflow/${workflow.id}?step=${workflow.currentStep}`}>
            {CardComponent}
          </Link>
        );
      })}
    </div>
  );
}