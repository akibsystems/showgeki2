'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Spinner, Card, CardContent } from '@/components/ui';
import { APIErrorMessage } from '@/components/ui/error-message';
import { VideoWithRelations } from '@/hooks/useAdminVideos';
import { JsonSyntaxHighlighter } from '@/components/admin/JsonSyntaxHighlighter';

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
      <CardContent className="p-6 overflow-auto bg-gray-950/50" style={{ maxHeight: '70vh' }}>
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
  
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (videoId) {
      fetchVideoDetail();
    }
  }, [videoId]);

  const fetchVideoDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/videos/${videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video details');
      }
      const data = await response.json();
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
          {detail.video.title || detail.video.story.title}
        </h1>
        <p className="mt-2 text-sm lg:text-base text-gray-400">
          動画ID: {detail.video.id}
        </p>
      </div>

      {/* Video Info */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  detail.video.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {detail.video.status}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-400">作成日時</label>
              <p className="text-gray-100 text-sm mt-1">
                {new Date(detail.video.created_at).toLocaleString('ja-JP')}
              </p>
            </div>
            {detail.video.duration && (
              <div>
                <label className="text-sm text-gray-400">動画時間</label>
                <p className="text-gray-100 text-sm mt-1">
                  {Math.floor(detail.video.duration / 60)}分{detail.video.duration % 60}秒
                </p>
              </div>
            )}
            {detail.video.resolution && (
              <div>
                <label className="text-sm text-gray-400">解像度</label>
                <p className="text-gray-100 text-sm mt-1">{detail.video.resolution}</p>
              </div>
            )}
            {detail.video.video_url && (
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-sm text-gray-400">動画URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={detail.video.video_url}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(detail.video.video_url!, 'video_url')}
                  >
                    {copiedField === 'video_url' ? 'コピー済み' : 'コピー'}
                  </Button>
                  <a
                    href={detail.video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                    >
                      開く
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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