import { PreviewImage } from '@/types/preview'

/**
 * ビート番号から画像ファイル名を生成
 */
export function generateImageFileName(beatIndex: number): string {
  const paddedIndex = String(beatIndex + 1).padStart(3, '0')
  return `beat_${paddedIndex}.png`
}

/**
 * ストレージパスから画像URLを構築
 */
export function buildImageUrl(storagePath: string, fileName: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
  }
  
  // Supabase Storage の公開URLフォーマット
  return `${supabaseUrl}/storage/v1/object/public/${storagePath}/${fileName}`
}

/**
 * プレビュー画像データをビート番号順にソート
 */
export function sortPreviewImages(images: PreviewImage[]): PreviewImage[] {
  return [...images].sort((a, b) => a.beatIndex - b.beatIndex)
}

/**
 * プレビュー生成からの経過時間を取得（秒）
 */
export function getElapsedTime(generatedAt: string): number {
  const generated = new Date(generatedAt).getTime()
  const now = Date.now()
  return Math.floor((now - generated) / 1000)
}

/**
 * プレビュー生成からの経過時間を人間が読みやすい形式に変換
 */
export function formatElapsedTime(generatedAt: string): string {
  const seconds = getElapsedTime(generatedAt)
  
  if (seconds < 60) {
    return `${seconds}秒前`
  }
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}分前`
  }
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}時間前`
  }
  
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

/**
 * エラーメッセージを日本語に変換
 */
export function translateErrorMessage(error: string): string {
  const errorMap: Record<string, string> = {
    'Unauthorized': '認証が必要です',
    'Story not found': 'ストーリーが見つかりません',
    'Script not generated yet': 'スクリプトがまだ生成されていません',
    'Preview generation already in progress': 'プレビュー生成が既に進行中です',
    'Rate limit exceeded': 'リクエスト数の上限に達しました。しばらく待ってから再試行してください',
    'Failed to start preview generation': 'プレビュー生成の開始に失敗しました',
    'Failed to generate preview': 'プレビュー生成に失敗しました',
    'Failed to delete preview': 'プレビューの削除に失敗しました',
    'Internal server error': 'サーバーエラーが発生しました'
  }
  
  // 完全一致するエラーメッセージがあればそれを返す
  if (errorMap[error]) {
    return errorMap[error]
  }
  
  // 部分一致で検索
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.includes(key)) {
      return value
    }
  }
  
  // 一致するものがなければ元のエラーメッセージを返す
  return error
}

/**
 * プレビューステータスを日本語に変換
 */
export function translatePreviewStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'not_started': '未開始',
    'pending': '待機中',
    'processing': '生成中',
    'completed': '完了',
    'failed': '失敗'
  }
  
  return statusMap[status] || status
}