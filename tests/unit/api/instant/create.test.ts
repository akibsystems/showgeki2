import { describe, test, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/instant/create/route'
import type { InstantModeInput } from '@/types/instant'

// Mock dependencies
const mockProcessInstantMode = vi.fn()
const mockSupabaseInsert = vi.fn()
const mockSupabaseSelect = vi.fn()
const mockSupabaseSingle = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/instant/instant-generator', () => ({
  processInstantMode: mockProcessInstantMode
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockSupabaseFrom
  }))
}))

describe('/api/instant/create', () => {
  const validInstantInput: InstantModeInput = {
    storyText: 'Test story about a brave knight',
    title: 'Test Adventure',
    style: 'anime',
    duration: 'medium'
  }

  const mockUID = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default successful mocks
    mockSupabaseSingle.mockResolvedValue({
      data: { id: 'project-id' },
      error: null
    })
    mockSupabaseSelect.mockReturnValue({
      single: mockSupabaseSingle
    })
    mockSupabaseInsert.mockReturnValue({
      select: mockSupabaseSelect
    })
    mockSupabaseFrom.mockReturnValue({
      insert: mockSupabaseInsert
    })

    mockProcessInstantMode.mockResolvedValue(undefined)
  })

  const createRequest = (
    body: any, 
    headers: Record<string, string> = { 'X-User-UID': mockUID }
  ) => {
    const request = {
      headers: {
        get: vi.fn((key: string) => headers[key] || null)
      },
      json: vi.fn().mockResolvedValue(body)
    } as unknown as NextRequest

    return request
  }

  describe('Authentication', () => {
    test('should require X-User-UID header', async () => {
      const request = createRequest(validInstantInput, {})
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })

    test('should accept valid X-User-UID header', async () => {
      const request = createRequest(validInstantInput)
      
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Input validation', () => {
    test('should require storyText', async () => {
      const invalidInput = { ...validInstantInput, storyText: '' }
      const request = createRequest(invalidInput)
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ストーリーを入力してください')
    })

    test('should require non-whitespace storyText', async () => {
      const invalidInput = { ...validInstantInput, storyText: '   ' }
      const request = createRequest(invalidInput)
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ストーリーを入力してください')
    })

    test('should accept valid input', async () => {
      const request = createRequest(validInstantInput)
      
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    test('should handle missing optional fields', async () => {
      const minimalInput = { storyText: 'Test story' }
      const request = createRequest(minimalInput)
      
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Database operations', () => {
    test('should create project successfully', async () => {
      const request = createRequest(validInstantInput)
      
      await POST(request)

      expect(mockSupabaseFrom).toHaveBeenCalledWith('projects')
      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        uid: mockUID,
        name: expect.stringContaining('Instant Mode'),
        description: 'Instant Modeで作成された動画'
      })
    })

    test('should handle project creation failure', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: new Error('Project creation failed')
      })

      const request = createRequest(validInstantInput)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('プロジェクトの作成に失敗しました')
    })

    test('should create storyboard successfully', async () => {
      // First call for project, second for storyboard
      mockSupabaseSingle
        .mockResolvedValueOnce({
          data: { id: 'project-id' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'storyboard-id' },
          error: null
        })

      const request = createRequest(validInstantInput)
      
      await POST(request)

      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        project_id: 'project-id',
        uid: mockUID,
        title: validInstantInput.title,
        status: 'draft'
      })
    })

    test('should handle storyboard creation failure', async () => {
      mockSupabaseSingle
        .mockResolvedValueOnce({
          data: { id: 'project-id' },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Storyboard creation failed')
        })

      const request = createRequest(validInstantInput)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('ストーリーボードの作成に失敗しました')
    })

    test('should create instant_generation record', async () => {
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: { id: 'project-id' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'storyboard-id' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'instant-id' }, error: null })

      const request = createRequest(validInstantInput)
      
      await POST(request)

      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        uid: mockUID,
        storyboard_id: 'storyboard-id',
        status: 'pending',
        metadata: {
          input: validInstantInput
        }
      })
    })
  })

  describe('Instant mode processing', () => {
    test('should trigger instant mode processing', async () => {
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: { id: 'project-id' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'storyboard-id' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'instant-id' }, error: null })

      const request = createRequest(validInstantInput)
      
      await POST(request)

      expect(mockProcessInstantMode).toHaveBeenCalledWith({
        instantId: 'instant-id',
        storyboardId: 'storyboard-id',
        uid: mockUID,
        input: validInstantInput
      })
    })

    test('should not wait for processing completion', async () => {
      const slowProcessing = vi.fn(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      )
      mockProcessInstantMode.mockImplementation(slowProcessing)

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: { id: 'project-id' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'storyboard-id' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'instant-id' }, error: null })

      const request = createRequest(validInstantInput)
      const startTime = Date.now()
      
      const response = await POST(request)
      const endTime = Date.now()

      // Should return quickly without waiting for processing
      expect(endTime - startTime).toBeLessThan(500)
      expect(response.status).toBe(200)
    })
  })

  describe('Response format', () => {
    test('should return correct success response', async () => {
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: { id: 'project-id' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'storyboard-id' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'instant-id' }, error: null })

      const request = createRequest(validInstantInput)
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        instantId: 'instant-id'
      })
    })

    test('should handle JSON parsing errors', async () => {
      const request = {
        headers: {
          get: vi.fn(() => mockUID)
        },
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('サーバーエラーが発生しました')
    })
  })

  describe('Error handling', () => {
    test('should handle unexpected errors', async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const request = createRequest(validInstantInput)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('サーバーエラーが発生しました')
    })

    test('should log errors for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Test error')
      
      mockSupabaseFrom.mockImplementation(() => {
        throw testError
      })

      const request = createRequest(validInstantInput)
      await POST(request)

      expect(consoleSpy).toHaveBeenCalledWith('Instant Mode creation error:', testError)
      
      consoleSpy.mockRestore()
    })
  })
})