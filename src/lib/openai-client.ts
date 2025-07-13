/**
 * OpenAI API Client for Script Generation
 * 
 * This module handles OpenAI API integration for generating mulmoscripts
 * from user stories using the prompt template system.
 */

import OpenAI from 'openai';
import {
  generateOpenAIPrompt,
  logPromptPerformance,
  extractJSONFromResponse,
  validateGeneratedScript,
  createPromptHash,
  type PromptPerformanceLog
} from './prompt-templates';
import { type Story, type Mulmoscript, MulmoscriptSchema, validateSchema } from './schemas';

// ================================================================
// Types & Interfaces
// ================================================================

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface ScriptGenerationOptions {
  templateId?: string;
  targetDuration?: number;
  stylePreference?: 'dramatic' | 'comedic' | 'adventure' | 'romantic' | 'mystery';
  language?: 'ja' | 'en';
  beats?: number;
  retryCount?: number;
  enableCaptions?: boolean;
  captionStyles?: string[];
  scenes?: Array<{ number: number; title: string; imagePrompt?: string }>;
}

export interface GenerationResult {
  success: boolean;
  script?: Mulmoscript;
  error?: string;
  metadata: {
    template_id: string;
    input_tokens: number;
    output_tokens: number;
    response_time_ms: number;
    prompt_hash: string;
    model_used: string;
    retry_count: number;
  };
}

// ================================================================
// OpenAI Client Setup
// ================================================================

let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client
 */
export function initializeOpenAI(config: OpenAIConfig): void {
  openaiClient = new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeout || 60000, // 30 seconds default
  });
}

/**
 * Get OpenAI client (lazy initialization)
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }

    initializeOpenAI({ apiKey });
  }

  return openaiClient as OpenAI;
}

// ================================================================
// Script Generation Functions
// ================================================================

/**
 * Generate mulmoscript from story using OpenAI
 */
export async function generateMulmoscriptWithOpenAI(
  story: Story,
  options: ScriptGenerationOptions = {}
): Promise<GenerationResult> {
  console.log('[generateMulmoscriptWithOpenAI] ===== START =====');
  console.log('[generateMulmoscriptWithOpenAI] Story ID:', story.id);
  console.log('[generateMulmoscriptWithOpenAI] Story title:', story.title);
  console.log('[generateMulmoscriptWithOpenAI] Story beats:', story.beats);
  console.log('[generateMulmoscriptWithOpenAI] Options:', JSON.stringify(options, null, 2));
  
  const startTime = Date.now();
  let retryCount = 0;
  const maxRetries = options.retryCount || 2;

  // Default configuration
  const config = {
    model: 'gpt-4.1', // Latest GPT-4 model for script generation
    maxTokens: 32000,
    temperature: 0.7, // Balanced creativity and consistency
  };
  console.log('[generateMulmoscriptWithOpenAI] Using config:', config);

  try {
    const client = getOpenAIClient();

    // Generate prompt using template system
    console.log('[generateMulmoscriptWithOpenAI] Generating prompt using template system...');
    const promptData = generateOpenAIPrompt(story, {
      templateId: options.templateId,
      targetDuration: options.targetDuration,
      stylePreference: options.stylePreference,
      language: options.language,
      beats: options.beats,
      enableCaptions: options.enableCaptions,
      captionStyles: options.captionStyles,
      scenes: options.scenes,
    });
    console.log('[generateMulmoscriptWithOpenAI] Prompt template ID:', promptData.metadata.template_id);
    console.log('[generateMulmoscriptWithOpenAI] System prompt length:', promptData.messages[0].content.length);
    console.log('[generateMulmoscriptWithOpenAI] User prompt length:', promptData.messages[1].content.length);

    const promptHash = createPromptHash(promptData.messages[1].content);
    console.log('[generateMulmoscriptWithOpenAI] Prompt hash:', promptHash);

    // Retry logic for handling API failures
    while (retryCount <= maxRetries) {
      try {
        console.log(`[generateMulmoscriptWithOpenAI] Generating script for story ${story.id} (attempt ${retryCount + 1}/${maxRetries + 1})`);
        console.log(`[generateMulmoscriptWithOpenAI] Calling OpenAI API...`);

        // Call OpenAI API
        const completion = await client.chat.completions.create({
          model: config.model,
          messages: promptData.messages,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          response_format: { type: "json_object" }, // Ensure JSON response
        });
        console.log(`[generateMulmoscriptWithOpenAI] OpenAI API call completed`);

        const responseTime = Date.now() - startTime;
        const choice = completion.choices[0];

        if (!choice?.message?.content) {
          throw new Error('Empty response from OpenAI API');
        }

        // Extract and validate JSON
        const rawContent = choice.message.content;
        console.log(`[generateMulmoscriptWithOpenAI] Response content length:`, rawContent.length);
        
        let scriptData: any;

        try {
          console.log(`[generateMulmoscriptWithOpenAI] Extracting JSON from response...`);
          scriptData = extractJSONFromResponse(rawContent);
          console.log(`[generateMulmoscriptWithOpenAI] JSON extracted successfully`);
        } catch (parseError) {
          console.error(`[generateMulmoscriptWithOpenAI] JSON parsing failed:`, parseError);
          throw new Error(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }

        // Validate generated script structure
        console.log(`[generateMulmoscriptWithOpenAI] Validating generated script structure...`);
        const validation = validateGeneratedScript(scriptData);
        if (!validation.valid) {
          console.error(`[generateMulmoscriptWithOpenAI] Script validation failed:`, validation.errors);
          throw new Error(`Generated script validation failed: ${validation.errors.join(', ')}`);
        }
        console.log(`[generateMulmoscriptWithOpenAI] Script structure validation passed`);

        // Final Zod validation
        console.log(`[generateMulmoscriptWithOpenAI] Running Zod schema validation...`);
        const zodValidation = validateSchema(MulmoscriptSchema, validation.script);
        if (!zodValidation.success) {
          console.error(`[generateMulmoscriptWithOpenAI] Zod validation failed:`, zodValidation.errors);
          throw new Error(`Zod validation failed: ${zodValidation.errors?.map(e => e.message).join(', ')}`);
        }
        console.log(`[generateMulmoscriptWithOpenAI] Zod validation passed`);

        // Log successful generation
        console.log(`[generateMulmoscriptWithOpenAI] Script generation successful`);
        console.log(`[generateMulmoscriptWithOpenAI] Response time: ${responseTime}ms`);
        console.log(`[generateMulmoscriptWithOpenAI] Input tokens: ${completion.usage?.prompt_tokens || 0}`);
        console.log(`[generateMulmoscriptWithOpenAI] Output tokens: ${completion.usage?.completion_tokens || 0}`);
        console.log(`[generateMulmoscriptWithOpenAI] Total tokens: ${(completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0)}`);
        
        const performanceLog: PromptPerformanceLog = {
          template_id: promptData.metadata.template_id,
          prompt_hash: promptHash,
          input_tokens: completion.usage?.prompt_tokens || 0,
          output_tokens: completion.usage?.completion_tokens || 0,
          response_time_ms: responseTime,
          success: true,
          generated_script_valid: true,
          timestamp: new Date().toISOString(),
        };

        logPromptPerformance(performanceLog);

        console.log(`[generateMulmoscriptWithOpenAI] Successfully generated script for story ${story.id} in ${responseTime}ms`);
        console.log(`[generateMulmoscriptWithOpenAI] ===== END (SUCCESS) =====`);

        return {
          success: true,
          script: zodValidation.data as Mulmoscript,
          metadata: {
            template_id: promptData.metadata.template_id,
            input_tokens: completion.usage?.prompt_tokens || 0,
            output_tokens: completion.usage?.completion_tokens || 0,
            response_time_ms: responseTime,
            prompt_hash: promptHash,
            model_used: config.model,
            retry_count: retryCount,
          },
        };

      } catch (attemptError) {
        retryCount++;
        const errorMessage = attemptError instanceof Error ? attemptError.message : 'Unknown error';

        console.error(`[generateMulmoscriptWithOpenAI] Attempt ${retryCount} failed for story ${story.id}: ${errorMessage}`);
        console.error(`[generateMulmoscriptWithOpenAI] Error type:`, attemptError instanceof Error ? attemptError.constructor.name : typeof attemptError);
        console.error(`[generateMulmoscriptWithOpenAI] Error details:`, attemptError);

        if (retryCount > maxRetries) {
          console.error(`[generateMulmoscriptWithOpenAI] Maximum retries (${maxRetries}) exceeded`);
          
          // Log failed generation
          const performanceLog: PromptPerformanceLog = {
            template_id: promptData.metadata.template_id,
            prompt_hash: promptHash,
            input_tokens: 0,
            output_tokens: 0,
            response_time_ms: Date.now() - startTime,
            success: false,
            error_message: errorMessage,
            generated_script_valid: false,
            timestamp: new Date().toISOString(),
          };

          logPromptPerformance(performanceLog);

          throw attemptError;
        }

        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`[generateMulmoscriptWithOpenAI] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw new Error('Maximum retries exceeded');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during script generation';
    const responseTime = Date.now() - startTime;
    
    console.error(`[generateMulmoscriptWithOpenAI] Unhandled error occurred`);
    console.error(`[generateMulmoscriptWithOpenAI] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`[generateMulmoscriptWithOpenAI] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');

    console.error(`[generateMulmoscriptWithOpenAI] Failed to generate script for story ${story.id}: ${errorMessage}`);
    console.error(`[generateMulmoscriptWithOpenAI] Total time elapsed: ${responseTime}ms`);
    console.error(`[generateMulmoscriptWithOpenAI] ===== END (FAILURE) =====`);

    return {
      success: false,
      error: errorMessage,
      metadata: {
        template_id: options.templateId || 'enhanced_mulmoscript_v1',
        input_tokens: 0,
        output_tokens: 0,
        response_time_ms: responseTime,
        prompt_hash: '',
        model_used: config.model,
        retry_count: retryCount,
      },
    };
  }
}

/**
 * Generate mulmoscript with fallback to mock implementation
 */
export async function generateMulmoscriptWithFallback(
  story: Story,
  options: ScriptGenerationOptions = {}
): Promise<{ script: Mulmoscript; generated_with_ai: boolean }> {
  try {
    // Try OpenAI generation first
    const result = await generateMulmoscriptWithOpenAI(story, options);

    if (result.success && result.script) {
      return {
        script: result.script,
        generated_with_ai: true,
      };
    }

    // If OpenAI fails, fall back to mock generation
    console.warn(`[OpenAI] Falling back to mock generation for story ${story.id}: ${result.error}`);

  } catch (error) {
    console.error(`[OpenAI] Error during AI generation, falling back to mock: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Fallback: Use enhanced mock generation
  const mockScript = generateEnhancedMockMulmoscript(story, options);

  return {
    script: mockScript,
    generated_with_ai: false,
  };
}

// ================================================================
// Enhanced Mock Generation (Fallback)
// ================================================================

/**
 * Enhanced mock script generator (正式mulmoscriptフォーマット)
 */
function generateEnhancedMockMulmoscript(
  story: Story,
  options: ScriptGenerationOptions = {}
): Mulmoscript {
  const style = options.stylePreference || 'dramatic';
  const language = options.language || 'ja';
  const beatsCount = options.beats || 5;

  // Style-based content variations
  const styleVariations = {
    dramatic: {
      opening: `In a world where dreams meet reality, "${story.title}" begins its tale...`,
      imageStyle: 'dramatic, cinematic, moody lighting',
      closing: 'Thus ends our dramatic journey, leaving echoes of profound meaning.',
    },
    comedic: {
      opening: `Once upon a laugh, in the delightfully chaotic story of "${story.title}"...`,
      imageStyle: 'comedic, bright colors, playful',
      closing: 'And they all lived hilariously ever after!',
    },
    adventure: {
      opening: `Adventure calls! The epic tale of "${story.title}" awaits...`,
      imageStyle: 'adventure, epic landscape, dynamic action',
      closing: 'The adventure may end, but the legend lives on forever.',
    },
    romantic: {
      opening: `In matters of the heart, "${story.title}" unfolds its tender story...`,
      imageStyle: 'romantic, soft lighting, beautiful scenery',
      closing: 'Love conquers all, as our romantic tale reaches its sweet conclusion.',
    },
    mystery: {
      opening: `Shadows whisper secrets in the mysterious tale of "${story.title}"...`,
      imageStyle: 'mysterious, dark atmosphere, shadows',
      closing: 'The mystery is solved, but its intrigue lingers in the mind.',
    },
  };

  const variation = styleVariations[style];

  // Create beats with proper mulmocast format - dynamic based on beatsCount
  const beats = [];

  // Always start with opening
  beats.push({
    speaker: 'Narrator',
    text: variation.opening,
    imagePrompt: `Opening scene: ${variation.imageStyle}, establishing shot of the story world`,
  });

  // Add middle beats based on beatsCount
  if (beatsCount > 1) {
    for (let i = 1; i < beatsCount - 1; i++) {
      const speakers = ['Character', 'Narrator', 'WiseCharacter'];
      const speaker = speakers[i % speakers.length];

      let text = '';
      let imagePrompt = '';

      if (speaker === 'Character') {
        text = story.text_raw.slice(0, Math.min(150, story.text_raw.length)) + (story.text_raw.length > 150 ? '...' : '');
        imagePrompt = `Character scene ${i}: ${variation.imageStyle}, character portrait or action scene`;
      } else if (speaker === 'Narrator') {
        text = `The story unfolds with unexpected twists and meaningful moments...`;
        imagePrompt = `Story development ${i}: ${variation.imageStyle}, visual representation of the main plot`;
      } else {
        text = `The heart of the story reveals its deeper meaning and purpose...`;
        imagePrompt = `Emotional moment ${i}: ${variation.imageStyle}, dramatic moment of realization`;
      }

      beats.push({ speaker, text, imagePrompt });
    }
  }

  // Always end with closing (unless beatsCount is 1)
  if (beatsCount > 1) {
    beats.push({
      speaker: 'Narrator',
      text: variation.closing,
      imagePrompt: `Conclusion scene: ${variation.imageStyle}, peaceful resolution showing the outcome`,
    });
  }

  // Dynamic speaker generation based on beats
  const speakers: Record<string, any> = {};
  const uniqueSpeakers = [...new Set(beats.map(b => b.speaker))];

  // Assign voices dynamically
  const availableVoices = ['shimmer', 'alloy', 'echo', 'nova', 'fable', 'onyx'];
  uniqueSpeakers.forEach((speaker, index) => {
    const voiceIndex = index % availableVoices.length;
    speakers[speaker] = {
      voiceId: availableVoices[voiceIndex],
      displayName: language === 'ja'
        ? { ja: speaker === 'Narrator' ? '語り手' : speaker, en: speaker }
        : { en: speaker, ja: speaker === 'Narrator' ? '語り手' : speaker },
    };
  });

  const script: Mulmoscript = {
    $mulmocast: {
      version: '1.0' as const,
    },
    title: story.title,
    lang: language === 'ja' ? 'ja' : 'en',
    speechParams: {
      provider: 'openai',
      speakers,
    },
    imageParams: {
      style: `anime style, ${variation.imageStyle}, soft pastel colors, high quality`,
    },
    beats,
  };

  // Add captionParams if enabled
  if (options.enableCaptions) {
    script.captionParams = {
      lang: language === 'ja' ? 'ja' : 'en',
      styles: options.captionStyles || [
        'font-size: 48px',
        'color: white',
        'text-shadow: 2px 2px 4px rgba(0,0,0,0.8)',
        'font-family: \'Noto Sans JP\', sans-serif',
        'font-weight: bold',
      ],
    };
  }

  return script;
}

// ================================================================
// Utility Functions
// ================================================================

/**
 * Test OpenAI API connection
 */
export async function testOpenAIConnection(): Promise<{
  success: boolean;
  error?: string;
  model_info?: any;
}> {
  try {
    const client = getOpenAIClient();

    // Simple test request (must mention "JSON" when using json_object format)
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: 'Test connection. Please respond with valid JSON format: {"status": "ok"}'
      }],
      max_tokens: 50,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      const parsed = JSON.parse(response);
      if (parsed.status === 'ok') {
        return {
          success: true,
          model_info: {
            model: completion.model,
            usage: completion.usage,
          },
        };
      }
    }

    return {
      success: false,
      error: 'Unexpected response format',
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get OpenAI API usage statistics
 */
export async function getOpenAIUsage(): Promise<{
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  estimated_cost_usd: number;
}> {
  // This would typically query OpenAI's usage API or local logs
  // For now, return placeholder data
  return {
    total_requests: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    estimated_cost_usd: 0,
  };
}