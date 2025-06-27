import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { ApiClient, ApiClientError, apiClient } from '@/lib/api-client'
import { ErrorType } from '@/types'

// Mock the uid module
vi.mock('@/lib/uid', () => ({
  getOrCreateUid: vi.fn(() => '12345678-1234-4234-b234-123456789abc'),
}))

// Mock the schemas module
vi.mock('@/lib/schemas', () => ({
  validateSchema: vi.fn((schema, data) => ({ success: true, data })),
}))

describe('API Client Tests', () => {
  const VALID_UID = '12345678-1234-4234-b234-123456789abc'
  const BASE_URL = 'https://api.test.com'
  const MOCK_RESPONSE_DATA = { id: '123', name: 'Test Data' }

  let mockFetch: any
  let client: ApiClient

  beforeAll(() => {
    // Mock AbortSignal.timeout
    global.AbortSignal = {
      timeout: vi.fn(() => ({
        aborted: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    } as any
  })

  beforeEach(() => {
    // Mock fetch globally
    mockFetch = vi.fn()
    global.fetch = mockFetch

    // Setup browser environment
    Object.defineProperty(global, 'window', {
      value: {
        location: { origin: 'https://localhost:3000' },
      },
      writable: true,
    })

    // Create client instance
    client = new ApiClient(BASE_URL, {
      timeout: 5000,
      defaultHeaders: { 'X-Test': 'true' },
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(() => {
    delete (global as any).AbortSignal
  })

  // ================================================================
  // Error Class Tests
  // ================================================================

  describe('ApiClientError', () => {
    it('should create error with all properties', () => {
      const error = new ApiClientError(
        'Test error',
        ErrorType.VALIDATION,
        400,
        { field: 'name' }
      )

      expect(error.name).toBe('ApiClientError')
      expect(error.message).toBe('Test error')
      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'name' })
      expect(error.timestamp).toBeDefined()
      expect(error instanceof Error).toBe(true)
    })

    it('should create error with defaults', () => {
      const error = new ApiClientError('Test error')

      expect(error.type).toBe(ErrorType.INTERNAL)
      expect(error.statusCode).toBeUndefined()
      expect(error.details).toBeUndefined()
    })
  })

  // ================================================================
  // Constructor Tests
  // ================================================================

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const defaultClient = new ApiClient()
      expect(defaultClient).toBeInstanceOf(ApiClient)
    })

    it('should initialize with custom options', () => {
      const customClient = new ApiClient('https://custom.api', {
        timeout: 10000,
        defaultHeaders: { 'Authorization': 'Bearer token' },
      })
      expect(customClient).toBeInstanceOf(ApiClient)
    })

    it('should use environment variables for base URL', () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://env.api.com'
      
      const envClient = new ApiClient()
      expect(envClient).toBeInstanceOf(ApiClient)
      
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv
    })
  })

  // ================================================================
  // Request Method Tests
  // ================================================================

  describe('HTTP Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(MOCK_RESPONSE_DATA),
      })
    })

    describe('GET requests', () => {
      it('should make GET request successfully', async () => {
        const result = await client.get('/test')

        expect(mockFetch).toHaveBeenCalledWith(
          `${BASE_URL}/test`,
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'X-Test': 'true',
              'x-uid': VALID_UID,
            }),
          })
        )
        expect(result).toEqual(MOCK_RESPONSE_DATA)
      })

      it('should include query parameters', async () => {
        await client.get('/test', { param1: 'value1', param2: 'value2' })

        expect(mockFetch).toHaveBeenCalledWith(
          `${BASE_URL}/test?param1=value1&param2=value2`,
          expect.any(Object)
        )
      })

      it('should not include body in GET request', async () => {
        await client.get('/test')

        const fetchCall = mockFetch.mock.calls[0][1]
        expect(fetchCall.body).toBeUndefined()
      })
    })

    describe('POST requests', () => {
      it('should make POST request with data', async () => {
        const postData = { name: 'Test', value: 123 }
        await client.post('/test', postData)

        expect(mockFetch).toHaveBeenCalledWith(
          `${BASE_URL}/test`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(postData),
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        )
      })

      it('should make POST request without data', async () => {
        await client.post('/test')

        expect(mockFetch).toHaveBeenCalledWith(
          `${BASE_URL}/test`,
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        )
      })
    })

    describe('PUT requests', () => {
      it('should make PUT request with data', async () => {
        const putData = { id: '123', name: 'Updated' }
        await client.put('/test/123', putData)

        expect(mockFetch).toHaveBeenCalledWith(
          `${BASE_URL}/test/123`,
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(putData),
          })
        )
      })
    })

    describe('DELETE requests', () => {
      it('should make DELETE request', async () => {
        await client.delete('/test/123')

        expect(mockFetch).toHaveBeenCalledWith(
          `${BASE_URL}/test/123`,
          expect.objectContaining({
            method: 'DELETE',
          })
        )
      })
    })

    describe('PATCH requests', () => {
      it('should make PATCH request with data', async () => {
        const patchData = { name: 'Patched' }
        await client.patch('/test/123', patchData)

        expect(mockFetch).toHaveBeenCalledWith(
          `${BASE_URL}/test/123`,
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(patchData),
          })
        )
      })
    })
  })

  // ================================================================
  // Authentication Tests
  // ================================================================

  describe('Authentication', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(MOCK_RESPONSE_DATA),
      })
    })

    it('should inject UID in browser environment', async () => {
      await client.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-uid': VALID_UID,
          }),
        })
      )
    })

    it('should not inject UID in SSR environment', async () => {
      // @ts-ignore
      delete global.window

      await client.get('/test')

      const fetchCall = mockFetch.mock.calls[0][1]
      expect(fetchCall.headers['x-uid']).toBeUndefined()

      // Restore window
      Object.defineProperty(global, 'window', {
        value: { location: { origin: 'https://localhost:3000' } },
        writable: true,
      })
    })
  })

  // ================================================================
  // Response Handling Tests
  // ================================================================

  describe('Response Handling', () => {
    it('should parse JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(MOCK_RESPONSE_DATA),
      })

      const result = await client.get('/test')
      expect(result).toEqual(MOCK_RESPONSE_DATA)
    })

    it('should handle API response format with success and data', async () => {
      const apiResponseFormat = {
        success: true,
        data: MOCK_RESPONSE_DATA,
        message: 'Success',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(apiResponseFormat),
      })

      const result = await client.get('/test')
      expect(result).toEqual(MOCK_RESPONSE_DATA)
    })

    it('should handle text response', async () => {
      const textResponse = 'Plain text response'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        text: vi.fn().mockResolvedValue(textResponse),
      })

      const result = await client.get('/test')
      expect(result).toBe(textResponse)
    })

    it('should handle response without content-type header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: vi.fn().mockResolvedValue('No content type'),
      })

      const result = await client.get('/test')
      expect(result).toBe('No content type')
    })
  })

  // ================================================================
  // Error Handling Tests
  // ================================================================

  describe('Error Handling', () => {
    it('should handle 400 Bad Request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ error: 'Invalid request' }),
      })

      await expect(client.get('/test')).rejects.toThrow(ApiClientError)
      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.VALIDATION,
        statusCode: 400,
        message: 'Invalid request',
      })
    })

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
      })

      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.AUTHENTICATION,
        statusCode: 401,
      })
    })

    it('should handle 403 Forbidden', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ error: 'Forbidden' }),
      })

      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.AUTHORIZATION,
        statusCode: 403,
      })
    })

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ error: 'Not found' }),
      })

      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.NOT_FOUND,
        statusCode: 404,
      })
    })

    it('should handle 429 Rate Limit', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ error: 'Too many requests' }),
      })

      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.RATE_LIMIT,
        statusCode: 429,
      })
    })

    it('should handle 5xx Server Errors', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ error: 'Service unavailable' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.EXTERNAL_API,
        statusCode: 503,
        message: 'Service unavailable'
      })
    }, 10000)

    it('should handle malformed JSON error response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: vi.fn().mockResolvedValue('Server error'),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.INTERNAL,
        statusCode: 500,
        message: 'Unknown error occurred'
      })
    }, 10000)

    it('should handle non-JSON error response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        headers: new Map([['content-type', 'text/plain']]),
        text: vi.fn().mockResolvedValue('Internal server error'),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.INTERNAL,
        statusCode: 500,
        message: 'Internal server error',
      })
    }, 10000)
  })

  // ================================================================
  // Timeout and Network Error Tests
  // ================================================================

  describe('Timeout and Network Errors', () => {
    it('should handle timeout errors', async () => {
      const abortError = new Error('Timeout')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.NETWORK,
        statusCode: 408,
        message: 'Request timeout',
      })
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection failed'))

      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.NETWORK,
        message: 'Network connection failed',
      })
    })

    it('should handle unknown errors', async () => {
      const unknownError = new Error()
      delete (unknownError as any).message
      mockFetch.mockRejectedValue(unknownError)

      await expect(client.get('/test')).rejects.toThrow('Network error occurred')
    })
  })

  // ================================================================
  // Retry Logic Tests
  // ================================================================

  describe('Retry Logic', () => {
    it('should retry on 5xx errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Map([['content-type', 'application/json']]),
          json: vi.fn().mockResolvedValue({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: vi.fn().mockResolvedValue(MOCK_RESPONSE_DATA),
        })

      const result = await client.get('/test')
      expect(result).toEqual(MOCK_RESPONSE_DATA)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should retry on network errors', async () => {
      const networkError = new Error('Network error')
      networkError.name = 'NetworkError'
      const successResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(MOCK_RESPONSE_DATA),
      }
      
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse)

      const result = await client.get('/test')
      expect(result).toEqual(MOCK_RESPONSE_DATA)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry on 4xx errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ error: 'Bad request' }),
      })

      await expect(client.get('/test')).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should fail after max retry attempts', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ error: 'Server error' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.get('/test')).rejects.toMatchObject({
        type: ErrorType.INTERNAL,
        statusCode: 500,
        message: 'Server error'
      })
      expect(mockFetch).toHaveBeenCalledTimes(4) // Initial + 3 retries
    }, 10000)
  })

  // ================================================================
  // API Method Tests
  // ================================================================

  describe('Workspace API Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(MOCK_RESPONSE_DATA),
      })
    })

    it('should get workspaces', async () => {
      await client.getWorkspaces()
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/workspaces`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should get specific workspace', async () => {
      await client.getWorkspace('workspace-123')
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/workspaces/workspace-123`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should create workspace', async () => {
      const workspaceData = { name: 'New Workspace' }
      await client.createWorkspace(workspaceData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/workspaces`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(workspaceData),
        })
      )
    })

    it('should update workspace', async () => {
      const updateData = { name: 'Updated Workspace' }
      await client.updateWorkspace('workspace-123', updateData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/workspaces/workspace-123`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      )
    })

    it('should delete workspace', async () => {
      await client.deleteWorkspace('workspace-123')
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/workspaces/workspace-123`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Story API Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(MOCK_RESPONSE_DATA),
      })
    })

    it('should get stories with parameters', async () => {
      const params = {
        workspace_id: 'workspace-123',
        status: 'completed',
        limit: 10,
        offset: 0,
      }
      await client.getStories(params)
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/stories?workspace_id=workspace-123&status=completed&limit=10&offset=0`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should get stories without parameters', async () => {
      await client.getStories()
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/stories`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should create story', async () => {
      const storyData = {
        workspace_id: 'workspace-123',
        title: 'New Story',
        text_raw: 'Story content',
      }
      await client.createStory(storyData)
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/stories`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(storyData),
        })
      )
    })

    it('should generate script for story', async () => {
      await client.generateScript('story-123')
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/stories/story-123/generate-script`,
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('Video API Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(MOCK_RESPONSE_DATA),
      })
    })

    it('should generate video for story', async () => {
      await client.generateVideo('story-123')
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/stories/story-123/generate-video`,
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should get video status', async () => {
      await client.getVideoStatus('video-123')
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/videos/video-123/status`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should get videos with parameters', async () => {
      const params = { story_id: 'story-123', status: 'completed' }
      await client.getVideos(params)
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/videos?story_id=story-123&status=completed`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  // ================================================================
  // Utility Method Tests
  // ================================================================

  describe('Utility Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ status: 'ok', timestamp: '2024-01-01T00:00:00Z' }),
      })
    })

    it('should perform health check', async () => {
      const result = await client.healthCheck()
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/health`,
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual({ status: 'ok', timestamp: '2024-01-01T00:00:00Z' })
    })

    it('should get current user', async () => {
      const userData = { uid: VALID_UID, workspaces: [] }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(userData),
      })

      const result = await client.getCurrentUser()
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/user/me`,
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(userData)
    })
  })

  describe('Validation Methods', () => {
    it('should validate and post successfully', async () => {
      const { validateSchema } = await import('@/lib/schemas')
      vi.mocked(validateSchema).mockReturnValue({
        success: true,
        data: { name: 'Valid Data' },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ id: 'created-123' }),
      })

      const mockSchema = { type: 'object' }
      const result = await client.validateAndPost('/api/test', { name: 'Valid Data' }, mockSchema)

      expect(validateSchema).toHaveBeenCalledWith(mockSchema, { name: 'Valid Data' })
      expect(result).toEqual({ id: 'created-123' })
    })

    it('should throw error on validation failure', async () => {
      const { validateSchema } = await import('@/lib/schemas')
      vi.mocked(validateSchema).mockReturnValue({
        success: false,
        errors: [{ field: 'name', message: 'Required' }],
      })

      const mockSchema = { type: 'object' }
      
      await expect(
        client.validateAndPost('/api/test', { invalid: 'data' }, mockSchema)
      ).rejects.toMatchObject({
        type: ErrorType.VALIDATION,
        statusCode: 400,
        message: 'Validation failed',
        details: { errors: [{ field: 'name', message: 'Required' }] },
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ================================================================
  // Singleton Instance Tests
  // ================================================================

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(apiClient).toBeInstanceOf(ApiClient)
    })

    it('should use same instance across imports', async () => {
      const { apiClient: apiClient2 } = await import('@/lib/api-client')
      expect(apiClient).toBe(apiClient2)
    })
  })

  // ================================================================
  // Integration Scenarios Tests
  // ================================================================

  describe('Integration Scenarios', () => {
    it('should handle complete story creation workflow', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Map([['content-type', 'application/json']]),
          json: vi.fn().mockResolvedValue({ id: 'story-123', status: 'draft' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: vi.fn().mockResolvedValue({ script: 'Generated script' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: vi.fn().mockResolvedValue({ video_id: 'video-123', status: 'queued' }),
        })

      // Create story
      const story = await client.createStory({
        workspace_id: 'workspace-123',
        title: 'Test Story',
        text_raw: 'Story content',
      })

      // Generate script
      const scriptResult = await client.generateScript('story-123')

      // Generate video
      const videoResult = await client.generateVideo('story-123')

      expect(story).toEqual({ id: 'story-123', status: 'draft' })
      expect(scriptResult).toEqual({ script: 'Generated script' })
      expect(videoResult).toEqual({ video_id: 'video-123', status: 'queued' })
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle error recovery in workflow', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Map([['content-type', 'application/json']]),
          json: vi.fn().mockResolvedValue({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Map([['content-type', 'application/json']]),
          json: vi.fn().mockResolvedValue({ id: 'story-123' }),
        })

      // Should succeed after retry
      const result = await client.createStory({
        workspace_id: 'workspace-123',
        title: 'Test Story',
        text_raw: 'Story content',
      })

      expect(result).toEqual({ id: 'story-123' })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})