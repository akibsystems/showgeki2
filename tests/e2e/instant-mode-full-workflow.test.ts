import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createTestStory } from '../utils/e2e-setup'
import { config } from 'dotenv'
import path from 'path'

// 環境変数を最初に読み込み
config({ path: path.resolve(process.cwd(), '.env.local') })

// E2E Test: Instant Mode Full Workflow
// ログイン → ストーリー作成 → API実行 → 動画生成完了まで

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing environment variables:
    SUPABASE_URL: ${!!supabaseUrl}
    SUPABASE_ANON_KEY: ${!!supabaseAnonKey}`)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 環境別のベースURL
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// テスト用ユーザーとストーリー (環境変数から取得)
const TEST_USER = {
  email: process.env.TEST_USER || 'test@example.com',
  password: process.env.TEST_PASSWORD || 'test-password-123'
}
const TEST_STORY = createTestStory('E2Eテスト: 騎士とドラゴン')

describe('Instant Mode E2E Workflow', () => {
  let userSession: any
  let instantId: string
  let authToken: string

  // テスト開始前: ユーザー作成・ログイン
  beforeAll(async () => {
    // テストユーザーが存在しない場合は作成
    const { error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password
    })

    if (signUpError && !signUpError.message.includes('already registered')) {
      throw new Error(`Failed to create test user: ${signUpError.message}`)
    }

    // ログイン
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    })

    if (signInError) {
      throw new Error(`Failed to sign in: ${signInError.message}`)
    }

    userSession = signInData.session
    authToken = userSession.access_token

    console.log('✅ Test user authenticated:', userSession.user.id)
  }, 30000)

  // テスト終了後: クリーンアップ
  afterAll(async () => {
    if (userSession) {
      await supabase.auth.signOut()
    }
  })

  test('Complete instant mode workflow: story creation → video generation', async () => {
    // Step 1: ストーリー作成API呼び出し
    const createResponse = await fetch(`${BASE_URL}/api/instant/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-User-UID': userSession.user.id
      },
      body: JSON.stringify(TEST_STORY)
    })

    expect(createResponse.status).toBe(200)
    const createResult = await createResponse.json()
    expect(createResult.instantId).toBeDefined()
    
    instantId = createResult.instantId
    console.log('✅ Instant generation created:', instantId)

    // Step 2: 状態監視 - 処理完了まで待機
    const maxWaitTime = 300000 // 5分
    const pollInterval = 5000 // 5秒間隔
    const startTime = Date.now()
    
    let finalStatus: string = 'pending'
    let videoId: string | undefined
    let lastStep: string = ''

    while (Date.now() - startTime < maxWaitTime) {
      const statusResponse = await fetch(`${BASE_URL}/api/instant/${instantId}/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-User-UID': userSession.user.id
        }
      })

      expect(statusResponse.status).toBe(200)
      const statusResult = await statusResponse.json()
      
      finalStatus = statusResult.status
      videoId = statusResult.videoId
      lastStep = statusResult.currentStep || ''

      console.log(`📊 Status: ${finalStatus}, Step: ${lastStep}, Progress: ${statusResult.progress}%`)

      // 完了または失敗で終了
      if (finalStatus === 'completed') {
        expect(videoId).toBeDefined()
        console.log('✅ Video generation completed:', videoId)
        break
      } else if (finalStatus === 'failed') {
        throw new Error(`Instant generation failed: ${statusResult.error}`)
      }

      // 次のポーリングまで待機
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    // Step 3: 結果検証
    expect(finalStatus).toBe('completed')
    expect(videoId).toBeDefined()

    // Step 4: 生成された動画の確認
    if (videoId) {
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single()

      expect(videoError).toBeNull()
      expect(videoData).toBeDefined()
      expect(videoData.status).toBe('completed')
      expect(videoData.url).toBeDefined()
      
      console.log('✅ Video record verified:', {
        id: videoData.id,
        status: videoData.status,
        url: videoData.url?.substring(0, 50) + '...'
      })
    }

    // Step 5: instant_generations テーブルの確認
    const { data: instantData, error: instantError } = await supabase
      .from('instant_generations')
      .select('*')
      .eq('id', instantId)
      .single()

    expect(instantError).toBeNull()
    expect(instantData).toBeDefined()
    expect(instantData.status).toBe('completed')
    expect(instantData.uid).toBe(userSession.user.id)
    
    console.log('✅ Instant generation record verified:', {
      id: instantData.id,
      status: instantData.status,
      metadata: instantData.metadata
    })

  }, 360000) // 6分タイムアウト

  test('Status API should return proper error for non-existent instant ID', async () => {
    const fakeId = 'non-existent-id'
    
    const response = await fetch(`${BASE_URL}/api/instant/${fakeId}/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-User-UID': userSession.user.id
      }
    })

    expect(response.status).toBe(404)
    const result = await response.json()
    expect(result.error).toBe('生成情報が見つかりません')
  })

  test('Create API should reject requests without authentication', async () => {
    const response = await fetch(`${BASE_URL}/api/instant/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // X-User-UID ヘッダーなし
      },
      body: JSON.stringify(TEST_STORY)
    })

    expect(response.status).toBe(401)
    const result = await response.json()
    expect(result.error).toBe('認証が必要です')
  })

  test('Create API should validate story input', async () => {
    const invalidStory = {
      storyText: '', // 空のストーリー
      title: 'Invalid Test',
      style: 'anime' as const,
      duration: 'short' as const
    }

    const response = await fetch(`${BASE_URL}/api/instant/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-User-UID': userSession.user.id
      },
      body: JSON.stringify(invalidStory)
    })

    expect(response.status).toBe(400)
    const result = await response.json()
    expect(result.error).toBe('ストーリーを入力してください')
  })
})