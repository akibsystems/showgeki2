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
    audioScore: Record<string, number>;
    notes?: string;
  }[];
  summary: {
    overallVisualScore: number;
    overallAudioScore: number;
    totalScenes: number;
    charactersDetected: string[];
    issues?: string[];
  };
}

// ================================================================
// Constants
// ================================================================

export const CONSISTENCY_CHECK_PROMPT = `
動画を分析し、登場人物の視覚的・音声的一貫性を評価してください。
人物名とnotesは日本語で回答してください。
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
      "notes": "特記事項があれば記載"
    }
  ],
  "summary": {
    "overallVisualScore": 91,
    "overallAudioScore": 92,
    "totalScenes": 5,
    "charactersDetected": ["Character A", "Character B"],
    "issues": ["Character Aの服装がシーン3で変化"]
  }
}

評価基準：
1. 動画をシーン単位に分割し、各シーンの開始・終了時間を記録
2. 各シーンに登場する人物を特定し、名前またはIDで識別
3. visualScore: 同一人物の顔・髪型・服装の一貫性を0-100で評価
4. audioScore: 声の性別適合性・一貫性を0-100で評価
5. 重大な不整合がある場合はissuesに記載

スコアリング基準：
- 90-100: 優秀（一貫性が高い）
- 70-89: 良好（軽微な不整合）
- 50-69: 要改善（明らかな不整合）
- 0-49: 不良（重大な不整合）
`;

// ================================================================
// Helper Functions
// ================================================================

export function calculateAverageScore(scores: Record<string, number>[]): number {
  const allScores = scores.flatMap(scoreObj => Object.values(scoreObj));
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
      if (score < 70) {
        issues.push(`Scene ${scene.index}: ${character} has low audio consistency (${score})`);
      }
    });
  });

  return issues;
}