'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import type { Step7Input, Step7Output, MulmoScript } from '@/types/workflow';

interface Step7ConfirmProps {
  workflowId: string;
  initialData?: {
    stepInput: Step7Input;
    stepOutput?: Step7Output;
  };
  onNext: () => void;
  onBack: () => void;
  onUpdate: (canProceed: boolean) => void;
}

// サムネイルプレビューコンポーネント
function ThumbnailPreview({ 
  thumbnails 
}: { 
  thumbnails: Array<{ sceneId: string; imageUrl: string }> 
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {thumbnails.map((thumb, index) => (
        <div key={thumb.sceneId} className="relative aspect-video bg-gray-700 rounded-lg overflow-hidden">
          {thumb.imageUrl ? (
            <img 
              src={thumb.imageUrl} 
              alt={`シーン ${index + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-500">画像生成前</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// 動画情報プレビューコンポーネント
function VideoInfoPreview({
  title,
  description,
  estimatedDuration,
  tags
}: {
  title: string;
  description: string;
  estimatedDuration: number;
  tags: string[];
}) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-gray-400 mb-4">{description}</p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">推定時間：</span>
            <span className="text-gray-300 ml-2">{formatDuration(estimatedDuration)}</span>
          </div>
          <div>
            <span className="text-gray-500">タグ：</span>
            <div className="inline-flex gap-2 ml-2">
              {tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Step7Confirm({
  workflowId,
  initialData,
  onNext,
  onBack,
  onUpdate,
}: Step7ConfirmProps) {
  const { error, success } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // フォームデータ
  const [formData, setFormData] = useState({
    title: initialData?.stepOutput?.userInput?.title || 
           initialData?.stepInput?.title || 
           '',
    description: initialData?.stepOutput?.userInput?.description || 
                 initialData?.stepInput?.description || 
                 '',
    tags: initialData?.stepOutput?.userInput?.tags || 
          ['シェイクスピア', 'AI生成', '動画'],
    confirmed: initialData?.stepOutput?.userInput?.confirmed || false,
  });

  // タイトルが入力されているかチェック
  useEffect(() => {
    onUpdate(formData.title.trim().length > 0);
  }, [formData.title, onUpdate]);

  // タグの追加
  const handleAddTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag]
      });
    }
  };

  // タグの削除
  const handleRemoveTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };

  // 保存処理
  const handleSave = async () => {
    if (!user || !formData.title.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/workflow/${workflowId}/step/7`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
        body: JSON.stringify({
          data: {
            title: formData.title,
            description: formData.description,
            tags: formData.tags,
            confirmed: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      // 動画生成を開始
      await generateVideo();
      
    } catch (err) {
      console.error('Failed to save step 7:', err);
      error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 動画生成
  const generateVideo = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/workflow/${workflowId}/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate video');
      }

      const result = await response.json();
      
      success('動画生成を開始しました！');
      
      // 動画管理画面へ遷移
      if (result.videoId) {
        router.push(`/videos/${result.videoId}`);
      } else {
        router.push('/videos');
      }
      
    } catch (err) {
      console.error('Failed to generate video:', err);
      error('動画生成の開始に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const thumbnails = initialData?.stepInput?.thumbnails || [];
  const estimatedDuration = initialData?.stepInput?.estimatedDuration || 60;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">最終確認</h2>
        <p className="text-gray-400">
          動画の内容を確認し、生成を開始してください
        </p>
      </div>

      {/* サムネイルプレビュー */}
      <div>
        <h3 className="text-lg font-semibold mb-4">シーンプレビュー</h3>
        <ThumbnailPreview thumbnails={thumbnails} />
      </div>

      {/* 動画情報編集 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">動画情報</h3>
          
          {/* タイトル */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="動画のタイトルを入力"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading || isGenerating}
            />
          </div>

          {/* 説明 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="動画の説明を入力（任意）"
              rows={3}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              disabled={isLoading || isGenerating}
            />
          </div>

          {/* タグ */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              タグ
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(index)}
                    className="hover:text-red-300"
                    disabled={isLoading || isGenerating}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="タグを追加（Enterで確定）"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading || isGenerating}
            />
          </div>
        </CardContent>
      </Card>

      {/* 動画情報プレビュー */}
      <VideoInfoPreview
        title={formData.title}
        description={formData.description}
        estimatedDuration={estimatedDuration}
        tags={formData.tags}
      />

      {/* 注意事項 */}
      <Card className="bg-yellow-900/20 border-yellow-600/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-yellow-200">
              <p className="font-medium mb-1">動画生成について</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-300">
                <li>生成には5〜10分程度かかります</li>
                <li>生成中は他の操作が可能です</li>
                <li>完了後、メールで通知されます（設定による）</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          disabled={isLoading || isGenerating}
          className="px-6 py-3 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all"
        >
          ← 戻る
        </button>
        <button
          onClick={handleSave}
          disabled={!formData.title.trim() || isLoading || isGenerating}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all
            ${formData.title.trim() && !isLoading && !isGenerating
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isGenerating ? '生成中...' : isLoading ? '保存中...' : '動画を生成する'}
        </button>
      </div>
    </div>
  );
}