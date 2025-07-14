'use client';

import React, { useState } from 'react';
import { Button, Spinner } from '@/components/ui';
import { VideoWithRelations } from '@/hooks/useAdminVideos';
import { ConsistencyCheckResult } from '@/lib/gemini-client';
import { useToast } from '@/contexts';

interface ConsistencyCheckModalProps {
  videos: VideoWithRelations[];
  isOpen: boolean;
  onClose: () => void;
}

export function ConsistencyCheckModal({ videos, isOpen, onClose }: ConsistencyCheckModalProps) {
  const { success, error: showError } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<Record<string, ConsistencyCheckResult>>({});
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  if (!isOpen) return null;

  const handleCheck = async () => {
    setIsChecking(true);
    setResults({});
    setCurrentVideoIndex(0);

    try {
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        setCurrentVideoIndex(i);

        try {
          const response = await fetch('/api/admin/videos/consistency-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: video.id,
              forceRecheck: false,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            
            // Create detailed error message
            let errorMessage = errorData.error || 'Failed to check consistency';
            if (errorData.details) {
              errorMessage = `${errorData.error}: ${errorData.details}`;
            }
            
            throw new Error(errorMessage);
          }

          const data = await response.json();
          setResults(prev => ({
            ...prev,
            [video.id]: data.data.result,
          }));
        } catch (err: any) {
          console.error(`Failed to check video ${video.id}:`, err);
          
          // Check if it's a rate limit error
          if (err.message?.includes('レート制限')) {
            showError(err.message);
            // Stop processing remaining videos on rate limit
            break;
          }
          
          showError(`動画 ${video.title || video.id} のチェックに失敗しました`);
        }
      }

      success('一貫性チェックが完了しました');
    } catch (err) {
      showError('一貫性チェック中にエラーが発生しました');
    } finally {
      setIsChecking(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return '優秀';
    if (score >= 70) return '良好';
    if (score >= 50) return '要改善';
    return '不良';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">人物一貫性チェック</h2>
              <p className="mt-1 text-sm text-gray-400">
                {videos.length}件の動画を分析します
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isChecking && Object.keys(results).length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-100 mb-2">
                一貫性チェックを開始
              </h3>
              <p className="text-gray-400 mb-6">
                選択した動画の登場人物の視覚的・音声的一貫性を分析します
              </p>
              <Button onClick={handleCheck} disabled={isChecking}>
                チェックを開始
              </Button>
            </div>
          )}

          {isChecking && (
            <div className="text-center py-12">
              <Spinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-100 mb-2">
                分析中... ({currentVideoIndex + 1}/{videos.length})
              </h3>
              <p className="text-gray-400">
                {videos[currentVideoIndex]?.title || videos[currentVideoIndex]?.id}
              </p>
              <div className="mt-4 max-w-xs mx-auto">
                <div className="bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentVideoIndex + 1) / videos.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {!isChecking && Object.keys(results).length > 0 && (
            <div className="space-y-6">
              {videos.map((video) => {
                const result = results[video.id];
                if (!result) return null;

                return (
                  <div key={video.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-100">
                        {video.title || `動画 ${video.id}`}
                      </h3>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">視覚的一貫性: </span>
                          <span className={`font-medium ${getScoreColor(result.summary.overallVisualScore)}`}>
                            {result.summary.overallVisualScore}点 ({getScoreLabel(result.summary.overallVisualScore)})
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">音声一貫性: </span>
                          <span className={`font-medium ${getScoreColor(result.summary.overallAudioScore)}`}>
                            {result.summary.overallAudioScore}点 ({getScoreLabel(result.summary.overallAudioScore)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Scenes breakdown */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left py-2 px-3 text-gray-400">シーン</th>
                            <th className="text-left py-2 px-3 text-gray-400">登場人物</th>
                            <th className="text-left py-2 px-3 text-gray-400">視覚スコア</th>
                            <th className="text-left py-2 px-3 text-gray-400">音声スコア</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.scenes.map((scene) => (
                            <tr key={scene.index} className="border-b border-gray-700/50">
                              <td className="py-2 px-3 text-gray-300">
                                シーン {scene.index}
                                {scene.timeRange && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({scene.timeRange.start}s - {scene.timeRange.end}s)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-gray-300">
                                {scene.characters.join(', ')}
                              </td>
                              <td className="py-2 px-3">
                                {Object.entries(scene.visualScore).map(([char, score]) => (
                                  <div key={char} className="text-xs">
                                    <span className="text-gray-400">{char}: </span>
                                    <span className={getScoreColor(score)}>{score}</span>
                                  </div>
                                ))}
                              </td>
                              <td className="py-2 px-3">
                                {Object.entries(scene.audioScore).map(([char, score]) => (
                                  <div key={char} className="text-xs">
                                    <span className="text-gray-400">{char}: </span>
                                    <span className={score !== null ? getScoreColor(score) : 'text-gray-600'}>
                                      {score !== null ? score : '-'}
                                    </span>
                                  </div>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Issues */}
                    {result.summary.issues && result.summary.issues.length > 0 && (
                      <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
                        <h4 className="text-sm font-medium text-red-400 mb-1">検出された問題:</h4>
                        <ul className="text-xs text-red-300 space-y-1">
                          {result.summary.issues.map((issue, i) => (
                            <li key={i}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800">
          <div className="flex justify-end gap-3">
            {!isChecking && Object.keys(results).length > 0 && (
              <Button
                variant="secondary"
                onClick={handleCheck}
              >
                再チェック
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isChecking}
            >
              閉じる
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}