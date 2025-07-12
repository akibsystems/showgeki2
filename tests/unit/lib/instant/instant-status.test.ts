import { describe, test, expect, vi, beforeEach } from 'vitest'
import { InstantStatus } from '@/lib/instant/instant-status'

// Mock Supabase
const mockSupabaseUpdate = vi.fn()
const mockSupabaseSelect = vi.fn()
const mockSupabaseEq = vi.fn()
const mockSupabaseSingle = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockSupabaseFrom
  }))
}))

describe('InstantStatus', () => {
  const testInstantId = 'test-instant-id'
  let instantStatus: InstantStatus

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock chain for update operations
    mockSupabaseEq.mockReturnValue({ 
      then: vi.fn().mockResolvedValue({ data: null, error: null })
    })
    mockSupabaseUpdate.mockReturnValue({
      eq: mockSupabaseEq
    })
    
    // Setup default mock chain for select operations (for getMetadata)
    mockSupabaseSingle.mockResolvedValue({
      data: { metadata: {} },
      error: null
    })
    mockSupabaseSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: mockSupabaseSingle
      })
    })
    
    mockSupabaseFrom.mockReturnValue({
      update: mockSupabaseUpdate,
      select: mockSupabaseSelect
    })

    instantStatus = new InstantStatus(testInstantId)
  })

  describe('constructor', () => {
    test('should create instance with correct instantId', () => {
      expect(instantStatus).toBeInstanceOf(InstantStatus)
      // Test through behavior since instantId is private
    })
  })

  describe('update', () => {
    test('should update status with step only', async () => {
      await instantStatus.update('analyzing')

      expect(mockSupabaseFrom).toHaveBeenCalledWith('instant_generations')
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'processing',
        current_step: 'analyzing',
        updated_at: expect.any(String)
      })
      expect(mockSupabaseEq).toHaveBeenCalledWith('id', testInstantId)
    })

    test('should update status with step and message', async () => {
      const testMessage = 'Test message'
      await instantStatus.update('script', testMessage)

      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'processing',
        current_step: 'script',
        updated_at: expect.any(String)
      })
    })

    test('should update status with step, message, and progress', async () => {
      const testMessage = 'Test message'
      const testProgress = 75
      await instantStatus.update('voices', testMessage, testProgress)

      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'processing',
        current_step: 'voices',
        metadata: {
          progress: testProgress
        },
        updated_at: expect.any(String)
      })
    })

    test('should handle database update error', async () => {
      const testError = new Error('Database error')
      mockSupabaseEq.mockReturnValue({
        then: vi.fn().mockResolvedValue({ data: null, error: testError })
      })

      await expect(instantStatus.update('analyzing')).rejects.toThrow('Database error')
    })
  })

  describe('complete', () => {
    test('should mark as completed with videoId', async () => {
      const testVideoId = 'test-video-id'
      await instantStatus.complete(testVideoId)

      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'completed',
        current_step: 'completed',
        metadata: {
          video_id: testVideoId,
          progress: 100
        },
        updated_at: expect.any(String)
      })
    })

    test('should handle completion error', async () => {
      const testError = new Error('Completion error')
      mockSupabaseEq.mockReturnValue({
        then: vi.fn().mockResolvedValue({ data: null, error: testError })
      })

      await expect(instantStatus.complete('test-video-id')).rejects.toThrow('Completion error')
    })
  })

  describe('fail', () => {
    test('should mark as failed with error message', async () => {
      const testErrorMessage = 'Test error message'
      await instantStatus.fail(testErrorMessage)

      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'failed',
        error_message: testErrorMessage,
        updated_at: expect.any(String)
      })
    })

    test('should handle fail update error', async () => {
      const testError = new Error('Fail update error')
      mockSupabaseEq.mockReturnValue({
        then: vi.fn().mockResolvedValue({ data: null, error: testError })
      })

      await expect(instantStatus.fail('Test error')).rejects.toThrow('Fail update error')
    })
  })

  describe('error handling', () => {
    test('should handle malformed instant ID', async () => {
      const invalidStatus = new InstantStatus('')
      
      // Should make database call with empty ID
      await invalidStatus.update('analyzing')
      
      expect(mockSupabaseEq).toHaveBeenCalledWith('id', '')
    })

    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error')
      mockSupabaseFrom.mockImplementation(() => {
        throw networkError
      })
      
      await expect(instantStatus.update('analyzing')).rejects.toThrow('Network error')
    })

    test('should handle metadata fetch errors', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: new Error('Metadata error')
      })

      await expect(instantStatus.update('analyzing')).rejects.toThrow('Metadata error')
    })
  })

  describe('timestamp generation', () => {
    test('should generate valid ISO timestamp', async () => {
      const dateSpy = vi.spyOn(Date.prototype, 'toISOString')
      const mockTimestamp = '2023-01-01T00:00:00.000Z'
      dateSpy.mockReturnValue(mockTimestamp)

      await instantStatus.update('analyzing')

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: mockTimestamp
        })
      )

      dateSpy.mockRestore()
    })
  })
})