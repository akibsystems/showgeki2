import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getWorkspaces, POST as createWorkspace } from '@/app/api/workspaces/route'
import { ErrorType } from '@/types'
import { createMockSupabaseClient, mockStore, setGlobalError, clearGlobalError } from '../../helpers/supabase-mock'
import {
  VALID_UID,
  WORKSPACE_ID,
  MOCK_WORKSPACE,
  createMockWorkspace,
} from '../../fixtures/test-data'

// Mock external dependencies
const mockSupabaseClient = createMockSupabaseClient()

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient),
  SupabaseError: class SupabaseError extends Error {
    constructor(message: string, public code?: string, public details?: any) {
      super(message)
      this.name = 'SupabaseError'
    }
  },
}))

// Mock auth module
vi.mock('@/lib/auth', () => ({
  withAuth: vi.fn((handler) => async (request: NextRequest, context?: any) => {
    const authContext = {
      uid: VALID_UID,
      isAuthenticated: true,
    }
    return handler(request, authContext, context)
  }),
}))

describe('Workspaces API Integration Tests', () => {

  function createMockRequest(options: {
    method?: string
    url?: string
    body?: any
    searchParams?: Record<string, string>
  } = {}): NextRequest {
    const { method = 'GET', url = '/api/workspaces', body, searchParams = {} } = options

    const fullUrl = new URL(url, 'https://test.com')
    Object.entries(searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value)
    })

    const mockRequest = {
      method,
      nextUrl: {
        pathname: fullUrl.pathname,
        searchParams: fullUrl.searchParams,
      },
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest

    return mockRequest
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store
    mockStore.reset()
    
    // Set up initial test data
    mockStore.setData('workspaces', [MOCK_WORKSPACE])
    mockStore.setData('stories', [])
    mockStore.setData('videos', [])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearGlobalError()
  })

  // ================================================================
  // GET /api/workspaces - Workspace List Tests
  // ================================================================

  describe('GET /api/workspaces', () => {

    it('should get workspaces successfully', async () => {
      const request = createMockRequest()
      const response = await getWorkspaces(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.total).toBe(1)
      expect(data.data[0]).toMatchObject({
        id: WORKSPACE_ID,
        uid: VALID_UID,
        name: 'Test Workspace',
      })
      expect(data.timestamp).toBeDefined()
    })

    it('should return empty list when no workspaces exist', async () => {
      // Clear all workspaces
      mockStore.setData('workspaces', [])

      const request = createMockRequest()
      const response = await getWorkspaces(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(0)
      expect(data.total).toBe(0)
    })

    it('should return multiple workspaces ordered by created_at', async () => {
      const workspace1 = createMockWorkspace({
        name: 'First Workspace',
        created_at: '2024-01-01T10:00:00.000Z'
      })
      const workspace2 = createMockWorkspace({
        name: 'Second Workspace', 
        created_at: '2024-01-01T12:00:00.000Z'
      })
      const workspace3 = createMockWorkspace({
        name: 'Third Workspace',
        created_at: '2024-01-01T11:00:00.000Z'
      })

      mockStore.setData('workspaces', [workspace1, workspace2, workspace3])

      const request = createMockRequest()
      const response = await getWorkspaces(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(3)
      expect(data.total).toBe(3)
      
      // Should be ordered by created_at descending (newest first)
      expect(data.data[0].name).toBe('Second Workspace')
      expect(data.data[1].name).toBe('Third Workspace')
      expect(data.data[2].name).toBe('First Workspace')
    })

    it('should handle database errors', async () => {
      setGlobalError('DATABASE_CONNECTION', 'workspaces')

      const request = createMockRequest()
      const response = await getWorkspaces(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch workspaces')
      expect(data.type).toBe(ErrorType.INTERNAL)
      expect(data.timestamp).toBeDefined()
    })

    it('should handle timeout errors', async () => {
      setGlobalError('TIMEOUT', 'workspaces')

      const request = createMockRequest()
      const response = await getWorkspaces(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch workspaces')
      expect(data.type).toBe(ErrorType.INTERNAL)
    })

    it('should validate workspace data and fallback to raw data on validation failure', async () => {
      // Create workspace with potentially invalid data
      const invalidWorkspace = createMockWorkspace({
        name: '', // Empty name might fail validation
      })
      mockStore.setData('workspaces', [invalidWorkspace])

      const request = createMockRequest()
      const response = await getWorkspaces(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      // Should return raw data even if validation fails
      expect(data.data[0].id).toBe(invalidWorkspace.id)
    })
  })

  // ================================================================
  // POST /api/workspaces - Workspace Creation Tests
  // ================================================================

  describe('POST /api/workspaces', () => {
    const validCreateData = {
      name: 'New Test Workspace',
    }

    it('should create workspace successfully', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: validCreateData,
      })
      const response = await createWorkspace(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe(validCreateData.name)
      expect(data.data.uid).toBe(VALID_UID)
      expect(data.data.id).toBeDefined()
      expect(data.timestamp).toBeDefined()

      // Verify workspace was added to mock store
      const workspaces = mockStore.getData('workspaces')
      expect(workspaces.find(w => w.name === validCreateData.name)).toBeDefined()
    })

    it('should trim workspace name', async () => {
      const dataWithSpaces = {
        name: '  Workspace with Spaces  ',
      }

      const request = createMockRequest({
        method: 'POST',
        body: dataWithSpaces,
      })
      const response = await createWorkspace(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('Workspace with Spaces')
    })

    it('should validate request data', async () => {
      const invalidData = {
        name: '', // Empty name
      }

      const request = createMockRequest({
        method: 'POST',
        body: invalidData,
      })
      const response = await createWorkspace(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.type).toBe(ErrorType.VALIDATION)
      expect(data.details).toBeDefined()
    })

    it('should reject request with missing name field', async () => {
      const invalidData = {}

      const request = createMockRequest({
        method: 'POST',
        body: invalidData,
      })
      const response = await createWorkspace(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.type).toBe(ErrorType.VALIDATION)
    })

    it('should reject request with invalid data types', async () => {
      const invalidData = {
        name: 123, // Number instead of string
      }

      const request = createMockRequest({
        method: 'POST',
        body: invalidData,
      })
      const response = await createWorkspace(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.type).toBe(ErrorType.VALIDATION)
    })

    it('should handle duplicate workspace name error', async () => {
      // Create workspace with same name as MOCK_WORKSPACE
      const duplicateData = {
        name: MOCK_WORKSPACE.name,
      }

      const request = createMockRequest({
        method: 'POST',
        body: duplicateData,
      })
      const response = await createWorkspace(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('A workspace with this name already exists')
      expect(data.type).toBe(ErrorType.VALIDATION)
    })

    it('should handle database insertion errors', async () => {
      setGlobalError('PERMISSION_DENIED', 'workspaces', 'insert')

      const request = createMockRequest({
        method: 'POST',
        body: validCreateData,
      })
      const response = await createWorkspace(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create workspace')
      expect(data.type).toBe(ErrorType.INTERNAL)
    })

    it('should handle JSON parsing errors', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: validCreateData,
      })
      request.json = vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON'))

      const response = await createWorkspace(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
      expect(data.type).toBe(ErrorType.VALIDATION)
    })

    it('should handle unexpected server errors', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: validCreateData,
      })
      request.json = vi.fn().mockRejectedValue(new Error('Unexpected error'))

      const response = await createWorkspace(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.type).toBe(ErrorType.INTERNAL)
    })
  })

  // ================================================================
  // Integration Workflow Tests
  // ================================================================

  describe('Complete Workflow Integration', () => {
    it('should handle complete workspace lifecycle', async () => {
      // 1. Get initial workspaces list
      const listRequest1 = createMockRequest()
      const listResponse1 = await getWorkspaces(listRequest1)
      const data1 = await listResponse1.json()
      
      expect(listResponse1.status).toBe(200)
      expect(data1.data).toHaveLength(1) // Initial MOCK_WORKSPACE

      // 2. Create new workspace
      const createRequest = createMockRequest({
        method: 'POST',
        body: { name: 'Integration Test Workspace' },
      })
      const createResponse = await createWorkspace(createRequest)
      const createData = await createResponse.json()
      
      expect(createResponse.status).toBe(201)
      expect(createData.data.name).toBe('Integration Test Workspace')

      // 3. Get updated workspaces list
      const listRequest2 = createMockRequest()
      const listResponse2 = await getWorkspaces(listRequest2)
      const data2 = await listResponse2.json()
      
      expect(listResponse2.status).toBe(200)
      expect(data2.data).toHaveLength(2) // Original + new workspace
      expect(data2.data.some((w: any) => w.name === 'Integration Test Workspace')).toBe(true)
    })

    it('should handle error propagation through workflow', async () => {
      setGlobalError('DATABASE_CONNECTION')

      const request = createMockRequest()
      const response = await getWorkspaces(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch workspaces')
      expect(data.type).toBe(ErrorType.INTERNAL)
    })

    it('should maintain data consistency across operations', async () => {
      const workspace1Data = { name: 'Workspace 1' }
      const workspace2Data = { name: 'Workspace 2' }

      // Create first workspace
      const create1 = createMockRequest({
        method: 'POST',
        body: workspace1Data,
      })
      const response1 = await createWorkspace(create1)
      expect(response1.status).toBe(201)

      // Create second workspace
      const create2 = createMockRequest({
        method: 'POST',
        body: workspace2Data,
      })
      const response2 = await createWorkspace(create2)
      expect(response2.status).toBe(201)

      // Verify both workspaces exist in final list
      const listRequest = createMockRequest()
      const listResponse = await getWorkspaces(listRequest)
      const listData = await listResponse.json()

      expect(listResponse.status).toBe(200)
      expect(listData.data).toHaveLength(3) // Original + 2 new
      expect(listData.data.some((w: any) => w.name === 'Workspace 1')).toBe(true)
      expect(listData.data.some((w: any) => w.name === 'Workspace 2')).toBe(true)
      expect(listData.data.some((w: any) => w.name === 'Test Workspace')).toBe(true)
    })
  })
})