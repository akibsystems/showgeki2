import { describe, it, expect } from 'vitest'
import {
  // Core Schemas
  UidSchema,
  WorkspaceSchema,
  StorySchema,
  VideoSchema,
  ReviewSchema,
  StoryStatusSchema,
  VideoStatusSchema,
  MulmoscriptSchema,
  SceneSchema,
  
  // API Schemas
  CreateWorkspaceRequestSchema,
  CreateStoryRequestSchema,
  UpdateStoryRequestSchema,
  GenerateScriptResponseSchema,
  GenerateVideoResponseSchema,
  VideoStatusResponseSchema,
  StoriesListResponseSchema,
  ApiErrorResponseSchema,
  ValidationErrorSchema,
  
  // Utility Functions
  validateSchema,
  isValidUid,
} from '@/lib/schemas'

describe('Schemas Validation Tests', () => {
  
  // ================================================================
  // Core Schemas
  // ================================================================
  
  describe('UidSchema', () => {
    it('validates correct UUID format', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      expect(UidSchema.parse(validUuid)).toBe(validUuid)
    })

    it('validates UUID with different cases', () => {
      const upperCaseUuid = '123E4567-E89B-12D3-A456-426614174000'
      expect(UidSchema.parse(upperCaseUuid)).toBe(upperCaseUuid)
    })

    it('rejects invalid UUID format', () => {
      expect(() => UidSchema.parse('invalid-uuid')).toThrow()
      expect(() => UidSchema.parse('123')).toThrow()
      expect(() => UidSchema.parse('')).toThrow()
      expect(() => UidSchema.parse('12345678-1234-1234-1234')).toThrow() // too short
    })

    it('rejects null and undefined', () => {
      expect(() => UidSchema.parse(null)).toThrow()
      expect(() => UidSchema.parse(undefined)).toThrow()
    })

    it('rejects non-string values', () => {
      expect(() => UidSchema.parse(123)).toThrow()
      expect(() => UidSchema.parse({})).toThrow()
      expect(() => UidSchema.parse([])).toThrow()
    })
  })

  describe('WorkspaceSchema', () => {
    const validWorkspace = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      uid: '987fcdeb-51a2-43d1-9f12-345678901234',
      name: 'Test Workspace',
      created_at: '2024-01-01T00:00:00.000Z',
    }

    it('validates complete workspace object', () => {
      expect(WorkspaceSchema.parse(validWorkspace)).toEqual(validWorkspace)
    })

    it('validates workspace with minimum name length', () => {
      const workspace = { ...validWorkspace, name: 'A' }
      expect(WorkspaceSchema.parse(workspace)).toEqual(workspace)
    })

    it('validates workspace with maximum name length', () => {
      const workspace = { ...validWorkspace, name: 'A'.repeat(255) }
      expect(WorkspaceSchema.parse(workspace)).toEqual(workspace)
    })

    it('rejects workspace with empty name', () => {
      const workspace = { ...validWorkspace, name: '' }
      expect(() => WorkspaceSchema.parse(workspace)).toThrow('Name is required')
    })

    it('rejects workspace with name too long', () => {
      const workspace = { ...validWorkspace, name: 'A'.repeat(256) }
      expect(() => WorkspaceSchema.parse(workspace)).toThrow('Name is too long')
    })

    it('rejects workspace with invalid UUID fields', () => {
      expect(() => WorkspaceSchema.parse({ ...validWorkspace, id: 'invalid' })).toThrow()
      expect(() => WorkspaceSchema.parse({ ...validWorkspace, uid: 'invalid' })).toThrow()
    })

    it('rejects workspace with missing required fields', () => {
      expect(() => WorkspaceSchema.parse({})).toThrow()
      expect(() => WorkspaceSchema.parse({ id: validWorkspace.id })).toThrow()
    })

    it('rejects workspace with invalid datetime', () => {
      const workspace = { ...validWorkspace, created_at: 'invalid-date' }
      expect(() => WorkspaceSchema.parse(workspace)).toThrow()
    })
  })

  describe('StoryStatusSchema', () => {
    const validStatuses = ['draft', 'script_generated', 'processing', 'completed', 'error']

    it('validates all valid story statuses', () => {
      validStatuses.forEach(status => {
        expect(StoryStatusSchema.parse(status)).toBe(status)
      })
    })

    it('rejects invalid story status', () => {
      expect(() => StoryStatusSchema.parse('invalid_status')).toThrow('Invalid story status')
      expect(() => StoryStatusSchema.parse('')).toThrow()
      expect(() => StoryStatusSchema.parse(123)).toThrow()
    })
  })

  describe('StorySchema', () => {
    const validStory = {
      id: 'ABCD1234',
      workspace_id: '123e4567-e89b-12d3-a456-426614174000',
      uid: '987fcdeb-51a2-43d1-9f12-345678901234',
      title: 'Test Story',
      text_raw: 'This is a test story content.',
      script_json: { scenes: [] },
      status: 'draft',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }

    it('validates complete story object', () => {
      expect(StorySchema.parse(validStory)).toEqual(validStory)
    })

    it('validates story without optional script_json', () => {
      const { script_json, ...storyWithoutScript } = validStory
      expect(StorySchema.parse(storyWithoutScript)).toEqual(storyWithoutScript)
    })

    it('validates story with null script_json', () => {
      const story = { ...validStory, script_json: undefined }
      expect(StorySchema.parse(story)).toEqual(story)
    })

    it('rejects story with invalid ID length', () => {
      expect(() => StorySchema.parse({ ...validStory, id: 'SHORT' })).toThrow('Story ID must be 8 characters')
      expect(() => StorySchema.parse({ ...validStory, id: 'TOOLONG123' })).toThrow('Story ID must be 8 characters')
    })

    it('rejects story with empty title', () => {
      expect(() => StorySchema.parse({ ...validStory, title: '' })).toThrow('Title is required')
    })

    it('rejects story with title too long', () => {
      const story = { ...validStory, title: 'A'.repeat(256) }
      expect(() => StorySchema.parse(story)).toThrow('Title is too long')
    })

    it('rejects story with empty text_raw', () => {
      expect(() => StorySchema.parse({ ...validStory, text_raw: '' })).toThrow('Story text is required')
    })

    it('rejects story with invalid status', () => {
      expect(() => StorySchema.parse({ ...validStory, status: 'invalid' })).toThrow()
    })

    it('rejects story with invalid workspace_id', () => {
      expect(() => StorySchema.parse({ ...validStory, workspace_id: 'invalid' })).toThrow()
    })
  })

  describe('VideoStatusSchema', () => {
    const validStatuses = ['queued', 'processing', 'completed', 'failed']

    it('validates all valid video statuses', () => {
      validStatuses.forEach(status => {
        expect(VideoStatusSchema.parse(status)).toBe(status)
      })
    })

    it('rejects invalid video status', () => {
      expect(() => VideoStatusSchema.parse('invalid_status')).toThrow('Invalid video status')
      expect(() => VideoStatusSchema.parse('')).toThrow()
      expect(() => VideoStatusSchema.parse(null)).toThrow()
    })
  })

  describe('VideoSchema', () => {
    const validVideo = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: 'ABCD1234',
      uid: '987fcdeb-51a2-43d1-9f12-345678901234',
      url: 'https://example.com/video.mp4',
      duration_sec: 30,
      resolution: '1920x1080',
      size_mb: 10.5,
      status: 'completed',
      error_msg: undefined,
      created_at: '2024-01-01T00:00:00.000Z',
    }

    it('validates complete video object', () => {
      expect(VideoSchema.parse(validVideo)).toEqual(validVideo)
    })

    it('validates video with minimal required fields', () => {
      const minimalVideo = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        story_id: 'ABCD1234',
        uid: '987fcdeb-51a2-43d1-9f12-345678901234',
        status: 'queued',
        created_at: '2024-01-01T00:00:00.000Z',
      }
      expect(VideoSchema.parse(minimalVideo)).toEqual(minimalVideo)
    })

    it('rejects video with invalid URL', () => {
      expect(() => VideoSchema.parse({ ...validVideo, url: 'invalid-url' })).toThrow()
    })

    it('rejects video with negative duration', () => {
      expect(() => VideoSchema.parse({ ...validVideo, duration_sec: -1 })).toThrow()
      expect(() => VideoSchema.parse({ ...validVideo, duration_sec: 0 })).toThrow()
    })

    it('rejects video with non-integer duration', () => {
      expect(() => VideoSchema.parse({ ...validVideo, duration_sec: 30.5 })).toThrow()
    })

    it('rejects video with negative size', () => {
      expect(() => VideoSchema.parse({ ...validVideo, size_mb: -1 })).toThrow()
      expect(() => VideoSchema.parse({ ...validVideo, size_mb: 0 })).toThrow()
    })

    it('rejects video with invalid status', () => {
      expect(() => VideoSchema.parse({ ...validVideo, status: 'invalid' })).toThrow()
    })
  })

  describe('ReviewSchema', () => {
    const validReview = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: 'ABCD1234',
      review_text: 'This is a great story!',
      rating: 5,
      created_at: '2024-01-01T00:00:00.000Z',
    }

    it('validates complete review object', () => {
      expect(ReviewSchema.parse(validReview)).toEqual(validReview)
    })

    it('validates review with minimum rating', () => {
      const review = { ...validReview, rating: 1 }
      expect(ReviewSchema.parse(review)).toEqual(review)
    })

    it('validates review with maximum rating', () => {
      const review = { ...validReview, rating: 5 }
      expect(ReviewSchema.parse(review)).toEqual(review)
    })

    it('rejects review with rating below minimum', () => {
      expect(() => ReviewSchema.parse({ ...validReview, rating: 0 })).toThrow()
    })

    it('rejects review with rating above maximum', () => {
      expect(() => ReviewSchema.parse({ ...validReview, rating: 6 })).toThrow()
    })

    it('rejects review with non-integer rating', () => {
      expect(() => ReviewSchema.parse({ ...validReview, rating: 4.5 })).toThrow()
    })

    it('rejects review with empty text', () => {
      expect(() => ReviewSchema.parse({ ...validReview, review_text: '' })).toThrow()
    })
  })

  describe('SceneSchema', () => {
    const validScene = {
      id: 'scene1',
      type: 'dialogue',
      content: 'Hello, world!',
      duration: 5.5,
      voice: {
        character: 'Alice',
        emotion: 'happy',
      },
    }

    it('validates complete scene object', () => {
      expect(SceneSchema.parse(validScene)).toEqual(validScene)
    })

    it('validates scene without optional voice', () => {
      const { voice, ...sceneWithoutVoice } = validScene
      expect(SceneSchema.parse(sceneWithoutVoice)).toEqual(sceneWithoutVoice)
    })

    it('validates all scene types', () => {
      const types = ['dialogue', 'narration', 'action']
      types.forEach(type => {
        const scene = { ...validScene, type }
        expect(SceneSchema.parse(scene)).toEqual(scene)
      })
    })

    it('rejects scene with invalid type', () => {
      expect(() => SceneSchema.parse({ ...validScene, type: 'invalid' })).toThrow()
    })

    it('rejects scene with empty content', () => {
      expect(() => SceneSchema.parse({ ...validScene, content: '' })).toThrow()
    })

    it('rejects scene with negative duration', () => {
      expect(() => SceneSchema.parse({ ...validScene, duration: -1 })).toThrow()
      expect(() => SceneSchema.parse({ ...validScene, duration: 0 })).toThrow()
    })
  })

  describe('MulmoscriptSchema', () => {
    const validMulmoscript = {
      $mulmocast: {
        version: '1.0'
      },
      title: 'Test Script',
      lang: 'en',
      speechParams: {
        provider: 'openai' as const,
        speakers: {
          Presenter: { voiceId: 'alloy' }
        }
      },
      beats: [
        {
          speaker: 'Presenter',
          text: 'Hello, world!',
          duration: 5.5,
        },
      ],
    }

    it('validates complete mulmoscript object', () => {
      expect(MulmoscriptSchema.parse(validMulmoscript)).toEqual(validMulmoscript)
    })

    it('validates mulmoscript with multiple beats', () => {
      const script = {
        ...validMulmoscript,
        beats: [
          ...validMulmoscript.beats,
          {
            speaker: 'Narrator',
            text: 'Meanwhile...',
            duration: 3.0,
          },
        ],
      }
      expect(MulmoscriptSchema.parse(script)).toEqual(script)
    })

    it('validates mulmoscript without title', () => {
      const { title, ...scriptWithoutTitle } = validMulmoscript
      expect(MulmoscriptSchema.parse(scriptWithoutTitle)).toEqual(scriptWithoutTitle)
    })

    it('rejects mulmoscript with empty beats array', () => {
      expect(() => MulmoscriptSchema.parse({ ...validMulmoscript, beats: [] })).toThrow()
    })

    it('rejects mulmoscript with invalid speechParams', () => {
      const invalidSpeechParams = { ...validMulmoscript, speechParams: { provider: 'invalid' } }
      expect(() => MulmoscriptSchema.parse(invalidSpeechParams)).toThrow()
    })
  })

  // ================================================================
  // API Request/Response Schemas
  // ================================================================

  describe('CreateWorkspaceRequestSchema', () => {
    it('validates valid workspace creation request', () => {
      const request = { name: 'New Workspace' }
      expect(CreateWorkspaceRequestSchema.parse(request)).toEqual(request)
    })

    it('rejects request with empty name', () => {
      expect(() => CreateWorkspaceRequestSchema.parse({ name: '' })).toThrow()
    })

    it('rejects request with name too long', () => {
      const request = { name: 'A'.repeat(256) }
      expect(() => CreateWorkspaceRequestSchema.parse(request)).toThrow()
    })
  })

  describe('CreateStoryRequestSchema', () => {
    const validRequest = {
      workspace_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'New Story',
      text_raw: 'Story content',
    }

    it('validates valid story creation request', () => {
      expect(CreateStoryRequestSchema.parse(validRequest)).toEqual(validRequest)
    })

    it('rejects request with invalid workspace_id', () => {
      expect(() => CreateStoryRequestSchema.parse({ ...validRequest, workspace_id: 'invalid' })).toThrow()
    })

    it('rejects request with empty title', () => {
      expect(() => CreateStoryRequestSchema.parse({ ...validRequest, title: '' })).toThrow()
    })

    it('rejects request with empty text_raw', () => {
      expect(() => CreateStoryRequestSchema.parse({ ...validRequest, text_raw: '' })).toThrow()
    })
  })

  describe('GenerateVideoResponseSchema', () => {
    const validResponse = {
      video_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'queued',
    }

    it('validates valid video generation response', () => {
      expect(GenerateVideoResponseSchema.parse(validResponse)).toEqual(validResponse)
    })

    it('rejects response with invalid video_id', () => {
      expect(() => GenerateVideoResponseSchema.parse({ ...validResponse, video_id: 'invalid' })).toThrow()
    })

    it('rejects response with invalid status', () => {
      expect(() => GenerateVideoResponseSchema.parse({ ...validResponse, status: 'invalid' })).toThrow()
    })
  })

  describe('VideoStatusResponseSchema', () => {
    it('validates complete video status response', () => {
      const response = {
        status: 'completed',
        progress: 100,
        url: 'https://example.com/video.mp4',
        error_msg: undefined,
      }
      expect(VideoStatusResponseSchema.parse(response)).toEqual(response)
    })

    it('validates minimal video status response', () => {
      const response = { status: 'processing' }
      expect(VideoStatusResponseSchema.parse(response)).toEqual(response)
    })

    it('rejects response with invalid progress', () => {
      const response = { status: 'processing', progress: 150 }
      expect(() => VideoStatusResponseSchema.parse(response)).toThrow()
    })

    it('rejects response with negative progress', () => {
      const response = { status: 'processing', progress: -10 }
      expect(() => VideoStatusResponseSchema.parse(response)).toThrow()
    })
  })

  // ================================================================
  // Utility Functions
  // ================================================================

  describe('validateSchema function', () => {
    it('returns success for valid data', () => {
      const data = { name: 'Test Workspace' }
      const result = validateSchema(CreateWorkspaceRequestSchema, data)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(data)
      expect(result.errors).toBeUndefined()
    })

    it('returns errors for invalid data', () => {
      const data = { name: '' }
      const result = validateSchema(CreateWorkspaceRequestSchema, data)
      
      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.errors).toBeDefined()
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].field).toBe('name')
      expect(result.errors![0].message).toContain('String must contain at least 1 character(s)')
    })

    it('handles nested validation errors', () => {
      const data = {
        title: 'Test',
        scenes: [],
        metadata: { duration_total: -1, resolution: '', fps: 0 }
      }
      const result = validateSchema(MulmoscriptSchema, data)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(1)
    })
  })

  describe('isValidUid function', () => {
    it('returns true for valid UUID', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      expect(isValidUid(validUuid)).toBe(true)
    })

    it('returns false for invalid UUID', () => {
      expect(isValidUid('invalid-uuid')).toBe(false)
      expect(isValidUid('')).toBe(false)
      expect(isValidUid('123')).toBe(false)
    })

    it('handles edge cases', () => {
      expect(isValidUid('123E4567-E89B-12D3-A456-426614174000')).toBe(true) // uppercase
      expect(isValidUid('12345678-1234-1234-1234')).toBe(false) // too short
    })
  })
})