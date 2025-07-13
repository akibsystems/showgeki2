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
  language?: 'ja' | 'en';
  beats?: number;
  enableCaptions?: boolean;
  captionStyles?: string[];
  scenes?: Array<{ number: number; title: string }>;
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
 * Base template for story-to-mulmoscript conversion (English version)
 */
const BASE_MULMOSCRIPT_TEMPLATE: PromptTemplate = {
  id: 'base_mulmoscript_v1',
  name: 'Base Mulmoscript Generator (English)',
  description: 'Converts user stories into official mulmocast format with detailed beats and character development',
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
{{enableCaptions}}

{{scenesTitles}}

## Validation Requirements
⚠️ MUST check before generation:
1. Create a list of character names defined in speechParams.speakers
2. Verify each beat's speaker is in this list
3. NEVER use character names not defined in speechParams.speakers

## Technical Specifications
- Exactly {{beats}} beats
- Total duration: ~{{target_duration}} seconds
- Rich visual descriptions for each beat

## Important: Dynamic Character and Voice Generation
1. **Analyze the story to identify necessary characters**
   - Main characters, supporting roles, narrators as needed
   - Create only essential characters for efficient casting

2. **Assign optimal OpenAI voices to each character**
   - Available voices: alloy, echo, fable, nova, onyx, shimmer
   - Choose based on character personality, age, and role
   - Example: young protagonist=nova, wise mentor=echo, narrator=shimmer

3. **Define speakers dynamically based on the story**
   - Not limited to template characters
   - Create appropriate displayNames for each character

## Response Format
Respond with ONLY the JSON mulmocast script (no additional text).

The following is a structure example. Generate actual characters and beats dynamically based on the story:

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
      // Define necessary characters dynamically based on the story
      // Examples: "Narrator", "Hero", "Villain", "Friend" etc.
      // Set appropriate voiceId and displayName for each
      "[CharacterName]": {
        "voiceId": "[choose from: alloy|echo|fable|nova|onyx|shimmer]",
        "displayName": {
          "en": "[English Name]",
          "ja": "[Japanese Name]"
        }
      }
    }
  },
  "imageParams": {
    "style": "anime style, soft pastel colors, delicate line art, cinematic lighting",
    "model": "gpt-image-1"
  },
  "beats": [
    // Generate {{beats}} beats dynamically following the story flow
    // Select appropriate speaker and create compelling text and image prompts
    // NOTE: speaker must use names defined in speechParams.speakers only!
    {
      "speaker": "[Character name from speechParams.speakers only]",
      "text": "[Dialogue or narration appropriate for the scene]",
      "imagePrompt": "[Detailed visual prompt to represent the scene]"
    }
  ]
}
\`\`\`

## Important Guidelines
1. **Dynamic Generation Principles**
   - Create characters dynamically based on story content
   - Not bound to fixed character names (Narrator, Character, etc.)
   - Design optimal speaker configuration for the story

2. **Character Creation**
   - Use minimum necessary characters for effective presentation
   - Give each character clear role and personality
   - Set appropriate displayNames in both languages

3. **Voice Selection**
   - Available voiceIds: alloy, echo, fable, nova, onyx, shimmer
   - Match voice to character personality:
     - alloy: neutral, friendly
     - echo: masculine, calm
     - fable: masculine, storytelling
     - nova: feminine, energetic
     - onyx: masculine, deep
     - shimmer: feminine, soft

4. **beats Composition**
   - Create exactly {{beats}} beats
   - Each beat needs compelling text and detailed image prompt
   - Structure with clear beginning, middle, and end
   - **IMPORTANT**: beat speakers must only use names defined in speechParams.speakers

5. **Other Requirements**
   - Include specific proper nouns, numbers, and concrete examples
   - Follow mulmocast schema exactly
   - JSON must be valid and parseable
   - Do not include comments (//) in actual JSON

Generate the mulmocast script:`,
  variables: ['story_title', 'story_text', 'target_duration', 'style_preference', 'language', 'voice_count', 'beats'],
  metadata: {
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-12-26T00:00:00Z',
    usage_count: 0,
    success_rate: 0
  }
};

/**
 * Base template for story-to-mulmoscript conversion (Japanese version) - シェイクスピア演出家
 */
const BASE_MULMOSCRIPT_TEMPLATE_JP_SHAKESPEARE: PromptTemplate = {
  id: 'base_mulmoscript_jp_shakespeare_v1',
  name: 'シェイクスピア演出家 Mulmoscript ジェネレーター (日本語)',
  description: '物語を詳細なビートとキャラクター開発を含む公式mulmocastフォーマットに変換します',
  version: 'v2.0',
  content: `あなたはシェイクスピアの生まれ変わりであり、魅力的な短編動画コンテンツの制作を専門とする演出家です。
  与えられた物語をシェイクスピアだったらどのような演出をするかを想像しながら、mulmocastスクリプトに変換してください。

## 物語分析
- タイトル: "{{story_title}}"
- 内容: {{story_text}}
- 希望スタイル: {{style_preference}}
- 対象言語: {{language}}

## 創作指針
この物語をもとに、シェイクスピア風の５幕構成の悲喜劇として脚本を考えてください
台詞には現代的で少しカジュアルな日本語を使う。
台詞の数が脚本全体で{{beats}}個となるようにカウントする。
内容を膨らませ、各台詞の長さは１〜４文程度、時折長い台詞を含む
元の物語のエッセンスと感情を捉え、多様なキャラクターの個性で視覚的・感情的な演出を行う
{{enableCaptions}}

{{scenesTitles}}

## 検証の重要事項
⚠️ 生成前に必ず確認：
1. speechParams.speakersで定義したキャラクター名のリストを作成
2. 各beatのspeakerがこのリストに含まれることを確認
3. 定義していないキャラクター名は絶対に使用しない

## 技術仕様
- 正確に{{beats}} beatsで構成する
- 総時間: 約{{target_duration}}秒
- 各beatに詳細で豊かな視覚的描写を行う

## 重要：キャラクターと音声の動的生成
1. **物語を分析して必要なキャラクターを特定する**
   - 主人公、脇役、語り手など、物語に必要な役割を見極める
   - 不要なキャラクターは作らない（効率的なキャスティング）

2. **各キャラクターに最適なOpenAI音声を割り当てる**
   - 利用可能な音声: alloy, echo, fable, nova, onyx, shimmer
   - キャラクターの性格、年齢、役割に基づいて選択
   - 例: 若い主人公=nova、賢者=echo、語り手=shimmer

3. **speechParamsのspeakersは物語に合わせて自由に定義する**
   - 固定のテンプレートに縛られず、必要なキャラクターだけ作成
   - 各キャラクターに適切なdisplayNameを設定

## 応答フォーマット
JSONのmulmocastスクリプトのみで応答してください（追加テキストなし）。

以下は構造の例です。実際のキャラクターとbeatsは物語に基づいて動的に生成してください:

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
      // 物語に基づいて必要なキャラクターを動的に定義
      // 例: "Narrator", "Hero", "Villain", "Friend" など
      // 各キャラクターに適切なvoiceIdとdisplayNameを設定
      "[CharacterName]": {
        "voiceId": "[alloy|echo|fable|nova|onyx|shimmer から選択]",
        "displayName": {
          "en": "[English Name]",
          "ja": "[日本語名]"
        }
      }
    }
  },
  "imageParams": {
    "style": "アニメ風、ソフトパステルカラー、繊細な線画、シネマティック照明",
    "model": "gpt-image-1"
  },
  "beats": [
    // {{beats}}個のbeatsを物語の流れに沿って動的に生成
    // 各beatで適切なspeakerを選択し、魅力的なテキストと画像プロンプトを作成
    // 注意: speakerは必ずspeechParams.speakersで定義した名前を使用すること！
    {
      "speaker": "[speechParams.speakersに定義したキャラクター名のみ]",
      "text": "[そのシーンに適した台詞やナレーション]",
      "imagePrompt": "[シーンを視覚的に表現する詳細な画像プロンプト - 必ず日本語で記述]"
    }
  ]
}
\`\`\`

## 重要なガイドライン
1. **動的生成の原則**
   - 物語の内容に基づいてキャラクターを動的に作成する
   - 固定のキャラクター名（Narrator, Character等）に縛られない
   - 物語に最適な話者構成を考える

2. **キャラクター作成**
   - 必要最小限のキャラクターで効果的な演出を行う
   - 各キャラクターには明確な役割と個性を与える
   - displayNameは日本語と英語の両方を適切に設定

3. **音声選択**
   - 利用可能なvoiceId: alloy, echo, fable, nova, onyx, shimmer
   - キャラクターの性格に合った音声を選択:
     - alloy: 中性的、フレンドリー
     - echo: 男性的、落ち着いた
     - fable: 男性的、物語調
     - nova: 女性的、エネルギッシュ
     - onyx: 男性的、深みのある
     - shimmer: 女性的、柔らかい

4. **beats構成**
   - 正確に{{beats}}個のbeatsを作成
   - 各beatには魅力的なテキストと詳細な画像プロンプト
   - 物語の起承転結を意識した構成
   - **重要**: beatのspeakerは必ずspeechParams.speakersに定義した名前のみを使用すること
   - **重要**: imagePromptは必ず日本語で記述すること（英語は使用しない）

5. **その他の要件**
   - 【重要】固有名詞や詳細な数値、具体的な事例を含める
   - mulmocastスキーマに正確に従う
   - JSONは有効で解析可能である必要がある
   - コメント（//）は実際のJSONには含めない

mulmocastスクリプトを生成してください:`,
  variables: ['story_title', 'story_text', 'target_duration', 'style_preference', 'language', 'voice_count', 'beats'],
  metadata: {
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-12-26T00:00:00Z',
    usage_count: 0,
    success_rate: 0
  }
};

/**
 * Base template for story-to-mulmoscript conversion (Japanese version) - 一般脚本家
 */
const BASE_MULMOSCRIPT_TEMPLATE_JP_GENERAL: PromptTemplate = {
  id: 'base_mulmoscript_jp_general_v1',
  name: '一般脚本家 Mulmoscript ジェネレーター (日本語)',
  description: '物語を詳細なビートとキャラクター開発を含む公式mulmocastフォーマットに変換します',
  version: 'v1.0',
  content: `あなたは経験豊富な脚本家であり、魅力的な短編動画コンテンツの制作を専門としています。
  与えられた物語を効果的に演出し、視聴者の心に響くmulmocastスクリプトに変換してください。

## 物語分析
- タイトル: "{{story_title}}"
- 内容: {{story_text}}
- 希望スタイル: {{style_preference}}
- 対象言語: {{language}}

## 創作指針
この物語をもとに、起承転結のある構成で脚本を考えてください
台詞には自然で親しみやすい日本語を使う。
台詞の数が脚本全体で{{beats}}個となるようにカウントする。
内容は簡潔にまとめ、各台詞の長さは１〜３文程度にする
元の物語の本質を大切にしながら、現代的な視点で演出を行う
{{enableCaptions}}

{{scenesTitles}}

## 検証の重要事項
⚠️ 生成前に必ず確認：
1. speechParams.speakersで定義したキャラクター名のリストを作成
2. 各beatのspeakerがこのリストに含まれることを確認
3. 定義していないキャラクター名は絶対に使用しない

## 技術仕様
- 正確に{{beats}} beatsで構成する
- 総時間: 約{{target_duration}}秒
- 各beatは5-10秒の長さを目安に

## 応答フォーマット
JSONのmulmocastスクリプトのみで応答してください（追加テキストなし）。

以下は構造の例です。実際のキャラクターとbeatsは物語に基づいて動的に生成してください:

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
      // 物語に基づいて必要なキャラクターを動的に定義
      // 例: "Narrator", "MainCharacter", "Friend" など
      // 各キャラクターに適切なvoiceIdとdisplayNameを設定
      "[CharacterName]": {
        "voiceId": "[alloy|echo|fable|nova|onyx|shimmer から選択]",
        "displayName": {
          "en": "[English Name]",
          "ja": "[日本語名]"
        }
      }
    }
  },
  "imageParams": {
    "style": "アニメ風、ソフトパステルカラー、繊細な線画、シネマティック照明",
    "model": "gpt-image-1"
  },
  "beats": [
    // {{beats}}個のbeatsを物語の流れに沿って動的に生成
    // 各beatで適切なspeakerを選択し、わかりやすいテキストと画像プロンプトを作成
    // 注意: speakerは必ずspeechParams.speakersで定義した名前を使用すること！
    {
      "speaker": "[speechParams.speakersに定義したキャラクター名のみ]",
      "text": "[そのシーンに適した台詞やナレーション]",
      "imagePrompt": "[シーンを視覚的に表現する詳細な画像プロンプト - 必ず日本語で記述]"
    }
  ]
}
\`\`\`

## 重要なガイドライン
1. **動的生成の原則**
   - 物語の内容に基づいてキャラクターを動的に作成する
   - 固定のキャラクター名（Narrator, Character等）に縛られない
   - 物語に最適な話者構成を考える

2. **キャラクター作成**
   - 必要最小限のキャラクターで効果的な演出を行う
   - 各キャラクターには明確な役割と個性を与える
   - displayNameは日本語と英語の両方を適切に設定

3. **音声選択**
   - 利用可能なvoiceId: alloy, echo, fable, nova, onyx, shimmer
   - キャラクターの性格に合った音声を選択:
     - alloy: 中性的、フレンドリー
     - echo: 男性的、落ち着いた
     - fable: 男性的、物語調
     - nova: 女性的、エネルギッシュ
     - onyx: 男性的、深みのある
     - shimmer: 女性的、柔らかい

4. **beats構成**
   - 正確に{{beats}}個のbeatsを作成
   - 各beatには親しみやすいテキストと明確な画像プロンプト
   - 物語の流れを大切にした構成
   - **重要**: beatのspeakerは必ずspeechParams.speakersに定義した名前のみを使用すること
   - **重要**: imagePromptは必ず日本語で記述すること（英語は使用しない）

5. **その他の要件**
   - 【重要】視聴者にとってわかりやすく親しみやすい内容にする
   - mulmocastスキーマに正確に従う
   - JSONは有効で解析可能である必要がある
   - コメント（//）は実際のJSONには含めない

mulmocastスクリプトを生成してください:`,
  variables: ['story_title', 'story_text', 'target_duration', 'style_preference', 'language', 'voice_count', 'beats'],
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
  [BASE_MULMOSCRIPT_TEMPLATE_JP_SHAKESPEARE.id]: BASE_MULMOSCRIPT_TEMPLATE_JP_SHAKESPEARE,
  [BASE_MULMOSCRIPT_TEMPLATE_JP_GENERAL.id]: BASE_MULMOSCRIPT_TEMPLATE_JP_GENERAL,
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
  const writerType = process.env.SCRIPT_WRITER_TYPE || 'shakespeare';
  
  if (writerType === 'general') {
    return BASE_MULMOSCRIPT_TEMPLATE_JP_GENERAL;
  }
  
  return BASE_MULMOSCRIPT_TEMPLATE_JP_SHAKESPEARE;
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
    language: 'ja'
  };

  // Format scene titles if provided
  let scenesTitlesContent = '';
  if (context.scenes && context.scenes.length > 0) {
    scenesTitlesContent = '\n## 指定されたシーン構成\n以下のシーンタイトルに従って脚本を作成してください：\n';
    context.scenes.forEach(scene => {
      scenesTitlesContent += `- シーン ${scene.number}: ${scene.title}\n`;
    });
  }

  // Combine context with defaults
  const variables = {
    story_title: context.story_title,
    story_text: context.story_text,
    target_duration: (context.target_duration || 20).toString(),
    style_preference: context.style_preference || defaults.style_preference,
    voice_count: (context.voice_count || 3).toString(),
    language: context.language || defaults.language,
    beats: (context.beats !== undefined ? context.beats : 5).toString(),
    enableCaptions: context.enableCaptions
      ? `\n- IMPORTANT: Include captionParams in the JSON output with lang="${context.language || 'ja'}" and styles=${JSON.stringify(context.captionStyles || ['font-size: 48px', 'color: white', 'text-shadow: 2px 2px 4px rgba(0,0,0,0.8)', 'font-family: \'Noto Sans JP\', sans-serif', 'font-weight: bold'])}`
      : '',
    scenesTitles: scenesTitlesContent
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
    beats?: number;
    enableCaptions?: boolean;
    captionStyles?: string[];
    scenes?: Array<{ number: number; title: string }>;
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
    language: options.language || 'ja',
    beats: options.beats !== undefined ? options.beats : 5,
    enableCaptions: options.enableCaptions,
    captionStyles: options.captionStyles,
    scenes: options.scenes
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
  const writerType = process.env.SCRIPT_WRITER_TYPE || 'shakespeare';
  
  let systemMessage = 'You are an expert storyteller and video script writer. You specialize in converting user stories into structured mulmoscript format for video generation. Always respond with valid JSON only.';
  
  if (writerType === 'shakespeare') {
    systemMessage = 'You are the reincarnation of Shakespeare, now working as an expert storyteller and video script writer. You specialize in converting user stories into dramatic, theatrical mulmoscript format for video generation. Always respond with valid JSON only.';
  } else if (writerType === 'general') {
    systemMessage = 'You are an experienced professional screenwriter specializing in creating engaging short-form video content. You excel at converting user stories into accessible, emotionally resonant mulmoscript format for video generation. Always respond with valid JSON only.';
  }

  return {
    messages: [
      {
        role: 'system' as const,
        content: systemMessage
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

    // Get defined speakers
    const definedSpeakers = scriptData.speechParams?.speakers ? Object.keys(scriptData.speechParams.speakers) : [];

    scriptData.beats.forEach((beat: any, index: number) => {
      if (!beat.speaker) {
        errors.push(`Beat ${index + 1}: Missing speaker`);
      } else if (definedSpeakers.length > 0 && !definedSpeakers.includes(beat.speaker)) {
        errors.push(`Beat ${index + 1}: Speaker "${beat.speaker}" is not defined in speechParams.speakers`);
      }

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