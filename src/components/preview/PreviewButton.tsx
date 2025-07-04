'use client'

import React from 'react'
import { PreviewStatus } from '@/types/preview'
import { translatePreviewStatus } from '@/lib/preview-utils'

interface PreviewButtonProps {
  status: PreviewStatus
  isLoading: boolean
  onGenerate: () => void
  onDelete?: () => void
  disabled?: boolean
}

export default function PreviewButton({
  status,
  isLoading,
  onGenerate,
  onDelete,
  disabled = false
}: PreviewButtonProps) {
  // ボタンの表示内容とアクションを決定
  const getButtonConfig = () => {
    if (isLoading) {
      return {
        text: '処理中...',
        onClick: undefined,
        className: 'bg-gray-400 cursor-not-allowed',
        icon: (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      }
    }

    switch (status) {
      case 'not_started':
        return {
          text: '画像プレビュー生成',
          onClick: onGenerate,
          className: 'bg-blue-600 hover:bg-blue-700',
          icon: (
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )
        }
      
      case 'pending':
      case 'processing':
        return {
          text: `${translatePreviewStatus(status)}...`,
          onClick: undefined,
          className: 'bg-orange-500 cursor-not-allowed',
          icon: (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )
        }
      
      case 'completed':
        return {
          text: '再生成',
          onClick: onGenerate,
          className: 'bg-green-600 hover:bg-green-700',
          icon: (
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
        }
      
      case 'failed':
        return {
          text: '再試行',
          onClick: onGenerate,
          className: 'bg-red-600 hover:bg-red-700',
          icon: (
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
        }
      
      default:
        return {
          text: '画像プレビュー',
          onClick: onGenerate,
          className: 'bg-blue-600 hover:bg-blue-700',
          icon: null
        }
    }
  }

  const config = getButtonConfig()

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={config.onClick}
        disabled={disabled || !config.onClick}
        className={`
          inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          ${config.className}
        `}
      >
        {config.icon}
        {config.text}
      </button>
      
      {status === 'completed' && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled || isLoading}
          className="
            inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white
            hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          "
          title="プレビューを削除"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}