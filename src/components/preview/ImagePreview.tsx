'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { PreviewData, PreviewStatus } from '@/types/preview'
import { formatElapsedTime, translatePreviewStatus } from '@/lib/preview-utils'

interface ImagePreviewProps {
  status: PreviewStatus
  previewData: PreviewData | null
  error: string | null
  className?: string
}

export default function ImagePreview({
  status,
  previewData,
  error,
  className = ''
}: ImagePreviewProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<number>>(new Set())

  // 画像読み込みエラーハンドリング
  const handleImageError = (beatIndex: number) => {
    setImageLoadErrors(prev => new Set(prev).add(beatIndex))
  }

  // ステータスに応じた表示
  if (status === 'not_started') {
    return (
      <div className={`bg-gray-50 rounded-lg p-8 text-center ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="mt-2 text-sm text-gray-500">プレビューを生成すると、ここに画像が表示されます</p>
      </div>
    )
  }

  if (status === 'pending' || status === 'processing') {
    return (
      <div className={`bg-gray-50 rounded-lg p-8 text-center ${className}`}>
        <div className="inline-flex items-center">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-3 text-lg font-medium text-gray-900">
            画像を{translatePreviewStatus(status)}...
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          AIが各シーンの画像を生成しています。しばらくお待ちください。
        </p>
      </div>
    )
  }

  if (status === 'failed' || error) {
    return (
      <div className={`bg-red-50 rounded-lg p-8 text-center ${className}`}>
        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-sm text-red-800">
          {error || 'プレビュー生成中にエラーが発生しました'}
        </p>
      </div>
    )
  }

  if (status === 'completed' && previewData) {
    return (
      <div className={`${className}`}>
        {/* ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">生成された画像</h3>
          <p className="text-sm text-gray-500">
            {formatElapsedTime(previewData.generatedAt)}に生成
          </p>
        </div>

        {/* 画像グリッド */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {previewData.images.map((image, index) => (
            <div
              key={image.beatIndex}
              className="relative group cursor-pointer"
              onClick={() => setSelectedImage(index)}
            >
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
                {imageLoadErrors.has(image.beatIndex) ? (
                  <div className="flex items-center justify-center h-full bg-gray-200">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <Image
                      src={image.url}
                      alt={`Scene ${image.beatIndex + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      onError={() => handleImageError(image.beatIndex)}
                    />
                  </div>
                )}
                
                {/* オーバーレイ */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* キャプション */}
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-900">
                  シーン {image.beatIndex + 1}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2" title={image.prompt}>
                  {image.prompt}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 画像拡大モーダル */}
        {selectedImage !== null && (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <Image
                src={previewData.images[selectedImage].url}
                alt={`Scene ${previewData.images[selectedImage].beatIndex + 1}`}
                width={1920}
                height={1080}
                className="max-w-full max-h-[90vh] object-contain"
              />
              
              {/* 閉じるボタン */}
              <button
                className="absolute top-4 right-4 text-white hover:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedImage(null)
                }}
              >
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* ナビゲーション */}
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-4">
                {selectedImage > 0 && (
                  <button
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedImage(selectedImage - 1)
                    }}
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                
                <span className="text-white self-center">
                  {selectedImage + 1} / {previewData.images.length}
                </span>
                
                {selectedImage < previewData.images.length - 1 && (
                  <button
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedImage(selectedImage + 1)
                    }}
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}