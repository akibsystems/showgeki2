'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Spinner, Card, CardContent } from '@/components/ui';
import { APIErrorMessage } from '@/components/ui/error-message';
import { VideoWithRelations } from '@/hooks/useAdminVideos';
import { JsonSyntaxHighlighter } from '@/components/admin/JsonSyntaxHighlighter';
import { VideoPlayer } from '@/components/video';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { ConsistencyCheckResult } from '@/lib/gemini-client';
import { useToast } from '@/contexts';

// ================================================================
// Types
// ================================================================

interface VideoDetail {
  video: VideoWithRelations & {
    storyboard: {
      id: string;
      story_data: any;
      mulmoscript: any;
      created_at: string;
    } | null;
  };
}

// ================================================================
// Helper Components
// ================================================================

function JsonDataCard({ 
  data, 
  title, 
  onCopyRaw, 
  onExport 
}: { 
  data: any; 
  title: string;
  onCopyRaw: () => void;
  onExport: () => void;
}) {
  const jsonString = JSON.stringify(data, null, 2);

  // Special rendering for text fields
  const textFields = ['originalText', 'storyText', 'characters', 'dramaticTurningPoint', 
                      'futureVision', 'learnings', 'text', 'description', 'content'];
  
  const renderContent = () => {
    if (data && typeof data === 'object') {
      const hasTextFields = textFields.some(field => data[field] && typeof data[field] === 'string');
      
      if (hasTextFields && title === "Story Data") {
        const textFieldsInData = textFields.filter(field => data[field]);
        const otherFields = Object.keys(data).filter(key => !textFields.includes(key));
        
        return (
          <div className="space-y-6">
            {/* Text Fields */}
            {textFieldsInData.map(field => (
              <div key={field}>
                <h4 className="text-sm font-medium text-purple-400 mb-2">
                  {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </h4>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <pre className="text-emerald-300 whitespace-pre-wrap font-mono text-sm">
                    {/* Convert \n string to actual newlines */}
                    {typeof data[field] === 'string' 
                      ? data[field].replace(/\\n/g, '\n')
                      : data[field]
                    }
                  </pre>
                </div>
              </div>
            ))}
            
            {/* Other Fields */}
            {otherFields.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-2">Other Fields</h4>
                <JsonSyntaxHighlighter json={JSON.stringify(
                  otherFields.reduce((obj, key) => {
                    obj[key] = data[key];
                    return obj;
                  }, {} as any),
                  null, 2
                )} />
              </div>
            )}
          </div>
        );
      }
    }
    
    return <JsonSyntaxHighlighter json={jsonString} />;
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCopyRaw}
          >
            コピー
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onExport}
          >
            JSONエクスポート
          </Button>
        </div>
      </div>
      <CardContent className="p-6 overflow-auto bg-gray-950/50 max-h-[70vh]">
        {renderContent()}
      </CardContent>
    </Card>
  );
}

// ================================================================
// Main Component
// ================================================================

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;
  const { success, error: showError } = useToast();
  
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
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

  useEffect(() => {
    if (videoId) {
      fetchVideoDetail();
    }
  }, [videoId]);

  // Fetch consistency check results when video is loaded
  useEffect(() => {
    if (detail?.video && detail.video.status === 'completed') {
      fetchConsistencyCheck();
    }
  }, [detail?.video?.id, detail?.video?.status]);

  const fetchVideoDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/videos/${videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video details');
      }
      const data = await response.json();
      console.log('[VideoDetailPage] Fetched video data:', data);
      console.log('[VideoDetailPage] Video URL:', data.video?.url);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchConsistencyCheck = async () => {
    if (!detail?.video) return;

    setConsistencyCheck(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/admin/videos/consistency-check?videoId=${detail.video.id}`);
      
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

  const runConsistencyCheck = async () => {
    if (!detail?.video) return;

    setConsistencyCheck(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/admin/videos/consistency-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: detail.video.id,
          forceRecheck: true,
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
      setConsistencyCheck({
        result: data.data.result,
        loading: false,
        error: null,
        cached: false,
        checkedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Failed to check consistency:', err);
      
      // Check if it's a rate limit error
      if (err.message?.includes('レート制限')) {
        showError(err.message);
      } else {
        showError(`一貫性チェックに失敗しました: ${err.message}`);
      }
      
      setConsistencyCheck(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <APIErrorMessage 
          error={error} 
          onRetry={fetchVideoDetail} 
        />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>動画が見つかりません</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              // Use browser back if we came from the videos page
              if (document.referrer.includes('/admin/videos')) {
                router.back();
              } else {
                // Fallback to direct link
                router.push('/admin/videos');
              }
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </Button>
        </div>
        
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-100">
          {detail.video.title || detail.video.story?.title || '無題'}
        </h1>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-sm lg:text-base text-gray-400">
            動画ID: {detail.video.id}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(detail.video.id, 'video_id')}
            className="text-gray-400 hover:text-gray-300 p-1 h-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Video Preview and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column: Video Preview and Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">動画プレビュー</h3>
              {detail.video.url ? (
                <div className="bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
                  <VideoPlayer
                    src={detail.video.url}
                    poster=""
                    title={detail.video.title || detail.video.story?.title || '無題'}
                  />
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg flex items-center justify-center" style={{ minHeight: '300px' }}>
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400">動画URLが設定されていません</p>
                    <p className="text-xs text-gray-500 mt-2">Status: {detail.video.status}</p>
                  </div>
                </div>
              )}
                
                {/* Video Actions */}
                {detail.video.url && (
                  <div className="flex gap-3 mt-4">
                    <a
                      href={detail.video.url}
                      download
                      className="inline-flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      ダウンロード
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

          {/* Video Info */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">動画情報</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400">ストーリーID</label>
                  <p className="text-gray-100 font-mono text-sm mt-1">{detail.video.story_id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">ステータス</label>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      detail.video.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      detail.video.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                      detail.video.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {detail.video.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">作成日時</label>
                  <p className="text-gray-100 text-sm mt-1">
                    {format(new Date(detail.video.created_at), 'yyyy年M月d日 HH:mm', { locale: ja })}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">動画時間</label>
                  <p className="text-gray-100 text-sm mt-1">
                    {formatDuration(detail.video.duration_sec)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">ファイルサイズ</label>
                  <p className="text-gray-100 text-sm mt-1">
                    {formatFileSize(detail.video.size_mb)}
                  </p>
                </div>
                {detail.video.resolution && (
                  <div>
                    <label className="text-sm text-gray-400">解像度</label>
                    <p className="text-gray-100 text-sm mt-1">{detail.video.resolution}</p>
                  </div>
                )}
                {detail.video.url && (
                  <div className="col-span-2 md:col-span-3">
                    <label className="text-sm text-gray-400">動画URL</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        readOnly
                        value={detail.video.url}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(detail.video.url || '', 'video_url')}
                      >
                        {copiedField === 'video_url' ? 'コピー済み' : 'コピー'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Consistency Check */}
        {detail.video.status === 'completed' && (
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-800 lg:sticky lg:top-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-100 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    人物一貫性チェック
                  </h3>
                  
                  {!consistencyCheck.loading && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={runConsistencyCheck}
                      disabled={consistencyCheck.loading}
                    >
                      {consistencyCheck.result ? 'チェック再実行' : 'チェック実行'}
                    </Button>
                  )}
                </div>

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
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs lg:text-sm text-gray-400 mb-1">視覚的一貫性</p>
                        <p className={`text-xl lg:text-2xl font-bold ${getScoreColor(consistencyCheck.result.summary.overallVisualScore)}`}>
                          {consistencyCheck.result.summary.overallVisualScore}点
                        </p>
                        <p className={`text-xs ${getScoreColor(consistencyCheck.result.summary.overallVisualScore)}`}>
                          {getScoreLabel(consistencyCheck.result.summary.overallVisualScore)}
                        </p>
                        {consistencyCheck.result.summary.visualScoreReason && (
                          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                            {consistencyCheck.result.summary.visualScoreReason}
                          </p>
                        )}
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs lg:text-sm text-gray-400 mb-1">音声一貫性</p>
                        <p className={`text-xl lg:text-2xl font-bold ${getScoreColor(consistencyCheck.result.summary.overallAudioScore)}`}>
                          {consistencyCheck.result.summary.overallAudioScore}点
                        </p>
                        <p className={`text-xs ${getScoreColor(consistencyCheck.result.summary.overallAudioScore)}`}>
                          {getScoreLabel(consistencyCheck.result.summary.overallAudioScore)}
                        </p>
                        {consistencyCheck.result.summary.audioScoreReason && (
                          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                            {consistencyCheck.result.summary.audioScoreReason}
                          </p>
                        )}
                      </div>
                      {consistencyCheck.result.summary.overallScriptAdherence !== undefined && (
                        <div className="bg-gray-800 rounded-lg p-3">
                          <p className="text-xs lg:text-sm text-gray-400 mb-1">台本忠実度</p>
                          <p className={`text-xl lg:text-2xl font-bold ${getScoreColor(consistencyCheck.result.summary.overallScriptAdherence)}`}>
                            {consistencyCheck.result.summary.overallScriptAdherence}点
                          </p>
                          <p className={`text-xs ${getScoreColor(consistencyCheck.result.summary.overallScriptAdherence)}`}>
                            {getScoreLabel(consistencyCheck.result.summary.overallScriptAdherence)}
                          </p>
                          {consistencyCheck.result.summary.scriptAdherenceReason && (
                            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                              {consistencyCheck.result.summary.scriptAdherenceReason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="text-xs text-gray-400">
                      <p>
                        検出キャラクター: {consistencyCheck.result.summary.charactersDetected.join(', ')}
                      </p>
                      {consistencyCheck.result.summary.charactersExpected && (
                        <p>
                          期待キャラクター: {consistencyCheck.result.summary.charactersExpected.join(', ')}
                        </p>
                      )}
                      <p>
                        総シーン数: {consistencyCheck.result.summary.totalScenes}
                      </p>
                      {consistencyCheck.checkedAt && (
                        <p>
                          チェック日時: {format(new Date(consistencyCheck.checkedAt), 'yyyy年M月d日 HH:mm', { locale: ja })}
                        </p>
                      )}
                      <p className="text-purple-400 mt-1">
                        ✨ MulmoScript強化分析
                      </p>
                    </div>

                    {/* Issues */}
                    {consistencyCheck.result.summary.issues && consistencyCheck.result.summary.issues.length > 0 && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-red-400 mb-3">検出された問題:</h5>
                        <div className="space-y-2">
                          {consistencyCheck.result.summary.issues.map((issue, i) => {
                            const severityColors = {
                              high: 'text-red-300 bg-red-900/30',
                              medium: 'text-orange-300 bg-orange-900/30',
                              low: 'text-yellow-300 bg-yellow-900/30'
                            };
                            const severityLabels = {
                              high: '重要',
                              medium: '中程度',
                              low: '軽微'
                            };
                            const categoryColors = {
                              visual: 'text-blue-300 bg-blue-900/30',
                              audio: 'text-green-300 bg-green-900/30',
                              script: 'text-purple-300 bg-purple-900/30',
                              timing: 'text-yellow-300 bg-yellow-900/30'
                            };
                            const categoryLabels = {
                              visual: '視覚',
                              audio: '音声',
                              script: '台本',
                              timing: 'タイミング'
                            };
                            
                            return (
                              <div key={i} className="bg-gray-800/50 rounded p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-xs px-2 py-1 rounded ${severityColors[issue.severity || 'medium']}`}>
                                    {severityLabels[issue.severity || 'medium']}
                                  </span>
                                  {issue.category && (
                                    <span className={`text-xs px-2 py-1 rounded ${categoryColors[issue.category]}`}>
                                      {categoryLabels[issue.category]}
                                    </span>
                                  )}
                                  <span className="text-xs text-red-300 font-medium">
                                    {typeof issue === 'string' ? issue : issue.description}
                                  </span>
                                </div>
                                {typeof issue === 'object' && issue.reason && (
                                  <p className="text-xs text-gray-400 leading-relaxed">
                                    {issue.reason}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Scene Details */}
                    <div className="border border-gray-700 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-gray-800 text-sm text-gray-300 font-medium">
                        シーン詳細 (MulmoScript連携)
                      </div>
                      <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                        {consistencyCheck.result.scenes.map((scene) => (
                          <div key={scene.index} className="bg-gray-800/50 rounded-lg p-3 text-xs">
                            <div className="font-medium text-gray-200 mb-2">
                              シーン {scene.index} {scene.timeRange && `(${scene.timeRange.start}s - ${scene.timeRange.end}s)`}
                              {scene.beatIndex && (
                                <span className="ml-2 text-purple-400">Beat {scene.beatIndex}</span>
                              )}
                            </div>
                            
                            {/* Expected vs Actual */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <div className="bg-gray-900/30 rounded p-2">
                                <div className="text-gray-400 text-xs font-medium mb-1">期待値</div>
                                {scene.expectedSpeaker && (
                                  <div className="text-gray-300">話者: {scene.expectedSpeaker}</div>
                                )}
                                {scene.expectedVoice && (
                                  <div className="text-gray-300">音声: {scene.expectedVoice}</div>
                                )}
                                {scene.expectedText && (
                                  <div className="text-gray-300 mt-1">台詞: "{scene.expectedText}"</div>
                                )}
                                {scene.expectedImageDescription && (
                                  <div className="text-gray-300 mt-1">画像: {scene.expectedImageDescription}</div>
                                )}
                              </div>
                              
                              <div className="bg-gray-900/30 rounded p-2">
                                <div className="text-gray-400 text-xs font-medium mb-1">実際</div>
                                <div className="text-gray-300">
                                  登場人物: {scene.characters.join(', ')}
                                </div>
                                {scene.scriptAdherence !== undefined && (
                                  <div className="mt-1">
                                    <span className="text-gray-400">台本忠実度: </span>
                                    <span className={`${getScoreColor(scene.scriptAdherence)}`}>
                                      {scene.scriptAdherence}点
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Scores */}
                            <div className="grid grid-cols-1 gap-2 text-xs">
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
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Story Data and MulmoScript */}
      {detail.video.storyboard ? (
        <div className="space-y-6">
          {/* Story Data */}
          <JsonDataCard
            data={detail.video.storyboard.story_data}
            title="Story Data"
            onCopyRaw={() => copyToClipboard(
              JSON.stringify(detail.video.storyboard!.story_data, null, 2),
              'story_data'
            )}
            onExport={() => downloadJson(
              detail.video.storyboard!.story_data,
              `story_data_${detail.video.id}.json`
            )}
          />
          
          {/* MulmoScript */}
          <JsonDataCard
            data={detail.video.storyboard.mulmoscript}
            title="MulmoScript"
            onCopyRaw={() => copyToClipboard(
              JSON.stringify(detail.video.storyboard!.mulmoscript, null, 2),
              'mulmoscript'
            )}
            onExport={() => downloadJson(
              detail.video.storyboard!.mulmoscript,
              `mulmoscript_${detail.video.id}.json`
            )}
          />
        </div>
      ) : (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-12 text-center text-gray-400">
            <p>ストーリーボードデータが見つかりません</p>
          </CardContent>
        </Card>
      )}

      {/* Copy notification */}
      {copiedField && (
        <div className="fixed bottom-4 right-4 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg border border-green-500/30">
          コピーしました
        </div>
      )}
    </div>
  );
}