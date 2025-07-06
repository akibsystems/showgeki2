# 脚本生成API 実装詳細ドキュメント

## 概要

脚本生成APIは、ユーザーが入力したストーリーテキストからOpenAI GPT-4を使用してシェイクスピア風の5幕構成の脚本を自動生成します。生成された脚本はMulmoScript形式のJSONとして保存されます。

## APIエンドポイント

### POST `/api/stories/[id]/generate-script`

**リクエスト**:
```typescript
{
  // オプション
  options?: {
    beats?: number;        // シーン数（1-20、デフォルト: 5）
    style?: string;        // 画像スタイル
    regenerate?: boolean;  // 再生成フラグ
  }
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    script: MulmoScript;
    generationTime: number;
  }
}
```

## 実装詳細

### 1. メインハンドラー

```typescript
// app/api/stories/[id]/generate-script/route.ts
export const POST = withAuth(async (
  request: NextRequest,
  auth: AuthContext,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const body = await request.json();
  const options = body.options || {};
  
  // ストーリー取得
  const story = await getStoryWithAuth(id, auth.uid);
  if (!story) {
    return NextResponse.json(
      { error: 'Story not found', type: ErrorType.NOT_FOUND },
      { status: 404 }
    );
  }
  
  // 既存の脚本チェック
  if (story.script_json && !options.regenerate) {
    return NextResponse.json({
      success: true,
      data: { script: story.script_json }
    });
  }
  
  // レート制限チェック
  const rateLimitKey = `generate-script:${auth.uid}`;
  if (!checkRateLimit(rateLimitKey, 10, 300000)) { // 5分に10回
    return NextResponse.json(
      { error: 'Rate limit exceeded', type: ErrorType.RATE_LIMIT },
      { status: 429 }
    );
  }
  
  try {
    // 脚本生成
    const script = await generateScript(story, options);
    
    // データベース更新
    await updateStoryScript(id, script, auth.uid);
    
    return NextResponse.json({
      success: true,
      data: { 
        script,
        generationTime: Date.now() - startTime
      }
    });
  } catch (error) {
    console.error('Script generation error:', error);
    return handleScriptGenerationError(error);
  }
});
```

### 2. GPT-4プロンプト構築

```typescript
// lib/script-generator.ts
export async function generateScript(
  story: Story,
  options: GenerateOptions
): Promise<MulmoScript> {
  const beats = options.beats || 5;
  const imageStyle = options.style || "ジブリ風アニメーション、ソフトパステルカラー";
  
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(story, beats, imageStyle);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.8,
    max_tokens: 4000,
    response_format: { type: "json_object" }
  });
  
  const rawScript = JSON.parse(completion.choices[0].message.content);
  return convertToMulmoScript(rawScript, imageStyle);
}
```

### 3. プロンプトテンプレート

```typescript
function buildSystemPrompt(): string {
  return `あなたは優れた脚本家です。ユーザーのストーリーをシェイクスピア風の感動的な5幕構成の脚本に変換してください。

要件：
1. 古典的な5幕構成（導入・展開・転換・クライマックス・結末）
2. 詩的で格調高い日本語の台詞
3. 各シーンは30秒以内で表現可能な長さ
4. 明確なキャラクター設定
5. 視覚的に美しいシーン描写

出力形式：
{
  "title": "脚本のタイトル",
  "characters": {
    "キャラクター名": {
      "description": "キャラクターの説明",
      "voice": "音声の特徴"
    }
  },
  "acts": [
    {
      "actNumber": 1,
      "title": "第1幕のタイトル",
      "scenes": [
        {
          "speaker": "キャラクター名",
          "dialogue": "台詞",
          "imagePrompt": "シーンの視覚的描写"
        }
      ]
    }
  ]
}`;
}

function buildUserPrompt(story: Story, beats: number, style: string): string {
  return `以下のストーリーを${beats}シーンのシェイクスピア風脚本に変換してください。

【ストーリー】
${story.text_raw}

【画像スタイル】
${style}

【追加要件】
- 全体で${beats}シーンになるよう調整
- 各シーンの画像は${style}で統一
- キャラクターの一貫性を保つ
- 感動的なクライマックスを作る`;
}
```

### 4. MulmoScript変換

```typescript
interface RawScript {
  title: string;
  characters: Record<string, { description: string; voice: string }>;
  acts: Array<{
    actNumber: number;
    title: string;
    scenes: Array<{
      speaker: string;
      dialogue: string;
      imagePrompt: string;
    }>;
  }>;
}

function convertToMulmoScript(raw: RawScript, imageStyle: string): MulmoScript {
  // スピーカー情報の構築
  const speakers = buildSpeakers(raw.characters);
  
  // ビート（シーン）の構築
  const beats = raw.acts.flatMap(act => 
    act.scenes.map(scene => ({
      speaker: scene.speaker,
      text: scene.dialogue,
      image: {
        type: 'image' as const,
        source: {
          kind: 'prompt' as const,
          prompt: `${imageStyle}、${scene.imagePrompt}`
        }
      }
    }))
  );
  
  return {
    $mulmocast: { version: '1.0' },
    title: raw.title,
    lang: 'ja',
    beats,
    speechParams: {
      provider: 'openai',
      speakers
    },
    imageParams: {
      aspectRatio: '16:9',
      quality: process.env.OPENAI_IMAGE_QUALITY_DEFAULT || 'medium'
    }
  };
}
```

### 5. スピーカー割り当て

```typescript
function buildSpeakers(
  characters: Record<string, { description: string; voice: string }>
): Record<string, Speaker> {
  const voicePool = [
    { id: 'alloy', type: '中性的' },
    { id: 'echo', type: '男性的' },
    { id: 'fable', type: '英国風' },
    { id: 'nova', type: '女性的' },
    { id: 'onyx', type: '低音男性' },
    { id: 'shimmer', type: '女性的' }
  ];
  
  const speakers: Record<string, Speaker> = {};
  const usedVoices = new Set<string>();
  
  // ナレーター用の音声を確保
  speakers['Narrator'] = {
    voiceId: 'alloy',
    displayName: { en: 'Narrator', ja: 'ナレーター' }
  };
  usedVoices.add('alloy');
  
  // キャラクターごとに音声を割り当て
  Object.entries(characters).forEach(([name, char]) => {
    const suitableVoice = selectVoice(char.voice, voicePool, usedVoices);
    speakers[name] = {
      voiceId: suitableVoice,
      displayName: { en: name, ja: name }
    };
    usedVoices.add(suitableVoice);
  });
  
  return speakers;
}

function selectVoice(
  voiceHint: string,
  pool: Voice[],
  used: Set<string>
): string {
  // 音声のヒントに基づいて適切な音声を選択
  const preferences = {
    '女性': ['nova', 'shimmer'],
    '男性': ['echo', 'onyx'],
    '若い': ['nova', 'echo'],
    '年配': ['onyx', 'fable'],
    '威厳': ['onyx', 'fable']
  };
  
  // ヒントに基づいて優先順位を決定
  for (const [keyword, voiceIds] of Object.entries(preferences)) {
    if (voiceHint.includes(keyword)) {
      for (const voiceId of voiceIds) {
        if (!used.has(voiceId)) {
          return voiceId;
        }
      }
    }
  }
  
  // 使用されていない音声から選択
  return pool.find(v => !used.has(v.id))?.id || 'echo';
}
```

### 6. エラーハンドリング

```typescript
function handleScriptGenerationError(error: any): NextResponse {
  if (error.response?.status === 429) {
    // OpenAI レート制限
    return NextResponse.json(
      {
        error: 'OpenAI API rate limit exceeded',
        type: ErrorType.EXTERNAL_API,
        retryAfter: error.response.headers['retry-after']
      },
      { status: 429 }
    );
  }
  
  if (error.response?.status === 401) {
    // APIキーエラー
    console.error('OpenAI API key error');
    return NextResponse.json(
      {
        error: 'API configuration error',
        type: ErrorType.INTERNAL
      },
      { status: 500 }
    );
  }
  
  if (error.message?.includes('maximum context length')) {
    // トークン制限エラー
    return NextResponse.json(
      {
        error: 'Story is too long',
        type: ErrorType.VALIDATION,
        details: { maxLength: 5000 }
      },
      { status: 400 }
    );
  }
  
  // その他のエラー
  return NextResponse.json(
    {
      error: 'Failed to generate script',
      type: ErrorType.INTERNAL
    },
    { status: 500 }
  );
}
```

### 7. 最適化とキャッシング

```typescript
// キャッシュ実装（将来的な拡張）
interface ScriptCache {
  key: string;
  script: MulmoScript;
  timestamp: number;
}

const scriptCache = new Map<string, ScriptCache>();
const CACHE_TTL = 3600000; // 1時間

function getCachedScript(key: string): MulmoScript | null {
  const cached = scriptCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    scriptCache.delete(key);
    return null;
  }
  
  return cached.script;
}

function cacheScript(key: string, script: MulmoScript): void {
  scriptCache.set(key, {
    key,
    script,
    timestamp: Date.now()
  });
  
  // メモリ制限対策
  if (scriptCache.size > 100) {
    const oldestKey = Array.from(scriptCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    scriptCache.delete(oldestKey);
  }
}
```

### 8. ストリーミング対応（実験的）

```typescript
// ストリーミングレスポンス（将来実装）
export async function* generateScriptStream(
  story: Story,
  options: GenerateOptions
): AsyncGenerator<ScriptChunk> {
  const stream = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [...],
    stream: true
  });
  
  let buffer = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    buffer += delta;
    
    // 完全なJSONオブジェクトが形成されたら yield
    try {
      const parsed = JSON.parse(buffer);
      yield { type: 'complete', data: parsed };
      buffer = '';
    } catch {
      // まだ不完全な場合は進捗を送信
      yield { type: 'progress', data: buffer.length };
    }
  }
}
```

## パフォーマンス指標

- **平均生成時間**: 3-5秒
- **トークン使用量**: 2000-4000トークン/リクエスト
- **成功率**: 95%以上
- **エラー率**: 5%未満（主にレート制限）

## 今後の改善案

1. **プロンプトの最適化**
   - Few-shot learningの導入
   - スタイル別プロンプトテンプレート

2. **キャッシング戦略**
   - Redis導入による分散キャッシュ
   - 類似ストーリーの検出と再利用

3. **ストリーミング対応**
   - リアルタイム生成表示
   - 部分的な編集可能性

4. **多言語対応**
   - 英語脚本の生成
   - 自動翻訳オプション