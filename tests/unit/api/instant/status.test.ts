import { describe, test, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/instant/[id]/status/route'
import { INSTANT_STEPS } from '@/types/instant'

// Mock dependencies
const mockSupabaseSelect = vi.fn()
const mockSupabaseEq = vi.fn()
const mockSupabaseSingle = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockSupabaseOrder = vi.fn()
const mockSupabaseLimit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockSupabaseFrom
  }))
}))

describe('/api/instant/[id]/status', () => {
  const testInstantId = 'test-instant-id'
  const testUID = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock chain
    mockSupabaseLimit.mockReturnValue([])
    mockSupabaseOrder.mockReturnValue({
      limit: mockSupabaseLimit
    })
    mockSupabaseSingle.mockResolvedValue({
      data: null,
      error: null
    })
    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
      order: mockSupabaseOrder
    })
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq
    })
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect
    })
  })

  const createRequest = (
    instantId: string = testInstantId,
    headers: Record<string, string> = { 'X-User-UID': testUID }
  ) => {
    const request = {
      headers: {
        get: vi.fn((key: string) => headers[key] || null)
      }
    } as unknown as NextRequest

    const params = Promise.resolve({ id: instantId })

    return { request, params: { params } }
  }

  describe('Authentication', () => {
    test('should require X-User-UID header', async () => {
      const { request, params } = createRequest(testInstantId, {})
      
      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })

    test('should accept valid X-User-UID header', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: testInstantId,
          uid: testUID,
          status: 'pending',
          current_step: null,
          metadata: {}
        },
        error: null
      })

      const { request, params } = createRequest()
      
      const response = await GET(request, params)

      expect(response.status).toBe(200)
    })
  })

  describe('Data retrieval', () => {
    test('should query instant_generations with correct filters', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: testInstantId,
          uid: testUID,
          status: 'processing',
          current_step: 'analyzing',
          metadata: { progress: 25 }
        },
        error: null
      })

      const { request, params } = createRequest()
      
      await GET(request, params)

      expect(mockSupabaseFrom).toHaveBeenCalledWith('instant_generations')
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*')
      expect(mockSupabaseEq).toHaveBeenCalledWith('id', testInstantId)
      expect(mockSupabaseEq).toHaveBeenCalledWith('uid', testUID)
    })

    test('should handle non-existent instant generation', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: new Error('Not found')
      })

      const { request, params } = createRequest()
      
      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('生成情報が見つかりません')
    })

    test('should handle database error', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      })

      const { request, params } = createRequest()
      
      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('生成情報が見つかりません')
    })
  })

  describe('Response formatting', () => {
    test('should format basic status response', async () => {
      const mockData = {
        id: testInstantId,
        uid: testUID,
        status: 'processing',
        current_step: 'analyzing',
        error_message: null,
        metadata: { progress: 25 },
        storyboard_id: 'storyboard-123'
      }

      mockSupabaseSingle.mockResolvedValue({
        data: mockData,
        error: null
      })

      const { request, params } = createRequest()
      
      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        status: 'processing',
        currentStep: 'analyzing',
        progress: 25,
        message: INSTANT_STEPS.analyzing,
        error: null,
        videoId: undefined
      })
    })

    test('should handle missing progress metadata', async () => {
      const mockData = {
        id: testInstantId,
        uid: testUID,
        status: 'pending',
        current_step: null,
        metadata: {},
        storyboard_id: 'storyboard-123'
      }

      mockSupabaseSingle.mockResolvedValue({
        data: mockData,
        error: null
      })

      const { request, params } = createRequest()
      
      const response = await GET(request, params)
      const data = await response.json()

      expect(data.progress).toBe(0)
    })

    test('should include error message for failed status', async () => {
      const mockData = {
        id: testInstantId,
        uid: testUID,
        status: 'failed',
        current_step: 'failed',
        error_message: 'OpenAI API error',
        metadata: {},
        storyboard_id: 'storyboard-123'
      }

      mockSupabaseSingle.mockResolvedValue({
        data: mockData,
        error: null
      })

      const { request, params } = createRequest()
      
      const response = await GET(request, params)
      const data = await response.json()

      expect(data.status).toBe('failed')
      expect(data.error).toBe('OpenAI API error')
    })

    test('should include video ID for completed status', async () => {
      const mockData = {
        id: testInstantId,
        uid: testUID,
        status: 'completed',
        current_step: 'completed',
        metadata: { video_id: 'video-123' },
        storyboard_id: 'storyboard-123'
      }

      mockSupabaseSingle.mockResolvedValue({
        data: mockData,
        error: null
      })

      const { request, params } = createRequest()
      
      const response = await GET(request, params)
      const data = await response.json()

      expect(data.status).toBe('completed')
      expect(data.videoId).toBe('video-123')
    })
  })

  describe('Video lookup for completed status', () => {
    test('should query videos table for completed instant generation', async () => {
      const mockInstantData = {
        id: testInstantId,
        uid: testUID,
        status: 'completed',
        current_step: 'completed',
        metadata: {},
        storyboard_id: 'storyboard-123'
      }

      const mockVideoData = [
        { id: 'video-123', video_url: 'https://example.com/video.mp4', status: 'completed' }
      ]

      mockSupabaseSingle.mockResolvedValue({
        data: mockInstantData,
        error: null
      })

      // Mock videos query
      mockSupabaseLimit.mockReturnValue(mockVideoData)

      const { request, params } = createRequest()
      
      const response = await GET(request, params)
      const data = await response.json()

      expect(mockSupabaseFrom).toHaveBeenCalledWith('videos')
      expect(mockSupabaseSelect).toHaveBeenCalledWith('id, video_url, status')
      expect(data.videoId).toBe('video-123')
    })

    test('should handle no videos found for completed status', async () => {
      const mockInstantData = {
        id: testInstantId,
        uid: testUID,
        status: 'completed',
        current_step: 'completed',
        metadata: {},
        storyboard_id: 'storyboard-123'
      }

      mockSupabaseSingle.mockResolvedValue({
        data: mockInstantData,
        error: null
      })

      mockSupabaseLimit.mockReturnValue([])

      const { request, params } = createRequest()
      
      const response = await GET(request, params)
      const data = await response.json()

      expect(data.videoId).toBeUndefined()
    })
  })

  describe('Message generation', () => {
    test('should generate correct message for each step', async () => {
      const steps = Object.keys(INSTANT_STEPS) as Array<keyof typeof INSTANT_STEPS>
      
      for (const step of steps) {
        const mockData = {
          id: testInstantId,
          uid: testUID,
          status: 'processing',
          current_step: step,
          metadata: {},
          storyboard_id: 'storyboard-123'
        }

        mockSupabaseSingle.mockResolvedValue({
          data: mockData,
          error: null
        })

        const { request, params } = createRequest()
        
        const response = await GET(request, params)
        const data = await response.json()

        expect(data.message).toBe(INSTANT_STEPS[step])
      }
    })

    test('should handle unknown step gracefully', async () => {
      const mockData = {
        id: testInstantId,
        uid: testUID,
        status: 'processing',
        current_step: 'unknown_step',
        metadata: {},
        storyboard_id: 'storyboard-123'
      }

      mockSupabaseSingle.mockResolvedValue({
        data: mockData,
        error: null
      })

      const { request, params } = createRequest()
      
      const response = await GET(request, params)
      const data = await response.json()

      expect(data.message).toBeUndefined()
    })
  })

  describe('Error handling', () => {
    test('should handle unexpected errors', async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { request, params } = createRequest()
      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('状態の確認に失敗しました')
    })

    test('should log errors for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Test error')
      
      mockSupabaseFrom.mockImplementation(() => {
        throw testError
      })

      const { request, params } = createRequest()
      await GET(request, params)

      expect(consoleSpy).toHaveBeenCalledWith('Status check error:', testError)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Parameter validation', () => {
    test('should handle malformed instant ID', async () => {
      const { request, params } = createRequest('invalid-id')
      
      const response = await GET(request, params)

      // Should attempt query with invalid ID and get 404
      expect(response.status).toBe(404)
    })

    test('should handle empty instant ID', async () => {
      const { request, params } = createRequest('')
      
      const response = await GET(request, params)

      expect(response.status).toBe(404)
    })
  })
})