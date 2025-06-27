import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  extractUid,
  validateUidAuth,
  createAuthContext,
  authMiddleware,
  createAuthErrorResponse,
  withAuth,
  withOptionalAuth,
  getAuthInfo,
  logAuthStatus,
  authPatterns,
  type AuthContext,
  type AuthResult,
  type AuthMiddlewareOptions,
} from '@/lib/auth'

// Mock the schemas module
vi.mock('@/lib/schemas', () => ({
  isValidUid: vi.fn((uid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(uid);
    console.log('[TEST DEBUG] isValidUid called with:', uid, 'result:', isValid);
    return isValid;
  }),
}))

// Mock ErrorType
vi.mock('@/types', () => ({
  ErrorType: {
    AUTHENTICATION: 'AUTHENTICATION',
    VALIDATION: 'VALIDATION',
    AUTHORIZATION: 'AUTHORIZATION',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMIT: 'RATE_LIMIT',
    EXTERNAL_API: 'EXTERNAL_API',
    INTERNAL: 'INTERNAL',
    NETWORK: 'NETWORK',
  },
}))

describe('Authentication System Tests', () => {
  const VALID_UID = '12345678-1234-4234-b234-123456789abc'
  const ANOTHER_VALID_UID = '87654321-4321-4321-b321-987654321dcb'
  const INVALID_UID = 'invalid-uid-format'
  const BASE_URL = 'https://example.com'

  // Helper function to create mock NextRequest
  function createMockRequest(options: {
    method?: string
    url?: string
    headers?: Record<string, string>
    query?: Record<string, string>
    body?: any
    cookies?: Record<string, string>
  } = {}): NextRequest {
    const {
      method = 'GET',
      url = '/api/test',
      headers = {},
      query = {},
      body,
      cookies = {},
    } = options

    // Create URL with query parameters
    const fullUrl = new URL(url, BASE_URL)
    Object.entries(query).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value)
    })

    // Create cookie header from cookies object
    const cookieHeader = Object.entries(cookies)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('; ')

    const allHeaders = {
      ...headers,
      ...(cookieHeader && { cookie: cookieHeader }),
    }

    // Mock NextRequest
    const request = {
      method,
      headers: new Map(Object.entries(allHeaders)),
      nextUrl: {
        pathname: fullUrl.pathname,
        searchParams: fullUrl.searchParams,
      },
      clone: vi.fn(),
      json: vi.fn(),
    } as unknown as NextRequest

    // Create proper headers Map with case-insensitive get method
    request.headers = new Map(Object.entries(allHeaders).map(([key, value]) => [key.toLowerCase(), value]))
    const originalGet = request.headers.get.bind(request.headers)
    request.headers.get = vi.fn((name: string) => {
      return originalGet(name.toLowerCase())
    })

    // Set up body handling
    if (body) {
      const clonedRequest = {
        headers: request.headers,
        json: vi.fn().mockResolvedValue(body),
      }
      ;(request.clone as any).mockReturnValue(clonedRequest)
    }

    return request
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.log for development logging
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ================================================================
  // UID Extraction Tests
  // ================================================================

  describe('UID Extraction from Headers', () => {
    it('should extract UID from default header (x-uid)', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should extract UID from Bearer token', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': `Bearer ${VALID_UID}` },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should extract UID from Authorization header', async () => {
      const request = createMockRequest({
        headers: { 'authorization': `Bearer ${VALID_UID}` },
      })

      const uid = await extractUid(request, { headerName: 'authorization' })
      expect(uid).toBe(VALID_UID)
    })

    it('should extract UID from custom header', async () => {
      const request = createMockRequest({
        headers: { 'x-custom-uid': VALID_UID },
      })

      const uid = await extractUid(request, { headerName: 'x-custom-uid' })
      expect(uid).toBe(VALID_UID)
    })

    it('should reject invalid UID from header', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': INVALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })

    it('should handle missing header', async () => {
      const request = createMockRequest({})

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })
  })

  describe('UID Extraction from Query Parameters', () => {
    it('should extract UID from default query parameter', async () => {
      const request = createMockRequest({
        query: { uid: VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should extract UID from custom query parameter', async () => {
      const request = createMockRequest({
        query: { userId: VALID_UID },
      })

      const uid = await extractUid(request, { queryParam: 'userId' })
      expect(uid).toBe(VALID_UID)
    })

    it('should reject invalid UID from query', async () => {
      const request = createMockRequest({
        query: { uid: INVALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })

    it('should handle missing query parameter', async () => {
      const request = createMockRequest({
        query: {},
      })

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })
  })

  describe('UID Extraction from Cookies', () => {
    it('should extract UID from cookie', async () => {
      const request = createMockRequest({
        cookies: { showgeki_uid: VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should handle URL encoded cookie values', async () => {
      const request = createMockRequest({
        headers: { 
          cookie: `showgeki_uid=${encodeURIComponent(VALID_UID)}; other=value` 
        },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should reject invalid UID from cookie', async () => {
      const request = createMockRequest({
        cookies: { showgeki_uid: INVALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })

    it('should handle malformed cookie header', async () => {
      const request = createMockRequest({
        headers: { cookie: 'malformed_cookie_data' },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })

    it('should handle missing cookie', async () => {
      const request = createMockRequest({})

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })
  })

  describe('UID Extraction from Request Body', () => {
    it('should extract UID from POST request body', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { uid: VALID_UID, other: 'data' },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should extract UID from PUT request body', async () => {
      const request = createMockRequest({
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: { uid: VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should not try to extract from GET request body', async () => {
      const request = createMockRequest({
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        body: { uid: VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(null)
      expect(request.clone).not.toHaveBeenCalled()
    })

    it('should not try to extract from DELETE request body', async () => {
      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: { uid: VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(null)
      expect(request.clone).not.toHaveBeenCalled()
    })

    it('should handle non-JSON content type', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: { uid: VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })

    it('should handle malformed JSON body', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
      
      const clonedRequest = {
        headers: request.headers,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      }
      ;(request.clone as any).mockReturnValue(clonedRequest)

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })

    it('should reject invalid UID from body', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { uid: INVALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })
  })

  describe('UID Extraction Priority', () => {
    it('should prioritize header over query parameter', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
        query: { uid: ANOTHER_VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should prioritize query over cookie', async () => {
      const request = createMockRequest({
        query: { uid: VALID_UID },
        cookies: { showgeki_uid: ANOTHER_VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should prioritize cookie over body', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cookies: { showgeki_uid: VALID_UID },
        body: { uid: ANOTHER_VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should fall through to next source when invalid', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': INVALID_UID },
        query: { uid: VALID_UID },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })
  })

  // ================================================================
  // Validation Functions Tests
  // ================================================================

  describe('validateUidAuth', () => {
    it('should validate correct UID', () => {
      const result = validateUidAuth(VALID_UID)
      expect(result).toEqual({
        success: true,
        uid: VALID_UID,
      })
    })

    it('should reject null UID', () => {
      const result = validateUidAuth(null)
      expect(result).toEqual({
        success: false,
        error: 'UID is required',
      })
    })

    it('should reject invalid UID format', () => {
      const result = validateUidAuth(INVALID_UID)
      expect(result).toEqual({
        success: false,
        error: 'Invalid UID format',
      })
    })

    it('should reject empty string', () => {
      const result = validateUidAuth('')
      expect(result).toEqual({
        success: false,
        error: 'UID is required',
      })
    })
  })

  describe('createAuthContext', () => {
    it('should create authenticated context for valid UID', () => {
      const context = createAuthContext(VALID_UID)
      expect(context).toEqual({
        uid: VALID_UID,
        isAuthenticated: true,
      })
    })

    it('should create unauthenticated context for null UID', () => {
      const context = createAuthContext(null)
      expect(context).toEqual({
        uid: '',
        isAuthenticated: false,
      })
    })

    it('should create unauthenticated context for invalid UID', () => {
      const context = createAuthContext(INVALID_UID)
      expect(context).toEqual({
        uid: INVALID_UID,
        isAuthenticated: false,
      })
    })
  })

  // ================================================================
  // Middleware Functions Tests
  // ================================================================

  describe('authMiddleware', () => {
    it('should succeed with valid UID (required)', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
      })

      const result = await authMiddleware(request)
      expect(result).toEqual({
        success: true,
        uid: VALID_UID,
      })
    })

    it('should fail when UID required but missing', async () => {
      const request = createMockRequest({})

      const result = await authMiddleware(request)
      expect(result).toEqual({
        success: false,
        error: 'Authentication required. Please provide a valid UID.',
      })
    })

    it('should fail when UID required but invalid', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': INVALID_UID },
      })

      const result = await authMiddleware(request)
      expect(result).toEqual({
        success: false,
        error: 'Authentication required. Please provide a valid UID.',
      })
    })

    it('should succeed when UID optional and missing', async () => {
      const request = createMockRequest({})

      const result = await authMiddleware(request, { required: false })
      expect(result).toEqual({
        success: true,
        uid: undefined,
      })
    })

    it('should succeed when UID optional and valid', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
      })

      const result = await authMiddleware(request, { required: false })
      expect(result).toEqual({
        success: true,
        uid: VALID_UID,
      })
    })

    it('should succeed when UID optional but invalid format', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': INVALID_UID },
      })

      const result = await authMiddleware(request, { required: false })
      expect(result).toEqual({
        success: true,
        uid: undefined,
      })
    })

    it('should handle custom options', async () => {
      const request = createMockRequest({
        headers: { 'authorization': `Bearer ${VALID_UID}` },
      })

      const result = await authMiddleware(request, { 
        headerName: 'authorization',
        required: true,
      })
      expect(result).toEqual({
        success: true,
        uid: VALID_UID,
      })
    })

    it('should handle errors gracefully', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
      
      // Mock request.clone to throw an error to trigger the catch block
      ;(request.clone as any).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await authMiddleware(request)
      expect(result).toEqual({
        success: false,
        error: 'Authentication required. Please provide a valid UID.',
      })
    })
  })

  describe('createAuthErrorResponse', () => {
    it('should create error response with default status', () => {
      const response = createAuthErrorResponse('Test error')
      
      expect(response).toBeInstanceOf(NextResponse)
      // Note: We can't easily test the internal structure of NextResponse
      // but we can verify it was created properly
    })

    it('should create error response with custom status', () => {
      const response = createAuthErrorResponse('Test error', 403)
      
      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe('withAuth Higher-Order Function', () => {
    it('should call handler with auth context when authenticated', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = withAuth(mockHandler)
      
      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
      })

      const response = await wrappedHandler(request)
      
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        { uid: VALID_UID, isAuthenticated: true }
      )
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should return error response when not authenticated', async () => {
      const mockHandler = vi.fn()
      const wrappedHandler = withAuth(mockHandler)
      
      const request = createMockRequest({})

      const response = await wrappedHandler(request)
      
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should pass through additional arguments', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = withAuth(mockHandler)
      
      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
      })
      const extraArg = { params: { id: '123' } }

      await wrappedHandler(request, extraArg)
      
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        { uid: VALID_UID, isAuthenticated: true },
        extraArg
      )
    })

    it('should use custom options', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = withAuth(mockHandler, { headerName: 'authorization' })
      
      const request = createMockRequest({
        headers: { 'authorization': `Bearer ${VALID_UID}` },
      })

      await wrappedHandler(request)
      
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        { uid: VALID_UID, isAuthenticated: true }
      )
    })
  })

  describe('withOptionalAuth Higher-Order Function', () => {
    it('should call handler even when not authenticated', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = withOptionalAuth(mockHandler)
      
      const request = createMockRequest({})

      await wrappedHandler(request)
      
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        { uid: '', isAuthenticated: false }
      )
    })

    it('should call handler with auth context when authenticated', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = withOptionalAuth(mockHandler)
      
      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
      })

      await wrappedHandler(request)
      
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        { uid: VALID_UID, isAuthenticated: true }
      )
    })
  })

  // ================================================================
  // Utility Functions Tests
  // ================================================================

  describe('getAuthInfo', () => {
    it('should return comprehensive auth information', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
        query: { uid: ANOTHER_VALID_UID },
        cookies: { showgeki_uid: VALID_UID },
      })

      const info = await getAuthInfo(request)
      
      expect(info).toEqual({
        hasUidInHeader: true,
        hasUidInQuery: true,
        hasUidInCookie: true,
        extractedUid: VALID_UID, // Header has priority
        isValidFormat: true,
      })
    })

    it('should detect invalid format', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': INVALID_UID },
      })

      const info = await getAuthInfo(request)
      
      expect(info).toEqual({
        hasUidInHeader: true,
        hasUidInQuery: false,
        hasUidInCookie: false,
        extractedUid: null,
        isValidFormat: false,
      })
    })

    it('should handle no auth information', async () => {
      const request = createMockRequest({})

      const info = await getAuthInfo(request)
      
      expect(info).toEqual({
        hasUidInHeader: false,
        hasUidInQuery: false,
        hasUidInCookie: false,
        extractedUid: null,
        isValidFormat: false,
      })
    })
  })

  describe('logAuthStatus', () => {
    it('should log in development environment', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const request = createMockRequest({
        method: 'POST',
        url: '/api/test-endpoint',
        headers: { 
          'x-uid': VALID_UID,
          'user-agent': 'Mozilla/5.0 Test Browser Agent String',
        },
      })

      await logAuthStatus(request)
      
      expect(console.log).toHaveBeenCalledWith(
        '[Auth Debug] POST /api/test-endpoint:',
        expect.objectContaining({
          hasUidInHeader: true,
          extractedUid: VALID_UID,
          isValidFormat: true,
          userAgent: expect.stringContaining('Mozilla/5.0'),
        })
      )

      process.env.NODE_ENV = originalEnv
    })

    it('should not log in production environment', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
      })

      await logAuthStatus(request)
      
      expect(console.log).not.toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('should handle long user agent strings', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const longUserAgent = 'A'.repeat(100)
      const request = createMockRequest({
        headers: { 'user-agent': longUserAgent },
      })

      await logAuthStatus(request)
      
      expect(console.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userAgent: longUserAgent.slice(0, 50),
        })
      )

      process.env.NODE_ENV = originalEnv
    })
  })

  // ================================================================
  // authPatterns Tests
  // ================================================================

  describe('authPatterns', () => {
    it('should have required pattern', () => {
      expect(authPatterns).toHaveProperty('required')
      expect(typeof authPatterns.required).toBe('function')
    })

    it('should have optional pattern', () => {
      expect(authPatterns).toHaveProperty('optional')
      expect(typeof authPatterns.optional).toBe('function')
    })

    it('should have customHeader pattern', () => {
      expect(authPatterns).toHaveProperty('customHeader')
      expect(typeof authPatterns.customHeader).toBe('function')
    })

    it('should create required auth wrapper', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = authPatterns.required(mockHandler)
      
      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
      })

      await wrappedHandler(request)
      
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        { uid: VALID_UID, isAuthenticated: true }
      )
    })

    it('should create optional auth wrapper', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = authPatterns.optional(mockHandler)
      
      const request = createMockRequest({})

      await wrappedHandler(request)
      
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        { uid: '', isAuthenticated: false }
      )
    })

    it('should create custom header auth wrapper', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = authPatterns.customHeader('authorization')(mockHandler)
      
      const request = createMockRequest({
        headers: { 'authorization': `Bearer ${VALID_UID}` },
      })

      await wrappedHandler(request)
      
      expect(mockHandler).toHaveBeenCalledWith(
        request,
        { uid: VALID_UID, isAuthenticated: true }
      )
    })
  })

  // ================================================================
  // Integration Tests
  // ================================================================

  describe('Integration Scenarios', () => {
    it('should handle complete API authentication flow', async () => {
      // Simulate API route handler
      const apiHandler = vi.fn().mockImplementation(
        (req: NextRequest, auth: AuthContext) => {
          return NextResponse.json({ 
            message: 'Success', 
            uid: auth.uid,
            authenticated: auth.isAuthenticated,
          })
        }
      )

      const wrappedHandler = withAuth(apiHandler)
      
      // Test with valid authentication
      const authenticatedRequest = createMockRequest({
        method: 'POST',
        headers: { 'x-uid': VALID_UID },
      })

      const response = await wrappedHandler(authenticatedRequest)
      expect(apiHandler).toHaveBeenCalledWith(
        authenticatedRequest,
        { uid: VALID_UID, isAuthenticated: true }
      )

      // Test with missing authentication
      const unauthenticatedRequest = createMockRequest({
        method: 'POST',
      })

      const errorResponse = await wrappedHandler(unauthenticatedRequest)
      expect(errorResponse).toBeInstanceOf(NextResponse)
    })

    it('should handle multi-source UID extraction scenario', async () => {
      // Request with invalid header but valid query param
      const request = createMockRequest({
        headers: { 'x-uid': INVALID_UID },
        query: { uid: VALID_UID },
      })

      const result = await authMiddleware(request)
      expect(result.success).toBe(true)
      expect(result.uid).toBe(VALID_UID)
    })

    it('should handle real-world API request patterns', async () => {
      // Frontend app sends UID in header
      const frontendRequest = createMockRequest({
        method: 'GET',
        headers: { 
          'x-uid': VALID_UID,
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 (Frontend App)',
        },
      })

      // Mobile app sends UID in Authorization header
      const mobileRequest = createMockRequest({
        method: 'POST',
        headers: { 
          'authorization': `Bearer ${VALID_UID}`,
          'content-type': 'application/json',
          'user-agent': 'Mobile App 1.0',
        },
        body: { data: 'test' },
      })

      // Web browser with cookie
      const browserRequest = createMockRequest({
        method: 'GET',
        cookies: { showgeki_uid: VALID_UID },
        headers: { 
          'user-agent': 'Mozilla/5.0 (Browser)',
        },
      })

      // All should extract UID successfully
      expect(await extractUid(frontendRequest)).toBe(VALID_UID)
      expect(await extractUid(mobileRequest, { headerName: 'authorization' })).toBe(VALID_UID)
      expect(await extractUid(browserRequest)).toBe(VALID_UID)
    })
  })

  // ================================================================
  // Error Handling and Edge Cases
  // ================================================================

  describe('Error Handling and Edge Cases', () => {
    it('should handle request with no headers', async () => {
      const request = {
        method: 'GET',
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
        nextUrl: {
          pathname: '/api/test',
          searchParams: new URLSearchParams(),
        },
        clone: vi.fn(),
      } as unknown as NextRequest

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })

    it('should handle malformed cookie strings gracefully', async () => {
      const request = createMockRequest({
        headers: { 
          cookie: 'malformed;;cookie==data;showgeki_uid=;invalid' 
        },
      })

      const uid = await extractUid(request)
      expect(uid).toBe(null)
    })

    it('should handle very large request bodies', async () => {
      const largeBody = {
        uid: VALID_UID,
        data: 'x'.repeat(10000), // Large data
      }

      const request = createMockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: largeBody,
      })

      const uid = await extractUid(request)
      expect(uid).toBe(VALID_UID)
    })

    it('should handle concurrent auth middleware calls', async () => {
      const request = createMockRequest({
        headers: { 'x-uid': VALID_UID },
      })

      // Simulate concurrent calls to middleware
      const promises = Array(5).fill(null).map(() => authMiddleware(request))
      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.uid).toBe(VALID_UID)
      })
    })
  })
})