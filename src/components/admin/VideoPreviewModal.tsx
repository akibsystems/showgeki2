'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Spinner } from '@/components/ui';
import { VideoPlayer } from '@/components/video';
import { VideoWithRelations } from '@/hooks/useAdminVideos';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { ConsistencyCheckResult } from '@/lib/gemini-client';

// ================================================================
// Types
// ================================================================

interface VideoPreviewModalProps {
  video: VideoWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

// ================================================================
// Component
// ================================================================

export function VideoPreviewModal({ video, isOpen, onClose }: VideoPreviewModalProps) {
  const [consistencyCheck, setConsistencyCheck] = useState<{
    result: ConsistencyCheckResult | null;
    loading: boolean;
    error: string | null;
    cached: boolean;
    checkedAt: string | null;
  }>({
    result: null,
    loading: false,
    error: null,
    cached: false,
    checkedAt: null,
  });

  // Fetch consistency check results when modal opens
  useEffect(() => {
    if (isOpen && video) {
      fetchConsistencyCheck();
    }
  }, [isOpen, video?.id]);

  const fetchConsistencyCheck = async () => {
    if (!video) return;

    setConsistencyCheck(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/admin/videos/consistency-check?videoId=${video.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch consistency check');
      }

      const data = await response.json();
      
      if (data.data?.checks && data.data.checks.length > 0) {
        const latestCheck = data.data.checks[0];
        setConsistencyCheck({
          result: latestCheck.result,
          loading: false,
          error: null,
          cached: true,
          checkedAt: latestCheck.created_at,
        });
      } else {
        setConsistencyCheck({
          result: null,
          loading: false,
          error: null,
          cached: false,
          checkedAt: null,
        });
      }
    } catch (error) {
      setConsistencyCheck({
        result: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load consistency check',
        cached: false,
        checkedAt: null,
      });
    }
  };

  if (!video) return null;

  const formatFileSize = (mb?: number) => {
    if (!mb) return '-';
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="動画プレビュー"
      size="xl"
    >
      <div className="space-y-6">
        {/* Video Player */}
        {video.url && (
          <div className="bg-black rounded-lg overflow-hidden">
            <VideoPlayer
              src={video.url}
              poster=""
              title={video.story?.title || '無題'}
            />
          </div>
        )}

        {/* Video Information */}
        <div className="bg-gray-900 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-100 mb-2">
              {video.story?.title || '無題'}
            </h3>
            <p className="text-sm text-gray-400">
              ID: {video.id}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">ユーザー</p>
              <p className="text-gray-100 mt-1">
                {video.profile?.display_name || video.profile?.email || 'Unknown'}
              </p>
            </div>
            
            <div>
              <p className="text-gray-400">作成日時</p>
              <p className="text-gray-100 mt-1">
                {format(new Date(video.created_at), 'yyyy年M月d日 HH:mm', { locale: ja })}
              </p>
            </div>

            <div>
              <p className="text-gray-400">動画時間</p>
              <p className="text-gray-100 mt-1">
                {formatDuration(video.duration_sec)}
              </p>
            </div>

            <div>
              <p className="text-gray-400">ファイルサイズ</p>
              <p className="text-gray-100 mt-1">
                {formatFileSize(video.size_mb)}
              </p>
            </div>

            {video.resolution && (
              <div>
                <p className="text-gray-400">解像度</p>
                <p className="text-gray-100 mt-1">
                  {video.resolution}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-800">
            <a
              href={video.url}
              download
              className="inline-flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ダウンロード
            </a>

            <a
              href={`/stories/${video.story_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              ストーリーを見る
            </a>
          </div>
        </div>

        {/* Consistency Check Results */}
        {video.status === 'completed' && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              人物一貫性チェック
            </h4>

            {consistencyCheck.loading && (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
                <span className="ml-3 text-gray-400">読み込み中...</span>
              </div>
            )}

            {consistencyCheck.error && (
              <div className="text-red-400 text-sm">
                エラー: {consistencyCheck.error}
              </div>
            )}

            {!consistencyCheck.loading && !consistencyCheck.error && !consistencyCheck.result && (
              <div className="text-gray-400 text-sm">
                一貫性チェックは実施されていません。
              </div>
            )}

            {consistencyCheck.result && (
              <div className="space-y-4">
                {/* Overall Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">視覚的一貫性</p>
                    <p className={`text-2xl font-bold ${getScoreColor(consistencyCheck.result.summary.overallVisualScore)}`}>
                      {consistencyCheck.result.summary.overallVisualScore}点
                    </p>
                    <p className={`text-xs ${getScoreColor(consistencyCheck.result.summary.overallVisualScore)}`}>
                      {getScoreLabel(consistencyCheck.result.summary.overallVisualScore)}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">音声一貫性</p>
                    <p className={`text-2xl font-bold ${getScoreColor(consistencyCheck.result.summary.overallAudioScore)}`}>
                      {consistencyCheck.result.summary.overallAudioScore}点
                    </p>
                    <p className={`text-xs ${getScoreColor(consistencyCheck.result.summary.overallAudioScore)}`}>
                      {getScoreLabel(consistencyCheck.result.summary.overallAudioScore)}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-xs text-gray-400">
                  <p>
                    検出キャラクター: {consistencyCheck.result.summary.charactersDetected.join(', ')}
                  </p>
                  <p>
                    総シーン数: {consistencyCheck.result.summary.totalScenes}
                  </p>
                  {consistencyCheck.checkedAt && (
                    <p>
                      チェック日時: {format(new Date(consistencyCheck.checkedAt), 'yyyy年M月d日 HH:mm', { locale: ja })}
                    </p>
                  )}
                </div>

                {/* Issues */}
                {consistencyCheck.result.summary.issues && consistencyCheck.result.summary.issues.length > 0 && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-red-400 mb-2">検出された問題:</h5>
                    <ul className="text-xs text-red-300 space-y-1">
                      {consistencyCheck.result.summary.issues.map((issue, i) => (
                        <li key={i}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Scene Details (Collapsible) */}
                <details className="border border-gray-700 rounded-lg overflow-hidden">
                  <summary className="px-4 py-2 bg-gray-800 hover:bg-gray-700 cursor-pointer text-sm text-gray-300">
                    シーン詳細を表示
                  </summary>
                  <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                    {consistencyCheck.result.scenes.map((scene) => (
                      <div key={scene.index} className="bg-gray-800/50 rounded-lg p-3 text-xs">
                        <div className="font-medium text-gray-200 mb-2">
                          シーン {scene.index} ({scene.timeRange.start}s - {scene.timeRange.end}s)
                        </div>
                        <div className="text-gray-400 mb-2">
                          登場人物: {scene.characters.join(', ')}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">視覚:</span>
                            {Object.entries(scene.visualScore).map(([char, score]) => (
                              <div key={char} className="ml-2">
                                <span className="text-gray-400">{char}:</span>
                                <span className={`ml-1 ${getScoreColor(score)}`}>{score}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <span className="text-gray-500">音声:</span>
                            {Object.entries(scene.audioScore).map(([char, score]) => (
                              <div key={char} className="ml-2">
                                <span className="text-gray-400">{char}:</span>
                                <span className={`ml-1 ${score !== null ? getScoreColor(score) : 'text-gray-600'}`}>
                                  {score !== null ? score : '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {scene.notes && (
                          <div className="mt-2 text-gray-500 italic">
                            {scene.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}