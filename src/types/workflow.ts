/**
 * ワークフローシステムの型定義
 */

// ============= 基本型 =============

/** ワークフローの状態 */
export type WorkflowStatus = 'active' | 'completed' | 'archived';

/** ワークフローの状態管理 */
export interface WorkflowState {
  id: string;
  currentStep: number;
  canProceed: boolean;
  canGoBack: boolean;
  completedSteps: number[];
}

/** ワークフローテーブルの型 */
export interface Workflow {
  id: string;
  uid: string;
  workspace_id: string | null;
  title: string | null;
  current_step: number;
  status: WorkflowStatus;
  step1_json: Step1Json | null;
  step2_json: Step2Json | null;
  step3_json: Step3Json | null;
  step4_json: Step4Json | null;
  step5_json: Step5Json | null;
  step6_json: Step6Json | null;
  script_json: MulmoScript | null;
  created_at: string;
  updated_at: string;
}

// ============= ステップ1: ストーリー入力 =============

export interface Step1Json {
  // ユーザーが入力した内容
  userInput: {
    storyText: string;           // 主なストーリー
    characters: string;          // 主な登場人物説明
    dramaticTurningPoint: string; // ドラマチック転換点
    futureVision: string;        // 未来イメージ
    learnings: string;           // 学び
    totalScenes: number;         // 全体シーン数 (1-20)
    settings: {
      style: string;             // スタイル設定（シェイクスピア風など）
      language: string;          // 言語設定 (ja/en)
    };
  };
  
  // LLMが生成した次ステップ用の初期表示内容
  generatedContent: {
    suggestedTitle: string;      // 提案されたタイトル
    acts: Array<{                // 幕と場の構成案
      actNumber: number;         // 幕番号
      actTitle: string;          // 幕タイトル
      scenes: Array<{
        sceneNumber: number;     // 場番号
        sceneTitle: string;      // 場タイトル
        summary: string;         // シーン概要
      }>;
    }>;
    charactersList: Array<{      // 登場人物リスト案
      name: string;
      role: string;
      personality: string;
    }>;
  };
}

// ============= ステップ2: 初期幕場レビュー =============

export interface Step2Json {
  // ユーザーが編集・確認した内容
  userInput: {
    title: string;               // 作品タイトル
    acts: Array<{
      actNumber: number;         // 幕番号
      actTitle: string;          // 幕タイトル
      scenes: Array<{
        sceneNumber: number;     // 場番号
        sceneTitle: string;      // 場タイトル
        summary: string;         // シーン概要
      }>;
    }>;
  };
  
  // LLMが生成した次ステップ用の初期表示内容
  generatedContent: {
    detailedCharacters: Array<{  // 詳細化されたキャラクター情報
      id: string;
      name: string;
      personality: string;
      visualDescription: string;
      role: string;
    }>;
    suggestedImageStyle: {       // 推奨される画風
      preset: string;
      description: string;
    };
  };
}

// ============= ステップ3: キャラクタ&画風設定 =============

export interface Step3Json {
  // ユーザーが編集・確認した内容
  userInput: {
    characters: Array<{
      id: string;                // キャラクターID
      name: string;              // キャラクター名
      description: string;       // 説明
      faceReference?: {          // 顔参照画像
        url: string;
        storagePath?: string;
      };
    }>;
    imageStyle: {
      preset: string;            // 画風プリセット
      customPrompt?: string;     // カスタムプロンプト
    };
  };
  
  // LLMが生成した次ステップ用の初期表示内容
  generatedContent: {
    acts: Array<{                // 幕と場の構成（詳細な台本付き）
      actNumber: number;         // 幕番号
      actTitle: string;          // 幕タイトル
      scenes: Array<{
        sceneNumber: number;     // 場番号
        sceneTitle: string;      // 場タイトル
        summary: string;         // シーン概要
        dialogues: Array<{       // このシーンのセリフ
          speaker: string;       // キャラクターID
          text: string;          // セリフ
        }>;
        imagePrompt: string;     // 画像生成用プロンプト
        duration?: number;       // 推定秒数（オプション）
      }>;
    }>;
  };
}

// ============= ステップ4: 台本＆静止画プレビュー =============

export interface Step4Json {
  // ユーザーが編集・確認した内容
  userInput: {
    acts: Array<{                 // 幕と場の構成（編集済み台本）
      actNumber: number;          // 幕番号
      actTitle: string;           // 幕タイトル
      scenes: Array<{
        sceneNumber: number;      // 場番号
        sceneTitle: string;       // 場タイトル
        summary: string;          // シーン概要
        dialogues: Array<{        // このシーンのセリフ
          speaker: string;        // キャラクターID
          text: string;           // セリフ
        }>;
        imagePrompt: string;      // 画像プロンプト
        imageUrl?: string;        // 生成された画像URL
        customImage?: {           // カスタム画像（CM等）
          url: string;
          storagePath?: string;
        };
      }>;
    }>;
  };
  
  // LLMが生成した次ステップ用の初期表示内容
  generatedContent: {
    voiceAssignments: Record<string, { // 話者への音声割り当て案
      voiceId: string;            // OpenAI音声ID
      voiceDescription: string;   // 音声の説明
    }>;
    pronunciation: Array<{        // 読み方の注意点
      actNumber: number;
      sceneNumber: number;
      originalText: string;
      suggestedReading: string;
    }>;
  };
}

// ============= ステップ5: 音声生成 =============

export interface Step5Json {
  // ユーザーが編集・確認した内容
  userInput: {
    speakers: Record<string, {
      voiceId: string;           // OpenAI音声ID
      displayName: {
        ja: string;
        en: string;
      };
    }>;
    audioFiles: Array<{
      actNumber: number;
      sceneNumber: number;
      audioUrl: string;          // 生成された音声URL
      correctedText?: string;    // 読み間違い修正済みテキスト
    }>;
  };
  
  // LLMが生成した次ステップ用の初期表示内容
  generatedContent: {
    bgmSuggestions: Array<{      // BGM候補
      url: string;
      description: string;
      mood: string;
    }>;
    captionSettings: {           // 字幕設定案
      enabled: boolean;
      lang: string;
      stylePreset: string;
    };
  };
}

// ============= ステップ6: BGM & 字幕設定 =============

export interface Step6Json {
  // ユーザーが編集・確認した内容
  userInput: {
    bgm: {
      url: string;               // BGM URL
      volume: number;            // 音量 (0-1)
      customBgm?: {              // カスタムBGM
        url: string;
        storagePath?: string;
      };
    };
    caption: {
      enabled: boolean;          // 字幕有効/無効
      lang: string;              // 字幕言語
      styles: string[];          // CSSスタイル
    };
  };
  
  // LLMが生成した次ステップ用の初期表示内容
  generatedContent: {
    finalTitle: string;          // 最終タイトル案
    description: string;         // 作品説明文
    tags: string[];              // タグ候補
    estimatedDuration: number;   // 推定動画時間（秒）
  };
}

// ============= MulmoScript =============

export interface MulmoScript {
  $mulmocast: { version: string };
  title: string;
  lang: string;
  beats: Array<{                 // MulmoScriptではbeatsという名前を使用
    text: string;
    speaker: string;
    imagePrompt?: string;
    image?: { source: { url: string } };
  }>;
  speechParams: {
    provider: string;
    speakers: Record<string, {
      voiceId: string;
      displayName: { ja: string; en: string };
    }>;
  };
  imageParams: {
    style?: string;
    images?: Record<string, {
      name: string;
      source: { url: string };
    }>;
  };
  audioParams?: {
    bgm: { kind: 'url'; url: string };
    bgmVolume: number;
  };
  captionParams?: {
    lang: string;
    styles: string[];
  };
}

// ============= ヘルパー型 =============

/** 画風プリセット */
export const IMAGE_STYLE_PRESETS = {
  anime: 'アニメ風、ソフトパステルカラー、繊細な線画、シネマティック照明',
  watercolor: '水彩画風、淡い色調、柔らかな筆致、芸術的な雰囲気',
  oil: '油絵風、重厚な色彩、印象派的な筆使い、豊かな質感',
  comic: 'コミック風、はっきりした線画、鮮やかな色彩、ダイナミックな構図',
  realistic: 'リアリスティック、写実的、自然な照明、高精細',
} as const;

/** OpenAI音声ID */
export type VoiceId = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';

/** 音声の説明 */
export const VOICE_DESCRIPTIONS: Record<VoiceId, string> = {
  alloy: '中性的で落ち着いた声',
  echo: '男性的で深みのある声',
  fable: '若々しく明るい女性の声',
  nova: 'エネルギッシュな女性の声',
  onyx: '重厚で威厳のある男性の声',
  shimmer: '優しく柔らかな女性の声',
};