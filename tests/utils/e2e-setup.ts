// E2E テスト用セットアップ
import { beforeAll } from 'vitest'
import { config } from 'dotenv'
import path from 'path'

// 環境変数を読み込み
beforeAll(() => {
  // .env.local ファイルから環境変数を読み込み
  const envPath = path.resolve(process.cwd(), '.env.local')
  config({ path: envPath })
  
  console.log('Environment loaded from:', envPath)
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)

  // 必要な環境変数をチェック
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'OPENAI_API_KEY'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }

  console.log('🔧 E2E test environment configured')
  console.log('📡 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('🔐 OpenAI API configured:', !!process.env.OPENAI_API_KEY)
})

// E2Eテスト用のヘルパー関数
export const waitForCondition = async (
  condition: () => Promise<boolean>,
  timeout: number = 30000,
  interval: number = 1000
): Promise<boolean> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  return false
}

export const createTestUser = (suffix: string = '') => {
  const randomId = Math.random().toString(36).substring(2, 8) // ランダムな6文字
  return {
    email: `test.${suffix}.${randomId}@example.com`,
    password: 'test-password-123'
  }
}

export const createTestStory = (title?: string) => ({
  storyText: '昔々、勇敢な騎士がドラゴンに挑む物語。彼は村を救うため、険しい山を越えて竜の住む洞窟に向かった。最終的に、彼は知恵と勇気でドラゴンを説得し、平和を取り戻した。',
  title: title || `E2Eテスト: ${new Date().toISOString()}`,
  style: 'anime' as const,
  duration: 'short' as const
})