import { describe, test, expect } from 'vitest'
import { 
  INSTANT_DEFAULTS, 
  getSceneCountForDuration, 
  getImageStyleConfig,
  getDefaultBgmForMood
} from '@/lib/instant/instant-defaults'

describe('instant-defaults', () => {
  describe('INSTANT_DEFAULTS', () => {
    test('should have valid duration settings with scene counts', () => {
      expect(INSTANT_DEFAULTS.duration.short.scenes).toBe(3)
      expect(INSTANT_DEFAULTS.duration.medium.scenes).toBe(5)
      expect(INSTANT_DEFAULTS.duration.long.scenes).toBe(8)
      expect(INSTANT_DEFAULTS.duration.short.maxSeconds).toBe(30)
      expect(INSTANT_DEFAULTS.duration.medium.maxSeconds).toBe(60)
      expect(INSTANT_DEFAULTS.duration.long.maxSeconds).toBe(90)
    })

    test('should have valid BGM settings', () => {
      expect(INSTANT_DEFAULTS.bgm.default.url).toBeDefined()
      expect(INSTANT_DEFAULTS.bgm.default.volume).toBeGreaterThan(0)
      expect(INSTANT_DEFAULTS.bgm.default.volume).toBeLessThanOrEqual(1)
    })

    test('should have valid caption settings', () => {
      expect(INSTANT_DEFAULTS.caption.enabled).toBe(true)
      expect(INSTANT_DEFAULTS.caption.lang).toBe('ja')
      expect(INSTANT_DEFAULTS.caption.fontSize).toBeGreaterThan(0)
      expect(INSTANT_DEFAULTS.caption.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    test('should have voice assignments for all required roles', () => {
      const voiceAssignment = INSTANT_DEFAULTS.voiceAssignment
      expect(voiceAssignment.narrator).toBeDefined()
      expect(voiceAssignment.male_protagonist).toBeDefined()
      expect(voiceAssignment.female_protagonist).toBeDefined()
      
      // OpenAI TTS voices should be valid
      const validVoices = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']
      expect(validVoices).toContain(voiceAssignment.narrator)
      expect(validVoices).toContain(voiceAssignment.male_protagonist)
      expect(validVoices).toContain(voiceAssignment.female_protagonist)
    })
  })

  describe('getSceneCountForDuration', () => {
    test('should return correct scene count for valid durations', () => {
      expect(getSceneCountForDuration('short')).toBe(3)
      expect(getSceneCountForDuration('medium')).toBe(5)
      expect(getSceneCountForDuration('long')).toBe(8)
    })

    test('should throw error for invalid duration', () => {
      expect(() => getSceneCountForDuration('invalid' as any)).toThrow('Cannot read properties of undefined')
    })
  })

  describe('getImageStyleConfig', () => {
    test('should return correct config for anime style', () => {
      const config = getImageStyleConfig('anime')
      expect(config.preset).toBe('anime')
      expect(config.prompt_suffix).toContain('anime')
      expect(config.prompt_suffix).toContain('soft pastel')
    })

    test('should return correct config for realistic style', () => {
      const config = getImageStyleConfig('realistic')
      expect(config.preset).toBe('realistic')
      expect(config.prompt_suffix).toContain('realistic')
      expect(config.prompt_suffix).toContain('photorealistic')
    })

    test('should return correct config for watercolor style', () => {
      const config = getImageStyleConfig('watercolor')
      expect(config.preset).toBe('watercolor')
      expect(config.prompt_suffix).toContain('watercolor')
      expect(config.prompt_suffix).toContain('artistic style')
    })

    test('should return undefined for invalid style', () => {
      const config = getImageStyleConfig('invalid' as any)
      expect(config).toBeUndefined()
    })
  })

  describe('getDefaultBgmForMood', () => {
    test('should have valid URLs for all moods', () => {
      const moods = ['happy', 'dramatic', 'sad', 'mysterious', 'energetic']
      
      moods.forEach(mood => {
        const url = getDefaultBgmForMood(mood)
        expect(url).toBeDefined()
        expect(typeof url).toBe('string')
        expect(url.length).toBeGreaterThan(0)
      })
    })

    test('should fallback to default BGM for invalid mood', () => {
      const defaultUrl = getDefaultBgmForMood('invalid')
      expect(defaultUrl).toBe(INSTANT_DEFAULTS.bgm.default.url)
    })

    test('should return default BGM when no mood is provided', () => {
      const url = getDefaultBgmForMood()
      expect(url).toBe(INSTANT_DEFAULTS.bgm.default.url)
    })
  })
})