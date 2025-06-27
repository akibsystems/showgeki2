/**
 * Tests for beats parameter integration
 */

import { describe, it, expect } from 'vitest';
import { generatePrompt, generateOpenAIPrompt } from '@/lib/prompt-templates';
import type { Story } from '@/lib/schemas';

describe('Beats Integration', () => {
  const mockStory: Story = {
    id: '12345678-1234-1234-1234-123456789012',
    uid: 'test-uid',
    workspace_id: 'test-workspace',
    title: 'Test Story',
    text_raw: 'This is a test story about adventure and discovery.',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    script_json: null,
    video_url: null
  };

  describe('generatePrompt', () => {
    it('should include beats parameter in context with default value', () => {
      const result = generatePrompt(mockStory, {
        language: 'ja'
      });

      expect(result.context.beats).toBe(5); // Default beats
      expect(result.template_id).toBe('base_mulmoscript_jp_v1');
    });

    it('should use custom beats value when provided', () => {
      const result = generatePrompt(mockStory, {
        language: 'ja',
        beats: 10
      });

      expect(result.context.beats).toBe(10);
    });

    it('should substitute beats variable in prompt template', () => {
      const result = generatePrompt(mockStory, {
        language: 'ja',
        beats: 7
      });

      // Check that the prompt contains the substituted beats value
      expect(result.prompt).not.toContain('{{beats}}');
      expect(result.prompt).toContain('7');
    });
  });

  describe('generateOpenAIPrompt', () => {
    it('should pass beats parameter through to prompt generation', () => {
      const result = generateOpenAIPrompt(mockStory, {
        language: 'ja',
        beats: 8
      });

      expect(result.metadata.context.beats).toBe(8);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[1].role).toBe('user');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined beats parameter gracefully', () => {
      const result = generatePrompt(mockStory, {
        language: 'ja',
        beats: undefined
      });

      expect(result.context.beats).toBe(5); // Should default to 5
    });

    it('should handle zero beats parameter', () => {
      const result = generatePrompt(mockStory, {
        language: 'ja',
        beats: 0
      });

      expect(result.context.beats).toBe(0);
    });

    it('should handle negative beats parameter', () => {
      const result = generatePrompt(mockStory, {
        language: 'ja',
        beats: -1
      });

      expect(result.context.beats).toBe(-1);
    });
  });
});