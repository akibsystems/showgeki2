import { useState, useCallback, useEffect, useRef } from 'react'
import { 
  PreviewStatus, 
  PreviewData, 
  UseImagePreviewState,
  PreviewGenerationResponse,
  PreviewStatusResponse,
  ApiErrorResponse
} from '@/types/preview'

interface UseWorkflowImagePreviewOptions {
  workflowId: string
  userUid: string
  onStatusChange?: (status: PreviewStatus) => void
  pollingInterval?: number
}

export function useWorkflowImagePreview({ 
  workflowId, 
  userUid,
  onStatusChange,
  pollingInterval = 2000 
}: UseWorkflowImagePreviewOptions) {
  const [state, setState] = useState<UseImagePreviewState>({
    status: 'not_started',
    isLoading: false,
    error: null,
    previewData: null,
    videoId: null
  })

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // ポーリングの停止
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // プレビューステータスの取得
  const fetchPreviewStatus = useCallback(async () => {
    if (!userUid || !workflowId) {
      return
    }
    
    try {
      const response = await fetch(`/api/workflow/${workflowId}/preview-images`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': userUid,
        },
      })

      if (!response.ok) {
        const error = await response.json() as ApiErrorResponse
        throw new Error(error.error || 'Failed to fetch preview status')
      }

      const data = await response.json() as PreviewStatusResponse
      
      if (!isMountedRef.current) return

      setState(prev => ({
        ...prev,
        status: data.status,
        previewData: data.previewData || null,
        videoId: data.videoId || null,
        error: data.error || null
      }))

      // ステータス変更のコールバック
      if (onStatusChange && data.status !== state.status) {
        onStatusChange(data.status)
      }

      // 完了または失敗したらポーリングを停止
      if (data.status === 'completed' || data.status === 'failed') {
        stopPolling()
        // 完了時にコンソールログを出力（デバッグ用）
        if (data.status === 'completed') {
          console.log('Preview generation completed:', data.previewData)
        }
      }

      return data
    } catch (error) {
      if (!isMountedRef.current) return
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({ ...prev, error: errorMessage }))
      stopPolling()
      throw error
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, userUid, stopPolling])

  // プレビュー生成の開始
  const generatePreview = useCallback(async () => {
    if (!userUid || !workflowId) {
      setState(prev => ({ 
        ...prev, 
        error: 'User not authenticated'
      }))
      return
    }
    
    // 既存のプレビューデータをクリア（再生成の場合）
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      previewData: null // プレビューデータをクリア
    }))

    try {
      const response = await fetch(`/api/workflow/${workflowId}/preview-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': userUid,
        },
      })

      if (!response.ok) {
        const error = await response.json() as ApiErrorResponse
        throw new Error(error.error || 'Failed to generate preview')
      }

      const data = await response.json() as PreviewGenerationResponse
      
      if (!isMountedRef.current) return

      setState(prev => ({
        ...prev,
        videoId: data.videoId,
        status: 'processing',
        isLoading: false
      }))

      // ポーリングを開始
      pollingRef.current = setInterval(() => {
        fetchPreviewStatus()
      }, pollingInterval)

    } catch (error) {
      if (!isMountedRef.current) return
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isLoading: false 
      }))
    }
  }, [workflowId, userUid, fetchPreviewStatus, pollingInterval])

  // プレビューの削除
  const deletePreview = useCallback(async () => {
    if (!state.videoId) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`/api/videos/${state.videoId}/preview`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json() as ApiErrorResponse
        throw new Error(error.error || 'Failed to delete preview')
      }

      if (!isMountedRef.current) return

      setState({
        status: 'not_started',
        isLoading: false,
        error: null,
        previewData: null,
        videoId: null
      })

      stopPolling()

    } catch (error) {
      if (!isMountedRef.current) return
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isLoading: false 
      }))
    }
  }, [state.videoId, stopPolling])

  // 初回マウント時にステータスを取得
  useEffect(() => {
    if (userUid && workflowId) {
      fetchPreviewStatus().catch(() => {
        // エラーは state.error に格納されるので、ここでは何もしない
      })
    }
  }, [userUid, workflowId]) // ユーザーIDとワークフローIDが設定されたら実行

  // クリーンアップ
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      stopPolling()
    }
  }, [stopPolling])

  return {
    ...state,
    generatePreview,
    refreshStatus: fetchPreviewStatus,
    deletePreview
  }
}