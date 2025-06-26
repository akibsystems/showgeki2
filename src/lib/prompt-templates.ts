/**
 * Prompt Template Management System
 * 
 * This module manages AI prompts for generating mulmoscript from user stories.
 * It provides template management, variable substitution, and performance tracking.
 */

import { type Story, type Mulmoscript } from './schemas';

// ================================================================
// Types & Interfaces
// ================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  content: string;
  variables: string[];
  metadata: {
    created_at: string;
    updated_at: string;
    usage_count?: number;
    success_rate?: number;
  };
}

export interface PromptContext {
  story_title: string;
  story_text: string;
  target_duration?: number;
  style_preference?: 'dramatic' | 'comedic' | 'adventure' | 'romantic' | 'mystery';
  voice_count?: number;
  language?: 'japanese' | 'english';
}

export interface PromptGenerationResult {
  prompt: string;
  template_id: string;
  context: PromptContext;
  timestamp: string;
  estimated_tokens: number;
}

export interface PromptPerformanceLog {
  template_id: string;
  prompt_hash: string;
  input_tokens: number;
  output_tokens: number;
  response_time_ms: number;
  success: boolean;
  error_message?: string;
  generated_script_valid: boolean;
  timestamp: string;
}

// ================================================================
// Template Repository
// ================================================================

/**
 * Base template for story-to-mulmoscript conversion (公式フォーマット準拠)
 */
const BASE_MULMOSCRIPT_TEMPLATE: PromptTemplate = {
  id: 'base_mulmoscript_v1',
  name: 'Base Mulmoscript Generator',
  description: 'Converts user stories into official mulmocast format with 5 beats',
  version: 'v2.0',
  content: `You are an expert storyteller and video script writer. Your task is to convert a user story into a structured mulmocast format for video generation.

## Input Story
Title: "{{story_title}}"
Content: {{story_text}}

## Requirements
- Create exactly 5 beats that tell a complete story
- Target total duration: approximately {{target_duration}} seconds
- Make it engaging and cinematic
- Language: {{language}}
- Style: {{style_preference}}
- Use appropriate speakers and image prompts

## Output Format
You must respond with a valid JSON object in this exact mulmocast format:

\`\`\`json
{
  "$mulmocast": {
    "version": "1.0"
  },
  "title": "{{story_title}}",
  "lang": "{{language}}",
  "speechParams": {
    "provider": "openai",
    "speakers": {
      "Narrator": {
        "voiceId": "shimmer",
        "displayName": {
          "en": "Narrator",
          "ja": "語り手"
        }
      },
      "Character": {
        "voiceId": "alloy",
        "displayName": {
          "en": "Character", 
          "ja": "登場人物"
        }
      }
    }
  },
  "imageParams": {
    "style": "Ghibli style anime, soft pastel colors, magical atmosphere"
  },
  "beats": [
    {
      "speaker": "Narrator",
      "text": "Opening narration that sets the scene...",
      "imagePrompt": "Visual description for this beat"
    },
    {
      "speaker": "Character",
      "text": "Character dialogue or action...",
      "imagePrompt": "Visual description for this beat"
    }
  ]
}
\`\`\`

## Important Guidelines
1. Use "beats" not "scenes" - this is the official mulmocast terminology
2. Each beat should have meaningful text and imagePrompt
3. Use appropriate speakers (Narrator, Character, etc.)
4. Image prompts should be vivid and descriptive
5. Total video will be approximately {{target_duration}} seconds
6. JSON must be valid and parseable
7. Follow the mulmocast schema exactly

Convert the story now:`,
  variables: ['story_title', 'story_text', 'target_duration', 'style_preference', 'language'],
  metadata: {
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-12-26T00:00:00Z',
    usage_count: 0,
    success_rate: 0
  }
};

/**
 * Enhanced template with detailed beat descriptions (公式フォーマット準拠)
 */
const ENHANCED_MULMOSCRIPT_TEMPLATE: PromptTemplate = {
  id: 'enhanced_mulmoscript_v1',
  name: 'Enhanced Mulmoscript Generator',
  description: 'Enhanced converter with detailed beat descriptions and character development',
  version: 'v2.0',
  content: `You are a master storyteller specializing in creating compelling short-form video content. Transform the given story into a cinematic mulmocast script.

## Story Analysis
Title: "{{story_title}}"
Content: {{story_text}}
Preferred Style: {{style_preference}}
Target Language: {{language}}

## Creative Direction
Create a {{target_duration}}-second video that:
- Captures the essence and emotion of the original story
- Uses varied pacing and speakers for visual interest
- Includes compelling character voices and detailed image prompts
- Follows a clear narrative arc with setup, development, and resolution

## Technical Specifications
- Exactly 5 beats
- Total duration: ~{{target_duration}} seconds
- Voice count: {{voice_count}} different speakers maximum
- Rich visual descriptions for each beat

## Speaker Guide
- **Narrator**: Authoritative, clear, storytelling voice
- **Character**: Main character, emotional range
- **WiseCharacter**: Mentor figure, thoughtful delivery
- **Child**: Innocent, curious, high energy
- **Elder**: Experienced, measured, often contemplative

## Response Format
Respond with ONLY the JSON mulmocast script (no additional text):

\`\`\`json
{
  "$mulmocast": {
    "version": "1.0"
  },
  "title": "{{story_title}}",
  "lang": "{{language}}",
  "speechParams": {
    "provider": "openai",
    "speakers": {
      "Narrator": {
        "voiceId": "shimmer",
        "displayName": {
          "en": "Narrator",
          "ja": "語り手"
        }
      },
      "Character": {
        "voiceId": "alloy",
        "displayName": {
          "en": "Main Character",
          "ja": "主人公"
        }
      },
      "WiseCharacter": {
        "voiceId": "echo",
        "displayName": {
          "en": "Wise Character",
          "ja": "賢者"
        }
      }
    }
  },
  "imageParams": {
    "style": "{{style_preference}} style, cinematic, high quality, detailed"
  },
  "beats": [
    {
      "speaker": "Narrator",
      "text": "Compelling opening narration that hooks the viewer...",
      "imagePrompt": "Atmospheric opening scene that sets the mood and introduces the world"
    },
    {
      "speaker": "Character",
      "text": "Character introduction or key dialogue that reveals motivation...",
      "imagePrompt": "Character portrait or action scene showing their personality"
    },
    {
      "speaker": "Narrator",
      "text": "Story development that advances the plot...",
      "imagePrompt": "Visual representation of the story's main conflict or journey"
    },
    {
      "speaker": "WiseCharacter", 
      "text": "Emotional peak, revelation, or wisdom shared...",
      "imagePrompt": "Dramatic moment or meaningful interaction between characters"
    },
    {
      "speaker": "Narrator",
      "text": "Satisfying conclusion that ties everything together...",
      "imagePrompt": "Peaceful, resolution scene that shows the outcome or transformation"
    }
  ]
}
\`\`\`

## Important Guidelines
1. Use "beats" not "scenes" - official mulmocast terminology
2. Each beat must have both meaningful text and detailed imagePrompt
3. Image prompts should be cinematic and visually rich
4. Speakers should match the content (Narrator for exposition, Character for personal moments)
5. Total script should tell a complete, satisfying story
6. Follow the mulmocast schema exactly
7. JSON must be valid and parseable

Generate the mulmocast script:`,
  variables: ['story_title', 'story_text', 'target_duration', 'style_preference', 'language', 'voice_count'],
  metadata: {
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-12-26T00:00:00Z',
    usage_count: 0,
    success_rate: 0
  }
};

/**
 * Template registry
 */
const TEMPLATE_REGISTRY: Record<string, PromptTemplate> = {
  [BASE_MULMOSCRIPT_TEMPLATE.id]: BASE_MULMOSCRIPT_TEMPLATE,
  [ENHANCED_MULMOSCRIPT_TEMPLATE.id]: ENHANCED_MULMOSCRIPT_TEMPLATE,
};

// ================================================================
// Template Management Functions
// ================================================================

/**
 * Get all available templates
 */
export function getAllTemplates(): PromptTemplate[] {
  return Object.values(TEMPLATE_REGISTRY);
}

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): PromptTemplate | null {
  return TEMPLATE_REGISTRY[templateId] || null;
}

/**
 * Get the default template for mulmoscript generation
 */
export function getDefaultTemplate(): PromptTemplate {
  return ENHANCED_MULMOSCRIPT_TEMPLATE;
}

/**
 * Register a new template
 */
export function registerTemplate(template: PromptTemplate): void {
  TEMPLATE_REGISTRY[template.id] = {
    ...template,
    metadata: {
      ...template.metadata,
      updated_at: new Date().toISOString()
    }
  };
}

// ================================================================
// Variable Substitution
// ================================================================

/**
 * Replace template variables with actual values
 */
export function substituteVariables(
  template: string, 
  context: PromptContext
): string {
  let result = template;
  
  // Default values
  const defaults = {
    target_duration: '20.0',
    style_preference: 'dramatic',
    voice_count: '3',
    language: 'japanese'
  };
  
  // Combine context with defaults
  const variables = {
    story_title: context.story_title,
    story_text: context.story_text,
    target_duration: (context.target_duration || 20).toString(),
    style_preference: context.style_preference || defaults.style_preference,
    voice_count: (context.voice_count || 3).toString(),
    language: context.language || defaults.language
  };
  
  // Replace all variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
}

/**
 * Validate that all required variables are provided
 */
export function validateContext(
  template: PromptTemplate, 
  context: PromptContext
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  template.variables.forEach(variable => {
    const value = (context as any)[variable];
    if (value === undefined || value === null || value === '') {
      // Only require story_title and story_text
      if (variable === 'story_title' || variable === 'story_text') {
        missing.push(variable);
      }
    }
  });
  
  return {
    valid: missing.length === 0,
    missing
  };
}

// ================================================================
// Prompt Generation
// ================================================================

/**
 * Generate a complete prompt from story data
 */
export function generatePrompt(
  story: Story,
  options: {
    templateId?: string;
    targetDuration?: number;
    stylePreference?: PromptContext['style_preference'];
    language?: PromptContext['language'];
  } = {}
): PromptGenerationResult {
  const template = options.templateId 
    ? getTemplate(options.templateId) 
    : getDefaultTemplate();
    
  if (!template) {
    throw new Error(`Template not found: ${options.templateId}`);
  }
  
  const context: PromptContext = {
    story_title: story.title,
    story_text: story.text_raw,
    target_duration: options.targetDuration || 20,
    style_preference: options.stylePreference || 'dramatic',
    voice_count: 3,
    language: options.language || 'japanese'
  };
  
  // Validate context
  const validation = validateContext(template, context);
  if (!validation.valid) {
    throw new Error(`Missing required context variables: ${validation.missing.join(', ')}`);
  }
  
  // Generate prompt
  const prompt = substituteVariables(template.content, context);
  
  // Estimate token count (rough approximation: 1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil(prompt.length / 4);
  
  return {
    prompt,
    template_id: template.id,
    context,
    timestamp: new Date().toISOString(),
    estimated_tokens: estimatedTokens
  };
}

/**
 * Generate prompt for OpenAI API with system message
 */
export function generateOpenAIPrompt(story: Story, options: Parameters<typeof generatePrompt>[1] = {}) {
  const result = generatePrompt(story, options);
  
  return {
    messages: [
      {
        role: 'system' as const,
        content: 'You are an expert storyteller and video script writer. You specialize in converting user stories into structured mulmoscript format for video generation. Always respond with valid JSON only.'
      },
      {
        role: 'user' as const,
        content: result.prompt
      }
    ],
    metadata: result
  };
}

// ================================================================
// Performance Tracking
// ================================================================

const performanceLog: PromptPerformanceLog[] = [];

/**
 * Log prompt performance for analysis
 */
export function logPromptPerformance(log: PromptPerformanceLog): void {
  performanceLog.push(log);
  
  // Update template statistics
  const template = getTemplate(log.template_id);
  if (template) {
    template.metadata.usage_count = (template.metadata.usage_count || 0) + 1;
    
    // Calculate success rate
    const templateLogs = performanceLog.filter(l => l.template_id === log.template_id);
    const successCount = templateLogs.filter(l => l.success && l.generated_script_valid).length;
    template.metadata.success_rate = successCount / templateLogs.length;
    
    // Update timestamp
    template.metadata.updated_at = new Date().toISOString();
  }
}

/**
 * Get performance statistics for a template
 */
export function getTemplatePerformance(templateId: string): {
  usage_count: number;
  success_rate: number;
  avg_response_time: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
  recent_logs: PromptPerformanceLog[];
} {
  const template = getTemplate(templateId);
  const logs = performanceLog.filter(l => l.template_id === templateId);
  
  if (!template || logs.length === 0) {
    return {
      usage_count: 0,
      success_rate: 0,
      avg_response_time: 0,
      avg_input_tokens: 0,
      avg_output_tokens: 0,
      recent_logs: []
    };
  }
  
  const successfulLogs = logs.filter(l => l.success);
  
  return {
    usage_count: logs.length,
    success_rate: successfulLogs.length / logs.length,
    avg_response_time: logs.reduce((sum, l) => sum + l.response_time_ms, 0) / logs.length,
    avg_input_tokens: logs.reduce((sum, l) => sum + l.input_tokens, 0) / logs.length,
    avg_output_tokens: logs.reduce((sum, l) => sum + l.output_tokens, 0) / logs.length,
    recent_logs: logs.slice(-10) // Last 10 logs
  };
}

/**
 * Get overall performance statistics
 */
export function getOverallPerformance(): {
  total_requests: number;
  overall_success_rate: number;
  template_performance: Record<string, ReturnType<typeof getTemplatePerformance>>;
} {
  const allTemplates = getAllTemplates();
  
  return {
    total_requests: performanceLog.length,
    overall_success_rate: performanceLog.filter(l => l.success && l.generated_script_valid).length / Math.max(performanceLog.length, 1),
    template_performance: Object.fromEntries(
      allTemplates.map(t => [t.id, getTemplatePerformance(t.id)])
    )
  };
}

// ================================================================
// Utility Functions
// ================================================================

/**
 * Create a hash for prompt content (for deduplication and caching)
 */
export function createPromptHash(prompt: string): string {
  // Simple hash function for prompt content
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extract JSON from OpenAI response (handles markdown code blocks)
 */
export function extractJSONFromResponse(response: string): any {
  // Remove markdown code blocks if present
  const cleanResponse = response
    .replace(/```json\s*\n?/g, '')
    .replace(/```\s*$/g, '')
    .trim();
  
  try {
    return JSON.parse(cleanResponse);
  } catch (error) {
    // Try to find JSON within the response
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  }
}

/**
 * Validate generated mulmoscript structure (公式フォーマット準拠)
 */
export function validateGeneratedScript(scriptData: any): {
  valid: boolean;
  errors: string[];
  script?: Mulmoscript;
} {
  const errors: string[] = [];
  
  // Basic structure validation
  if (!scriptData || typeof scriptData !== 'object') {
    errors.push('Response is not a valid object');
    return { valid: false, errors };
  }
  
  // Mulmocast format validation
  if (!scriptData.$mulmocast) errors.push('Missing $mulmocast field');
  else if (!scriptData.$mulmocast.version) errors.push('Missing $mulmocast.version field');
  
  if (!scriptData.speechParams) errors.push('Missing speechParams field');
  else {
    if (!scriptData.speechParams.speakers) errors.push('Missing speechParams.speakers field');
    if (!scriptData.speechParams.provider) errors.push('Missing speechParams.provider field');
  }
  
  if (!Array.isArray(scriptData.beats)) errors.push('Beats must be an array');
  
  // Beats validation
  if (scriptData.beats) {
    if (scriptData.beats.length === 0) {
      errors.push('At least one beat is required');
    }
    
    scriptData.beats.forEach((beat: any, index: number) => {
      if (!beat.speaker) errors.push(`Beat ${index + 1}: Missing speaker`);
      if (!beat.text && typeof beat.text !== 'string') errors.push(`Beat ${index + 1}: Missing or invalid text`);
      // imagePrompt is optional but should be string if present
      if (beat.imagePrompt && typeof beat.imagePrompt !== 'string') {
        errors.push(`Beat ${index + 1}: Invalid imagePrompt type`);
      }
    });
  }
  
  // Optional fields validation
  if (scriptData.lang && typeof scriptData.lang !== 'string') {
    errors.push('Invalid lang field type');
  }
  
  if (scriptData.imageParams && typeof scriptData.imageParams !== 'object') {
    errors.push('Invalid imageParams field type');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    script: errors.length === 0 ? scriptData as Mulmoscript : undefined
  };
}