import { GoogleGenerativeAI } from '@google/generative-ai';

// ================================================================
// Gemini API Client
// ================================================================

if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set. Video consistency checks will not be available.');
}

export const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ================================================================
// Types
// ================================================================

export interface ConsistencyCheckResult {
  scenes: {
    index: number;
    timeRange?: {
      start: number;
      end: number;
    };
    characters: string[];
    visualScore: Record<string, number>;
    audioScore: Record<string, number | null>;
    notes?: string;
    beatIndex?: number;
    expectedSpeaker?: string;
    expectedText?: string;
    expectedVoice?: string;
    expectedImageDescription?: string;
    scriptAdherence?: number;
  }[];
  summary: {
    overallVisualScore: number;
    overallAudioScore: number;
    overallScriptAdherence: number;
    visualScoreReason: string;
    audioScoreReason: string;
    scriptAdherenceReason: string;
    totalScenes: number;
    charactersDetected: string[];
    charactersExpected: string[];
    issues?: {
      description: string;
      reason: string;
      severity: 'low' | 'medium' | 'high';
      category: 'visual' | 'audio' | 'script' | 'timing';
    }[];
  };
}

// ================================================================
// Constants
// ================================================================

export const CONSISTENCY_CHECK_PROMPT = `
動画を分析し、登場人物の視覚的・音声的一貫性を評価してください。
人物名、理由説明、問題の詳細は日本語で回答してください。
応答は純粋なJSONのみで、余計な説明文は含めないでください。
以下の正確なJSON形式で応答してください：

{
  "scenes": [
    {
      "index": 1,
      "timeRange": { "start": 0, "end": 5.2 },
      "characters": ["Character A", "Character B"],
      "visualScore": { "Character A": 95, "Character B": 88 },
      "audioScore": { "Character A": 90, "Character B": 93 },
      "notes": "Character Aの髪型が一貫しているが、Character Bの服装に若干の変化が見られる"
    }
  ],
  "summary": {
    "overallVisualScore": 91,
    "overallAudioScore": 92,
    "visualScoreReason": "全体的に登場人物の外見は一貫している。髪型、顔の特徴は安定しているが、一部のシーンで服装に軽微な変化が見られる。",
    "audioScoreReason": "音声の一貫性は高く、各キャラクターの声質が安定している。性別と声の適合性も良好で、聞き取りやすい。",
    "totalScenes": 5,
    "charactersDetected": ["Character A", "Character B"],
    "issues": [
      {
        "description": "Character Bの服装がシーン3で変化",
        "reason": "シーン1-2では青いシャツを着用していたが、シーン3では赤いシャツに変わっている。同一人物として認識されにくい可能性がある。",
        "severity": "medium"
      }
    ]
  }
}

評価基準：
1. 動画をシーン単位に分割し、各シーンの開始・終了時間を記録
2. 各シーンに登場する人物を特定し、名前またはIDで識別
3. visualScore: 同一人物の顔・髪型・服装の一貫性を0-100で評価
4. audioScore: 声の性別適合性・一貫性を0-100で評価
5. 問題がある場合は詳細な理由と重要度を記載

スコアリング基準：
- 90-100: 優秀（一貫性が高い）
- 70-89: 良好（軽微な不整合）
- 50-69: 要改善（明らかな不整合）
- 0-49: 不良（重大な不整合）

理由説明の要件：
- visualScoreReason: 視覚的一貫性の総合評価理由（顔、髪型、服装、表情などの具体的な観察結果）
- audioScoreReason: 音声一貫性の総合評価理由（声質、性別適合性、聞き取りやすさなどの具体的な評価）
- issues内のreason: 問題を特定した具体的な根拠と改善提案

重要度の分類：
- high: 同一人物として認識困難レベルの不整合
- medium: 気になるが許容範囲内の変化
- low: わずかな違いだが記録すべき変化
`;

// ================================================================
// Enhanced Consistency Check Prompt (with MulmoScript)
// ================================================================

export function createEnhancedConsistencyCheckPrompt(mulmoscript: any): string {
  const beats = mulmoscript.beats || [];
  const characters = [...new Set(beats.map((beat: any) => beat.speaker).filter(Boolean))];
  const voices = [...new Set(beats.map((beat: any) => beat.voice).filter(Boolean))];
  
  // Create beat-by-beat expectations
  const beatExpectations = beats.map((beat: any, index: number) => {
    const imageDescription = beat.image?.source?.prompt || 'No image description';
    return `Beat ${index + 1}:
  - Speaker: ${beat.speaker || 'Unknown'}
  - Text: "${beat.text || ''}"
  - Voice: ${beat.voice || 'Unknown'}
  - Expected Image: ${imageDescription}
  - Duration: ${beat.duration || 'Unknown'}秒`;
  }).join('\n\n');

  return `
動画とMulmoScriptを詳細に比較し、登場人物の一貫性と台本忠実度を評価してください。
MulmoScriptは動画生成時に使用された正確な台本です。これを基準として評価してください。

=== MULMOSCRIPT情報 ===
期待される登場人物: ${characters.join(', ')}
使用される音声: ${voices.join(', ')}
総Beat数: ${beats.length}

=== BEAT別期待値 ===
${beatExpectations}

=== 評価指示 ===
上記のMulmoScriptと実際の動画を比較し、以下の形式で評価してください：

{
  "scenes": [
    {
      "index": 1,
      "timeRange": { "start": 0, "end": 5.2 },
      "characters": ["太郎", "花子"],
      "visualScore": { "太郎": 95, "花子": 88 },
      "audioScore": { "太郎": 90, "花子": 93 },
      "notes": "太郎の表情が期待値と一致し、花子の服装が台本通り",
      "beatIndex": 1,
      "expectedSpeaker": "太郎",
      "expectedText": "こんにちは、元気ですか？",
      "expectedVoice": "alloy",
      "expectedImageDescription": "笑顔の男性が手を振っている",
      "scriptAdherence": 92
    }
  ],
  "summary": {
    "overallVisualScore": 91,
    "overallAudioScore": 92,
    "overallScriptAdherence": 89,
    "visualScoreReason": "期待されるキャラクターの外見と実際の映像の一致度。髪型、服装、表情が台本の画像プロンプト通りに描画されている。",
    "audioScoreReason": "指定された音声タイプと実際の音声の一致度。声質、性別、話し方が期待値と一致している。",
    "scriptAdherenceReason": "台本の内容と実際の動画の一致度。台詞、タイミング、シーン構成が期待値通りに再現されている。",
    "totalScenes": ${beats.length},
    "charactersDetected": ["太郎", "花子"],
    "charactersExpected": ${JSON.stringify(characters)},
    "issues": [
      {
        "description": "Beat 3で花子の音声が男性的に聞こえる",
        "reason": "指定された音声は'nova'（女性）だが、実際の音声は男性的な特徴を持っている",
        "severity": "high",
        "category": "audio"
      }
    ]
  }
}

=== 詳細評価基準 ===

1. **Visual Score (視覚的一貫性)**:
   - 期待される画像プロンプトとの一致度
   - 同一キャラクターの外見一貫性
   - 表情、服装、髪型の適切性

2. **Audio Score (音声一貫性)**:
   - 指定された音声タイプとの一致度
   - 声の性別、年齢、特徴の適切性
   - 同一キャラクターの音声一貫性

3. **Script Adherence (台本忠実度)**:
   - 台詞内容の正確性
   - シーン構成の適切性
   - タイミングの正確性

4. **Issue Categories**:
   - "visual": 視覚的な問題
   - "audio": 音声的な問題
   - "script": 台本忠実度の問題
   - "timing": タイミングの問題

=== 重要な注意事項 ===
- 各BeatをMulmoScriptの期待値と正確に比較
- 実際の動画から検出された要素を期待値と照合
- 不一致がある場合は具体的な理由を記載
- 全体的な品質だけでなく、台本との整合性を重視
- 日本語で具体的かつ建設的なフィードバックを提供

応答は純粋なJSONのみで、余計な説明文は含めないでください。
`;
}

// ================================================================
// Helper Functions
// ================================================================

export function calculateAverageScore(scores: Record<string, number | null>[]): number {
  const allScores = scores.flatMap(scoreObj => 
    Object.values(scoreObj).filter((score): score is number => score !== null)
  );
  if (allScores.length === 0) return 0;
  return Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length);
}

export function identifyIssues(result: ConsistencyCheckResult): string[] {
  const issues: string[] = [];

  // Check for low visual scores
  result.scenes.forEach(scene => {
    Object.entries(scene.visualScore).forEach(([character, score]) => {
      if (score < 70) {
        issues.push(`Scene ${scene.index}: ${character} has low visual consistency (${score})`);
      }
    });
  });

  // Check for low audio scores
  result.scenes.forEach(scene => {
    Object.entries(scene.audioScore).forEach(([character, score]) => {
      if (score !== null && score < 70) {
        issues.push(`Scene ${scene.index}: ${character} has low audio consistency (${score})`);
      }
    });
  });

  return issues;
}