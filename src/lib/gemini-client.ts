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
  }[];
  summary: {
    overallVisualScore: number;
    overallAudioScore: number;
    visualScoreReason: string;
    audioScoreReason: string;
    totalScenes: number;
    charactersDetected: string[];
    issues?: {
      description: string;
      reason: string;
      severity: 'low' | 'medium' | 'high';
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