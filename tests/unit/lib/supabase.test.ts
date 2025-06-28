import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import {
  supabase,
  createAdminClient,
  getSupabaseClient,
  createAuthenticatedClient,
  isServerEnvironment,
  SupabaseError,
  handleSupabaseError,
  uploadVideoToStorage,
  deleteVideoFromStorage,
  getVideoMetadata,
  supabaseConfig,
  type Database,
  type SupabaseWorkspace,
  type SupabaseStory,
  type SupabaseVideo,
  type SupabaseReview,
} from '@/lib/supabase'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
}

const mockStorageBucket = {
  upload: vi.fn(),
  remove: vi.fn(),
  list: vi.fn(),
  getPublicUrl: vi.fn(),
}

// Mock the Supabase package
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })),
}))

describe('Supabase Client Tests', () => {
  const TEST_URL = 'https://test.supabase.co'
  const TEST_ANON_KEY = 'test-anon-key'
  const TEST_SERVICE_KEY = 'test-service-key'

  let originalEnv: any

  beforeAll(() => {
    // Save original environment variables
    originalEnv = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    // Set test environment variables using vi.stubEnv
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', TEST_URL)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', TEST_ANON_KEY)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', TEST_SERVICE_KEY)
  })

  afterAll(() => {
    // Restore original environment variables
    vi.unstubAllEnvs()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock storage bucket methods
    mockSupabaseClient.storage.from.mockReturnValue(mockStorageBucket)
    mockStorageBucket.upload.mockResolvedValue({ data: { path: 'test-path' }, error: null })
    mockStorageBucket.remove.mockResolvedValue({ error: null })
    mockStorageBucket.list.mockResolvedValue({ data: [{ name: 'test-video.mp4' }], error: null })
    mockStorageBucket.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://test.com/video.mp4' } })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ================================================================
  // Environment Variable Tests
  // ================================================================

  describe('Environment Variables', () => {
    it('should throw error if SUPABASE_URL is missing', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      expect(() => {
        // Re-import to trigger the environment check
        vi.resetModules()
        require('@/lib/supabase')
      }).toThrow('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')

      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    })

    it('should throw error if SUPABASE_ANON_KEY is missing', async () => {
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      expect(() => {
        vi.resetModules()
        require('@/lib/supabase')
      }).toThrow('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')

      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
    })
  })

  // ================================================================
  // Client Creation Tests
  // ================================================================

  describe('Client Creation', () => {
    it('should create public supabase client', () => {
      expect(supabase).toBeDefined()
      expect(supabase).toBe(mockSupabaseClient)
    })

    it('should create admin client with service role key', () => {
      const adminClient = createAdminClient()
      expect(adminClient).toBeDefined()
      expect(adminClient).toBe(mockSupabaseClient)
    })

    it('should throw error when creating admin client without service role key', () => {
      const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      expect(() => createAdminClient()).toThrow('Service role key is required for admin operations')

      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey
    })
  })

  // ================================================================
  // Environment Detection Tests
  // ================================================================

  describe('Environment Detection', () => {
    it('should detect server environment', () => {
      // @ts-ignore
      delete global.window
      expect(isServerEnvironment()).toBe(true)
    })

    it('should detect client environment', () => {
      global.window = {} as any
      expect(isServerEnvironment()).toBe(false)
      
      // Clean up
      // @ts-ignore
      delete global.window
    })
  })

  describe('getSupabaseClient', () => {
    it('should return admin client in server environment with service key', () => {
      // @ts-ignore
      delete global.window
      
      const client = getSupabaseClient()
      expect(client).toBe(mockSupabaseClient)
    })

    it('should return public client in client environment', () => {
      global.window = {} as any
      
      const client = getSupabaseClient()
      expect(client).toBe(mockSupabaseClient)
      
      // Clean up
      // @ts-ignore
      delete global.window
    })

    it('should return public client in server environment without service key', () => {
      // @ts-ignore
      delete global.window
      const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      
      const client = getSupabaseClient()
      expect(client).toBe(mockSupabaseClient)
      
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey
    })
  })

  describe('createAuthenticatedClient', () => {
    it('should create authenticated client with UID', () => {
      const uid = '12345678-1234-4234-b234-123456789abc'
      const client = createAuthenticatedClient(uid)
      
      expect(client).toBeDefined()
      expect(client).toBe(mockSupabaseClient)
    })

    it('should create authenticated client without UID', () => {
      const client = createAuthenticatedClient()
      
      expect(client).toBeDefined()
      expect(client).toBe(mockSupabaseClient)
    })
  })

  // ================================================================
  // Error Handling Tests
  // ================================================================

  describe('SupabaseError', () => {
    it('should create error with all properties', () => {
      const error = new SupabaseError('Test error', 'TEST_CODE', { field: 'test' })
      
      expect(error.name).toBe('SupabaseError')
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.details).toEqual({ field: 'test' })
      expect(error instanceof Error).toBe(true)
    })

    it('should create error with minimal properties', () => {
      const error = new SupabaseError('Test error')
      
      expect(error.name).toBe('SupabaseError')
      expect(error.message).toBe('Test error')
      expect(error.code).toBeUndefined()
      expect(error.details).toBeUndefined()
    })
  })

  describe('handleSupabaseError', () => {
    it('should throw SupabaseError with all error properties', () => {
      const originalError = {
        message: 'Database connection failed',
        code: 'CONNECTION_ERROR',
        details: { host: 'db.example.com' },
      }

      expect(() => handleSupabaseError(originalError)).toThrow(SupabaseError)
      expect(() => handleSupabaseError(originalError)).toThrow('Database connection failed')
    })

    it('should handle error without message', () => {
      const originalError = {
        code: 'UNKNOWN_ERROR',
        details: { info: 'test' },
      }

      expect(() => handleSupabaseError(originalError)).toThrow('An unknown database error occurred')
    })

    it('should handle null/undefined error', () => {
      expect(() => handleSupabaseError(null)).toThrow('An unknown database error occurred')
      expect(() => handleSupabaseError(undefined)).toThrow('An unknown database error occurred')
    })

    it('should handle error with only message', () => {
      const originalError = { message: 'Simple error' }

      expect(() => handleSupabaseError(originalError)).toThrow('Simple error')
    })
  })

  // ================================================================
  // Storage Function Tests
  // ================================================================

  describe('Storage Functions', () => {
    const testVideoBuffer = Buffer.from('test video content')
    const testFileName = 'test-video.mp4'
    const testContentType = 'video/mp4'

    describe('uploadVideoToStorage', () => {
      it('should upload video successfully', async () => {
        const result = await uploadVideoToStorage(testVideoBuffer, testFileName, testContentType)

        expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('videos')
        expect(mockStorageBucket.upload).toHaveBeenCalledWith(
          `videos/${testFileName}`,
          testVideoBuffer,
          {
            contentType: testContentType,
            upsert: false,
          }
        )
        expect(mockStorageBucket.getPublicUrl).toHaveBeenCalledWith(`videos/${testFileName}`)
        expect(result).toEqual({
          url: 'https://test.com/video.mp4',
          path: `videos/${testFileName}`,
        })
      })

      it('should upload video with default content type', async () => {
        await uploadVideoToStorage(testVideoBuffer, testFileName)

        expect(mockStorageBucket.upload).toHaveBeenCalledWith(
          `videos/${testFileName}`,
          testVideoBuffer,
          {
            contentType: 'video/mp4',
            upsert: false,
          }
        )
      })

      it('should throw error on upload failure', async () => {
        const uploadError = { message: 'Upload failed', name: 'UPLOAD_ERROR' }
        mockStorageBucket.upload.mockResolvedValue({ data: null, error: uploadError })

        await expect(uploadVideoToStorage(testVideoBuffer, testFileName)).rejects.toThrow(
          'Failed to upload video: Upload failed'
        )
      })
    })

    describe('deleteVideoFromStorage', () => {
      it('should delete video successfully', async () => {
        const filePath = 'videos/test-video.mp4'
        
        await deleteVideoFromStorage(filePath)

        expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('videos')
        expect(mockStorageBucket.remove).toHaveBeenCalledWith([filePath])
      })

      it('should throw error on delete failure', async () => {
        const deleteError = { message: 'Delete failed', name: 'DELETE_ERROR' }
        mockStorageBucket.remove.mockResolvedValue({ error: deleteError })

        await expect(deleteVideoFromStorage('videos/test.mp4')).rejects.toThrow(
          'Failed to delete video: Delete failed'
        )
      })
    })

    describe('getVideoMetadata', () => {
      it('should get video metadata successfully', async () => {
        const filePath = 'videos/subfolder/test-video.mp4'
        const expectedMetadata = { name: 'test-video.mp4', size: 1024 }
        mockStorageBucket.list.mockResolvedValue({ data: [expectedMetadata], error: null })

        const result = await getVideoMetadata(filePath)

        expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('videos')
        expect(mockStorageBucket.list).toHaveBeenCalledWith('videos/subfolder', {
          search: 'test-video.mp4',
        })
        expect(result).toEqual(expectedMetadata)
      })

      it('should handle root level files', async () => {
        const filePath = 'videos/test-video.mp4'
        const expectedMetadata = { name: 'test-video.mp4', size: 1024 }
        mockStorageBucket.list.mockResolvedValue({ data: [expectedMetadata], error: null })

        const result = await getVideoMetadata(filePath)

        expect(mockStorageBucket.list).toHaveBeenCalledWith('videos', {
          search: 'test-video.mp4',
        })
        expect(result).toEqual(expectedMetadata)
      })

      it('should return undefined when no metadata found', async () => {
        mockStorageBucket.list.mockResolvedValue({ data: [], error: null })

        const result = await getVideoMetadata('videos/nonexistent.mp4')

        expect(result).toBeUndefined()
      })

      it('should throw error on metadata fetch failure', async () => {
        const metadataError = { message: 'Metadata fetch failed', name: 'METADATA_ERROR' }
        mockStorageBucket.list.mockResolvedValue({ data: null, error: metadataError })

        await expect(getVideoMetadata('videos/test.mp4')).rejects.toThrow(
          'Failed to get video metadata: Metadata fetch failed'
        )
      })
    })
  })

  // ================================================================
  // Configuration Tests
  // ================================================================

  describe('Configuration', () => {
    it('should export correct configuration', () => {
      expect(supabaseConfig).toEqual({
        url: TEST_URL,
        anonKey: TEST_ANON_KEY,
        hasServiceRole: true,
        storage: {
          videoBucket: 'videos',
        },
      })
    })

    it('should detect missing service role key in config', () => {
      const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      // Re-import to get updated config
      vi.resetModules()
      const { supabaseConfig: newConfig } = require('@/lib/supabase')

      expect(newConfig.hasServiceRole).toBe(false)

      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey
    })
  })

  // ================================================================
  // Type Validation Tests
  // ================================================================

  describe('Database Types', () => {
    it('should have correct workspace row structure', () => {
      const workspace: SupabaseWorkspace = {
        id: 'workspace-123',
        uid: 'user-123',
        name: 'Test Workspace',
        created_at: '2024-01-01T00:00:00.000Z',
      }

      expect(workspace.id).toBe('workspace-123')
      expect(workspace.uid).toBe('user-123')
      expect(workspace.name).toBe('Test Workspace')
      expect(workspace.created_at).toBe('2024-01-01T00:00:00.000Z')
    })

    it('should have correct story row structure', () => {
      const story: SupabaseStory = {
        id: 'story-123',
        workspace_id: 'workspace-123',
        uid: 'user-123',
        title: 'Test Story',
        text_raw: 'Story content',
        script_json: { scenes: [] },
        status: 'draft',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      expect(story.status).toBe('draft')
      expect(story.script_json).toEqual({ scenes: [] })
    })

    it('should have correct video row structure', () => {
      const video: SupabaseVideo = {
        id: 'video-123',
        story_id: 'story-123',
        uid: 'user-123',
        url: 'https://example.com/video.mp4',
        duration_sec: 30,
        resolution: '1920x1080',
        size_mb: 10.5,
        status: 'completed',
        error_msg: undefined,
        created_at: '2024-01-01T00:00:00.000Z',
      }

      expect(video.status).toBe('completed')
      expect(video.duration_sec).toBe(30)
      expect(video.size_mb).toBe(10.5)
    })

    it('should have correct review row structure', () => {
      const review: SupabaseReview = {
        id: 'review-123',
        story_id: 'story-123',
        review_text: 'Great story!',
        rating: 5,
        created_at: '2024-01-01T00:00:00.000Z',
      }

      expect(review.rating).toBe(5)
      expect(review.review_text).toBe('Great story!')
    })
  })

  // ================================================================
  // Integration Tests
  // ================================================================

  describe('Integration Scenarios', () => {
    it('should handle complete video upload workflow', async () => {
      const videoBuffer = Buffer.from('test video content')
      const fileName = 'story-123-video.mp4'

      // Upload video
      const uploadResult = await uploadVideoToStorage(videoBuffer, fileName)
      expect(uploadResult.url).toBeDefined()
      expect(uploadResult.path).toBe(`videos/${fileName}`)

      // Get metadata
      const metadata = await getVideoMetadata(uploadResult.path)
      expect(metadata).toBeDefined()

      // Delete video
      await deleteVideoFromStorage(uploadResult.path)

      expect(mockStorageBucket.upload).toHaveBeenCalledTimes(1)
      expect(mockStorageBucket.list).toHaveBeenCalledTimes(1)
      expect(mockStorageBucket.remove).toHaveBeenCalledTimes(1)
    })

    it('should handle environment switching', () => {
      // Server environment
      // @ts-ignore
      delete global.window
      expect(isServerEnvironment()).toBe(true)
      
      const serverClient = getSupabaseClient()
      expect(serverClient).toBeDefined()

      // Client environment
      global.window = {} as any
      expect(isServerEnvironment()).toBe(false)
      
      const clientClient = getSupabaseClient()
      expect(clientClient).toBeDefined()

      // Clean up
      // @ts-ignore
      delete global.window
    })

    it('should handle error recovery in storage operations', async () => {
      // Simulate upload failure then success
      mockStorageBucket.upload
        .mockResolvedValueOnce({ data: null, error: { message: 'Network error' } })
        .mockResolvedValueOnce({ data: { path: 'videos/test.mp4' }, error: null })

      // First attempt should fail
      await expect(uploadVideoToStorage(Buffer.from('test'), 'test.mp4')).rejects.toThrow('Failed to upload video')

      // Second attempt should succeed
      const result = await uploadVideoToStorage(Buffer.from('test'), 'test.mp4')
      expect(result.path).toBe('videos/test.mp4')
    })

    it('should handle different client configurations', () => {
      // Test with service role key
      expect(() => createAdminClient()).not.toThrow()

      // Test without service role key
      const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      
      expect(() => createAdminClient()).toThrow('Service role key is required for admin operations')
      
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey
    })
  })

  // ================================================================
  // Error Edge Cases
  // ================================================================

  describe('Error Edge Cases', () => {
    it('should handle storage operations with empty responses', async () => {
      mockStorageBucket.list.mockResolvedValue({ data: null, error: null })

      const result = await getVideoMetadata('videos/test.mp4')
      expect(result).toBeUndefined()
    })

    it('should handle malformed file paths in metadata', async () => {
      mockStorageBucket.list.mockResolvedValue({ data: [{ name: 'test.mp4' }], error: null })

      // Test with file path without directory
      const result = await getVideoMetadata('test.mp4')
      expect(mockStorageBucket.list).toHaveBeenCalledWith('', { search: 'test.mp4' })
    })

    it('should handle network errors in all storage operations', async () => {
      const networkError = { message: 'Network connection lost', name: 'NETWORK_ERROR' }
      
      mockStorageBucket.upload.mockResolvedValue({ error: networkError })
      mockStorageBucket.remove.mockResolvedValue({ error: networkError })
      mockStorageBucket.list.mockResolvedValue({ error: networkError })

      await expect(uploadVideoToStorage(Buffer.from('test'), 'test.mp4')).rejects.toThrow('Network connection lost')
      await expect(deleteVideoFromStorage('videos/test.mp4')).rejects.toThrow('Network connection lost')
      await expect(getVideoMetadata('videos/test.mp4')).rejects.toThrow('Network connection lost')
    })
  })
})