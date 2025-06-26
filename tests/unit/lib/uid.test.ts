import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getOrCreateUid,
  getCurrentUid,
  clearUid,
  setUid,
  validateUid,
  getStorageInfo,
  migrateUid,
  uidManager,
} from '@/lib/uid'

// Mock the schemas module
vi.mock('@/lib/schemas', () => ({
  isValidUid: vi.fn((uid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uid);
  }),
}))

// Mock LOCAL_STORAGE_KEYS
vi.mock('@/types', () => ({
  LOCAL_STORAGE_KEYS: {
    UID: 'showgeki_uid',
    CURRENT_WORKSPACE: 'current_workspace',
    EDITOR_PREFERENCES: 'editor_preferences',
    THEME: 'theme',
  },
}))

describe('UID Management Tests', () => {
  const VALID_UUID = 'test-uuid-12345678-1234-1234-1234-123456789abc'
  const INVALID_UUID = 'invalid-uuid-format'
  const ANOTHER_VALID_UUID = 'another-12345678-1234-1234-1234-123456789abc'

  let mockLocalStorage: {
    getItem: ReturnType<typeof vi.fn>
    setItem: ReturnType<typeof vi.fn>
    removeItem: ReturnType<typeof vi.fn>
    clear: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Set up browser environment
    Object.defineProperty(global, 'window', {
      value: {
        document: {},
        location: { protocol: 'https:' },
      },
      writable: true,
    })

    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    // Mock document.cookie
    let cookieStore = ''
    Object.defineProperty(document, 'cookie', {
      get: () => cookieStore,
      set: (value: string) => {
        if (value.includes('max-age=0')) {
          // Remove cookie
          const name = value.split('=')[0]
          cookieStore = cookieStore.replace(new RegExp(`${name}=[^;]*;?\\s*`), '')
        } else {
          // Set cookie
          cookieStore = value
        }
      },
      configurable: true,
    })

    // Mock crypto.randomUUID
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: vi.fn(() => VALID_UUID),
      },
      writable: true,
    })

    // Mock console.warn
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ================================================================
  // Browser Detection Tests
  // ================================================================

  describe('Browser Environment Detection', () => {
    it('should detect browser environment correctly', () => {
      const info = getStorageInfo()
      expect(info.browser).toBe(true)
    })

    it('should detect SSR environment', () => {
      // @ts-ignore
      delete global.window
      
      const uid = getOrCreateUid()
      expect(uid).toBe('')
      
      const currentUid = getCurrentUid()
      expect(currentUid).toBe(null)
    })

    it('should handle environment without document', () => {
      // @ts-ignore
      window.document = undefined
      
      const info = getStorageInfo()
      expect(info.browser).toBe(false)
    })
  })

  // ================================================================
  // Storage Availability Tests
  // ================================================================

  describe('Storage Availability', () => {
    it('should detect localStorage availability', () => {
      const info = getStorageInfo()
      expect(info.localStorage).toBe(true)
    })

    it('should handle localStorage not available', () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      })

      const info = getStorageInfo()
      expect(info.localStorage).toBe(false)
    })

    it('should handle localStorage throwing errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const info = getStorageInfo()
      expect(info.localStorage).toBe(false)
    })

    it('should detect cookie availability', () => {
      const info = getStorageInfo()
      expect(info.cookie).toBe(true)
    })

    it('should handle cookies disabled', () => {
      Object.defineProperty(document, 'cookie', {
        get: () => '',
        set: () => {
          throw new Error('Cookies disabled')
        },
        configurable: true,
      })

      const info = getStorageInfo()
      expect(info.cookie).toBe(false)
    })
  })

  // ================================================================
  // UUID Generation Tests
  // ================================================================

  describe('UUID Generation', () => {
    it('should use crypto.randomUUID when available', () => {
      const uid = getOrCreateUid()
      expect(crypto.randomUUID).toHaveBeenCalled()
      expect(uid).toBe(VALID_UUID)
    })

    it('should fallback to manual generation when crypto unavailable', () => {
      // @ts-ignore
      global.crypto = undefined
      vi.spyOn(Math, 'random').mockReturnValue(0.5)

      const uid = getOrCreateUid()
      expect(uid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('should generate valid UUID format with fallback', () => {
      // @ts-ignore
      global.crypto = undefined

      const uid = getOrCreateUid()
      expect(validateUid(uid)).toBe(true)
    })
  })

  // ================================================================
  // LocalStorage Operations Tests
  // ================================================================

  describe('LocalStorage Operations', () => {
    it('should get UID from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(VALID_UUID)

      const uid = getCurrentUid()
      expect(uid).toBe(VALID_UUID)
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('showgeki_uid')
    })

    it('should return null for invalid UID in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(INVALID_UUID)

      const uid = getCurrentUid()
      expect(uid).toBe(null)
    })

    it('should set UID to localStorage', () => {
      const success = setUid(VALID_UUID)
      expect(success).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('showgeki_uid', VALID_UUID)
    })

    it('should handle localStorage setItem errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const success = setUid(VALID_UUID)
      expect(success).toBe(false)
    })

    it('should remove UID from localStorage', () => {
      const success = clearUid()
      expect(success).toBe(true)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('showgeki_uid')
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const uid = getCurrentUid()
      expect(uid).toBe(null)
    })
  })

  // ================================================================
  // Cookie Operations Tests
  // ================================================================

  describe('Cookie Operations', () => {
    it('should get UID from cookie', () => {
      document.cookie = 'showgeki_uid=test-cookie-12345678-1234-1234-1234-123456789abc'
      mockLocalStorage.getItem.mockReturnValue(null)

      const uid = getCurrentUid()
      expect(uid).toBe('test-cookie-12345678-1234-1234-1234-123456789abc')
    })

    it('should handle invalid UID in cookie', () => {
      document.cookie = 'showgeki_uid=invalid-format'
      mockLocalStorage.getItem.mockReturnValue(null)

      const uid = getCurrentUid()
      expect(uid).toBe(null)
    })

    it('should set UID to cookie with correct attributes', () => {
      setUid(VALID_UUID)
      expect(document.cookie).toContain(`showgeki_uid=${encodeURIComponent(VALID_UUID)}`)
      expect(document.cookie).toContain('max-age=31536000') // 1 year
      expect(document.cookie).toContain('path=/')
      expect(document.cookie).toContain('SameSite=Lax')
      expect(document.cookie).toContain('Secure')
    })

    it('should set cookie without Secure flag on HTTP', () => {
      // @ts-ignore
      window.location.protocol = 'http:'
      
      setUid(VALID_UUID)
      expect(document.cookie).not.toContain('Secure')
    })

    it('should remove UID from cookie', () => {
      document.cookie = 'showgeki_uid=some-value'
      clearUid()
      expect(document.cookie).not.toContain('showgeki_uid=some-value')
    })

    it('should handle URL encoding in cookies', () => {
      const uidWithSpecialChars = 'test-uuid+special%chars'
      setUid(uidWithSpecialChars)
      expect(document.cookie).toContain(encodeURIComponent(uidWithSpecialChars))
    })
  })

  // ================================================================
  // Main UID Management Function Tests
  // ================================================================

  describe('getOrCreateUid', () => {
    it('should return existing UID from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(VALID_UUID)

      const uid = getOrCreateUid()
      expect(uid).toBe(VALID_UUID)
      expect(crypto.randomUUID).not.toHaveBeenCalled()
    })

    it('should return existing UID from cookie when localStorage empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      document.cookie = `showgeki_uid=${ANOTHER_VALID_UUID}`

      const uid = getOrCreateUid()
      expect(uid).toBe(ANOTHER_VALID_UUID)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('showgeki_uid', ANOTHER_VALID_UUID)
    })

    it('should create new UID when none exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      document.cookie = ''

      const uid = getOrCreateUid()
      expect(uid).toBe(VALID_UUID)
      expect(crypto.randomUUID).toHaveBeenCalled()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('showgeki_uid', VALID_UUID)
    })

    it('should warn when both storage methods fail', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      Object.defineProperty(document, 'cookie', {
        set: () => {
          throw new Error('Cookie error')
        },
        configurable: true,
      })

      const uid = getOrCreateUid()
      expect(uid).toBe(VALID_UUID)
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to persist UID. User will get a new UID on next visit.'
      )
    })

    it('should return empty string in SSR environment', () => {
      // @ts-ignore
      delete global.window

      const uid = getOrCreateUid()
      expect(uid).toBe('')
    })
  })

  describe('getCurrentUid', () => {
    it('should return null when no UID exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      document.cookie = ''

      const uid = getCurrentUid()
      expect(uid).toBe(null)
    })

    it('should return null for invalid stored UID', () => {
      mockLocalStorage.getItem.mockReturnValue(INVALID_UUID)

      const uid = getCurrentUid()
      expect(uid).toBe(null)
    })

    it('should return null in SSR environment', () => {
      // @ts-ignore
      delete global.window

      const uid = getCurrentUid()
      expect(uid).toBe(null)
    })

    it('should prioritize localStorage over cookie', () => {
      mockLocalStorage.getItem.mockReturnValue(VALID_UUID)
      document.cookie = `showgeki_uid=${ANOTHER_VALID_UUID}`

      const uid = getCurrentUid()
      expect(uid).toBe(VALID_UUID)
    })
  })

  describe('setUid', () => {
    it('should set valid UID successfully', () => {
      const success = setUid(VALID_UUID)
      expect(success).toBe(true)
    })

    it('should reject invalid UID', () => {
      const success = setUid(INVALID_UUID)
      expect(success).toBe(false)
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })

    it('should return false in SSR environment', () => {
      // @ts-ignore
      delete global.window

      const success = setUid(VALID_UUID)
      expect(success).toBe(false)
    })

    it('should succeed if at least one storage method works', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const success = setUid(VALID_UUID)
      expect(success).toBe(true) // Cookie storage should work
    })

    it('should fail if both storage methods fail', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      Object.defineProperty(document, 'cookie', {
        set: () => {
          throw new Error('Cookie error')
        },
        configurable: true,
      })

      const success = setUid(VALID_UUID)
      expect(success).toBe(false)
    })
  })

  describe('clearUid', () => {
    it('should clear UID from both storages', () => {
      const success = clearUid()
      expect(success).toBe(true)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('showgeki_uid')
    })

    it('should return false in SSR environment', () => {
      // @ts-ignore
      delete global.window

      const success = clearUid()
      expect(success).toBe(false)
    })

    it('should succeed if at least one removal works', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const success = clearUid()
      expect(success).toBe(true) // Cookie removal should work
    })
  })

  describe('validateUid', () => {
    it('should validate correct UUID format', () => {
      expect(validateUid(VALID_UUID)).toBe(true)
    })

    it('should reject invalid UUID format', () => {
      expect(validateUid(INVALID_UUID)).toBe(false)
      expect(validateUid('')).toBe(false)
      expect(validateUid('123')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(validateUid('123E4567-E89B-12D3-A456-426614174000')).toBe(true) // uppercase
      expect(validateUid('12345678-1234-1234-1234')).toBe(false) // too short
    })
  })

  // ================================================================
  // Advanced Feature Tests
  // ================================================================

  describe('getStorageInfo', () => {
    it('should return comprehensive storage information', () => {
      mockLocalStorage.getItem.mockReturnValue(VALID_UUID)

      const info = getStorageInfo()
      expect(info).toEqual({
        browser: true,
        localStorage: true,
        cookie: true,
        currentUid: VALID_UUID,
      })
    })

    it('should detect unavailable storage methods', () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      })

      const info = getStorageInfo()
      expect(info.localStorage).toBe(false)
      expect(info.browser).toBe(true)
    })

    it('should handle SSR environment', () => {
      // @ts-ignore
      delete global.window

      const info = getStorageInfo()
      expect(info).toEqual({
        browser: false,
        localStorage: false,
        cookie: false,
        currentUid: null,
      })
    })
  })

  describe('migrateUid', () => {
    it('should sync localStorage to cookie when different', () => {
      mockLocalStorage.getItem.mockReturnValue(VALID_UUID)
      document.cookie = `showgeki_uid=${ANOTHER_VALID_UUID}`

      const migrated = migrateUid()
      expect(migrated).toBe(true)
      expect(document.cookie).toContain(VALID_UUID)
    })

    it('should copy localStorage to cookie when cookie missing', () => {
      mockLocalStorage.getItem.mockReturnValue(VALID_UUID)
      document.cookie = ''

      const migrated = migrateUid()
      expect(migrated).toBe(true)
      expect(document.cookie).toContain(VALID_UUID)
    })

    it('should copy cookie to localStorage when localStorage missing', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      document.cookie = `showgeki_uid=${VALID_UUID}`

      const migrated = migrateUid()
      expect(migrated).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('showgeki_uid', VALID_UUID)
    })

    it('should not migrate when UIDs are the same', () => {
      mockLocalStorage.getItem.mockReturnValue(VALID_UUID)
      document.cookie = `showgeki_uid=${VALID_UUID}`

      const migrated = migrateUid()
      expect(migrated).toBe(false)
    })

    it('should not migrate when both are empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      document.cookie = ''

      const migrated = migrateUid()
      expect(migrated).toBe(false)
    })

    it('should return false in SSR environment', () => {
      // @ts-ignore
      delete global.window

      const migrated = migrateUid()
      expect(migrated).toBe(false)
    })
  })

  // ================================================================
  // uidManager Object Tests
  // ================================================================

  describe('uidManager', () => {
    it('should expose all expected methods', () => {
      expect(uidManager).toHaveProperty('getOrCreate')
      expect(uidManager).toHaveProperty('getCurrent')
      expect(uidManager).toHaveProperty('clear')
      expect(uidManager).toHaveProperty('set')
      expect(uidManager).toHaveProperty('validate')
      expect(uidManager).toHaveProperty('getStorageInfo')
      expect(uidManager).toHaveProperty('migrate')
    })

    it('should have all methods as functions', () => {
      expect(typeof uidManager.getOrCreate).toBe('function')
      expect(typeof uidManager.getCurrent).toBe('function')
      expect(typeof uidManager.clear).toBe('function')
      expect(typeof uidManager.set).toBe('function')
      expect(typeof uidManager.validate).toBe('function')
      expect(typeof uidManager.getStorageInfo).toBe('function')
      expect(typeof uidManager.migrate).toBe('function')
    })

    it('should work through uidManager interface', () => {
      mockLocalStorage.getItem.mockReturnValue(VALID_UUID)

      expect(uidManager.getCurrent()).toBe(VALID_UUID)
      expect(uidManager.validate(VALID_UUID)).toBe(true)
      expect(uidManager.validate(INVALID_UUID)).toBe(false)
    })
  })

  // ================================================================
  // Integration Tests
  // ================================================================

  describe('Integration Scenarios', () => {
    it('should handle complete user journey', () => {
      // 1. New user - no existing UID
      mockLocalStorage.getItem.mockReturnValue(null)
      document.cookie = ''

      const newUid = getOrCreateUid()
      expect(newUid).toBe(VALID_UUID)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('showgeki_uid', VALID_UUID)

      // 2. Returning user - UID exists in localStorage
      mockLocalStorage.getItem.mockReturnValue(VALID_UUID)
      const existingUid = getCurrentUid()
      expect(existingUid).toBe(VALID_UUID)

      // 3. User clears data
      const cleared = clearUid()
      expect(cleared).toBe(true)

      // 4. Verify UID is gone
      mockLocalStorage.getItem.mockReturnValue(null)
      document.cookie = ''
      const noUid = getCurrentUid()
      expect(noUid).toBe(null)
    })

    it('should handle storage fallbacks gracefully', () => {
      // LocalStorage fails, but cookie works
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const uid = getOrCreateUid()
      expect(uid).toBe(VALID_UUID)
      expect(document.cookie).toContain(VALID_UUID)
    })

    it('should handle migration scenarios', () => {
      // User has cookie but no localStorage (e.g., cleared localStorage)
      mockLocalStorage.getItem.mockReturnValue(null)
      document.cookie = `showgeki_uid=${VALID_UUID}`

      const uid = getOrCreateUid()
      expect(uid).toBe(VALID_UUID)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('showgeki_uid', VALID_UUID)
    })

    it('should handle corrupted data gracefully', () => {
      // Invalid UID in localStorage
      mockLocalStorage.getItem.mockReturnValue(INVALID_UUID)
      document.cookie = ''

      const uid = getOrCreateUid()
      expect(uid).toBe(VALID_UUID) // Should generate new UID
      expect(crypto.randomUUID).toHaveBeenCalled()
    })
  })

  // ================================================================
  // Error Handling Tests
  // ================================================================

  describe('Error Handling', () => {
    it('should handle localStorage quota exceeded', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError')
      })

      const success = setUid(VALID_UUID)
      expect(success).toBe(true) // Should still work via cookies
    })

    it('should handle cookie security errors', () => {
      Object.defineProperty(document, 'cookie', {
        get: () => '',
        set: () => {
          throw new Error('Security error')
        },
        configurable: true,
      })

      const success = setUid(VALID_UUID)
      expect(success).toBe(true) // Should still work via localStorage
    })

    it('should handle malformed cookie data', () => {
      document.cookie = 'showgeki_uid=malformed%data%'
      mockLocalStorage.getItem.mockReturnValue(null)

      const uid = getCurrentUid()
      expect(uid).toBe(null) // Should reject malformed data
    })

    it('should handle partial storage failures gracefully', () => {
      let localStorage_calls = 0
      mockLocalStorage.setItem.mockImplementation(() => {
        localStorage_calls++
        if (localStorage_calls > 1) {
          throw new Error('Storage error')
        }
      })

      // First call should succeed
      expect(setUid(VALID_UUID)).toBe(true)
      
      // Second call should still succeed via cookie fallback
      expect(setUid(ANOTHER_VALID_UUID)).toBe(true)
    })
  })
})