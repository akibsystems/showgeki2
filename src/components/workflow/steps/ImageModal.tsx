'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => void;
  characterName: string;
  currentUrl?: string;
}

export default function ImageModal({
  isOpen,
  onClose,
  onSave,
  characterName,
  currentUrl,
}: ImageModalProps) {
  const { error } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentUrl || '');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);

  useEffect(() => {
    console.log('[ImageModal] Current URL changed:', currentUrl);
    setImageUrl(currentUrl || '');
    setPreviewUrl(currentUrl || null);
  }, [currentUrl]);

  useEffect(() => {
    console.log('[ImageModal] Preview URL changed:', previewUrl);
  }, [previewUrl]);

  // ファイル選択時の処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      error('ファイルサイズは5MB以下にしてください');
      return;
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      error('JPEG、PNG、WebP、GIF形式のファイルのみアップロード可能です');
      return;
    }

    setUploadedFile(file);
    
    // プレビュー用のURLを作成
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      console.log('[ImageModal] File read as data URL:', dataUrl ? 'Data URL created' : 'Failed to create data URL');
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // 保存処理
  const handleSave = async () => {
    if (!user) {
      error('認証が必要です');
      return;
    }

    setIsLoading(true);
    try {
      if (uploadedFile) {
        // ファイルアップロードの場合
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('characterName', characterName);

        const response = await fetch('/api/upload/face-reference', {
          method: 'POST',
          headers: {
            'X-User-UID': user.id,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Upload failed:', response.status, errorData);
          throw new Error(errorData.error || '画像のアップロードに失敗しました');
        }

        const data = await response.json();
        onSave(data.data.url);
      } else if (imageUrl) {
        // URL入力の場合
        onSave(imageUrl);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save image:', err);
      error(err instanceof Error ? err.message : '画像の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-900 border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {characterName}の顔参照画像
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* ファイルアップロード */}
            <div>
              <label className="block text-sm font-medium mb-2">
                画像をアップロード
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-400 mt-2">
                JPEG、PNG、WebP、GIF形式（最大5MB）<br/>
                ※ファイル名に日本語が含まれる場合は自動的に英数字に変換されます
              </p>
            </div>

            {/* URL入力 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                または画像URLを入力
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setUploadedFile(null);
                  setPreviewUrl(e.target.value);
                }}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
            </div>

            {/* プレビュー */}
            {previewUrl && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  プレビュー
                </label>
                <div className="relative bg-gray-800 rounded-lg overflow-hidden p-4" style={{ maxHeight: '400px' }}>
                  <img
                    src={previewUrl}
                    alt="プレビュー"
                    className="w-full h-auto max-h-full object-contain rounded mx-auto block"
                    style={{ maxHeight: '350px' }}
                    onError={() => {
                      error('画像の読み込みに失敗しました');
                      setPreviewUrl(null);
                    }}
                  />
                </div>
              </div>
            )}

            {/* 使用上の注意 */}
            <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-yellow-200">
                  <p className="font-medium mb-1">顔参照画像について</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-300">
                    <li>顔がはっきりと見える画像を選択してください</li>
                    <li>著作権に配慮し、使用許可のある画像のみご利用ください</li>
                    <li>画像は各シーンの生成時にAIが参照します</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || (!uploadedFile && !imageUrl)}
              className="px-4 py-2 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}