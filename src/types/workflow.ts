// ワークフロー関連の型定義

// プロジェクト関連
export interface Project {
  id: string;
  uid: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

// ストーリーボード関連
export interface Storyboard {
  id: string;
  project_id: string;
  uid: string;
  title?: string;
  status: 'draft' | 'completed' | 'archived';

  // カテゴリ別生成データ
  story_data?: StoryData; // Step1で保存されるユーザー入力データ
  summary_data?: SummaryData;
  acts_data?: ActsData;
  characters_data?: CharactersData;
  scenes_data?: ScenesData;
  audio_data?: AudioData;
  style_data?: StyleData;
  caption_data?: CaptionData;

  // 最終的なMulmoScript
  mulmoscript?: MulmoScript;

  created_at: string;
  updated_at: string;
}

// Step1で保存されるユーザー入力データ
export interface StoryData {
  originalText: string;
  characters: string;
  dramaticTurningPoint: string;
  futureVision: string;
  learnings: string;
  totalScenes: number;
  settings: {
    style: string;
    language: string;
  };
}

// カテゴリ別データ型定義
export interface SummaryData {
  title: string;
  description: string;
  genre: string;
  tags: string[];
  estimatedDuration: number;
}

export interface ActsData {
  acts: Array<{
    actNumber: number;
    actTitle: string;
    description?: string;  // オプショナルに変更
    scenes: Array<{
      sceneNumber: number;
      sceneTitle: string;
      summary: string;
    }>;
  }>;
}

export interface CharactersData {
  characters: Array<{
    id: string;
    name: string;
    role: string;
    personality: string;
    visualDescription: string;
    faceReference?: string; // 顔参照画像URL
    voiceType?: string;
  }>;
}

export interface ScenesData {
  scenes: Array<{
    id: string;
    actNumber: number;
    sceneNumber: number;
    title: string;
    imagePrompt: string;
    imageUrl?: string;
    dialogue: Array<{
      speaker: string;
      text: string;
      emotion?: string;
    }>;
    charactersInScene?: string[]; // 新規追加：このシーンに登場するキャラクターIDの配列
  }>;
}

export interface AudioData {
  voiceSettings?: {
    [characterId: string]: {
      voiceType: string;
      pitch?: number;
      speed?: number;
    };
  };
  bgmSettings?: {
    defaultBgm: string;
    customBgm?: {
      url: string;
    };
    bgmVolume?: number;
    sceneBgm?: {
      [sceneId: string]: string;
    };
  };
  // generate-script/route.tsが期待する形式
  bgm?: {
    selected: string;
    customBgm?: string;
    volume: number;
  };
}

export interface StyleData {
  imageStyle: string; // アニメ風、水彩画風など
  customPrompt?: string;
  colorPalette?: string[];
}

export interface CaptionData {
  enabled: boolean;
  language: string;
  styles?: string[]; // mulmocast形式のCSS配列
  style?: { // 旧形式との互換性のため
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    position: 'top' | 'bottom';
  };
}

// MulmoScript型
export interface MulmoScript {
  $mulmocast: { version: string };
  title: string;
  lang: string;
  beats: Array<{
    text: string;
    speaker: string;
    imagePrompt?: string;
    image?: { source: { url: string } };
    imageNames?: string[]; // 新規追加：このビートで使用する参照画像の名前
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
    quality?: string;
    model?: string;
    provider?: string;
    images?: Record<string, {
      name?: string;
      type?: string;
      source: {
        kind?: string;
        url?: string;
        path?: string;
      };
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

// ワークフロー関連
export interface Workflow {
  id: string;
  storyboard_id: string;
  uid: string;
  current_step: number;
  status: 'active' | 'completed' | 'archived';

  // 表示用データ（キャッシュ）
  step1_in?: Step1Input;
  step2_in?: Step2Input;
  step3_in?: Step3Input;
  step4_in?: Step4Input;
  step5_in?: Step5Input;
  step6_in?: Step6Input;
  step7_in?: Step7Input;

  // ユーザー入力データ
  step1_out?: Step1Output;
  step2_out?: Step2Output;
  step3_out?: Step3Output;
  step4_out?: Step4Output;
  step5_out?: Step5Output;
  step6_out?: Step6Output;
  step7_out?: Step7Output;

  created_at: string;
  updated_at: string;
}

// ワークフロー状態管理
export interface WorkflowState {
  id: string;
  currentStep: number;
  canProceed: boolean;
  canGoBack: boolean;
  completedSteps: number[];
}

// 各ステップのInput/Output型定義

// Step 1: ストーリー入力
export interface Step1Input {
  // 初期表示時は空（最初のステップのため）
}

export interface Step1Output {
  userInput: {
    storyText: string;
    characters: string;
    dramaticTurningPoint: string;
    futureVision: string;
    learnings: string;
    totalScenes: number;
    settings: {
      style: string;
      language: string;
    };
  };
}

// Step 2: 初期幕場レビュー
export interface Step2Input {
  // storyboardsから生成される表示用データ
  suggestedTitle: string;
  acts: Array<{
    actNumber: number;
    actTitle: string;
    scenes: Array<{
      sceneNumber: number;
      sceneTitle: string;
      summary: string;
    }>;
  }>;
  charactersList: Array<{
    id: string;
    name: string;
    role: string;
    personality: string;
  }>;
}

export interface Step2Output {
  userInput: {
    title: string;
    acts: Array<{
      actNumber: number;
      actTitle: string;
      scenes: Array<{
        sceneNumber: number;
        sceneTitle: string;
        summary: string;
      }>;
    }>;
  };
}

// Step 3: キャラクタ&画風設定
export interface Step3Input {
  // 前ステップから引き継がれるデータ
  title: string;
  detailedCharacters: Array<{
    id: string;
    name: string;
    role: string;
    personality: string;
    visualDescription: string;
  }>;
}

export interface Step3Output {
  userInput: {
    characters: Array<{
      id: string;
      name: string;
      description: string;
      faceReference?: string; // アップロードされた画像URL
    }>;
    imageStyle: {
      preset: string;
      customPrompt?: string;
    };
  };
}

// Step 4: 台本＆静止画プレビュー
export interface Step4Input {
  title: string;
  acts: Array<{
    actNumber: number;
    actTitle: string;
  }>;
  scenes: Array<{
    id: string;
    actNumber: number;
    sceneNumber: number;
    title: string;
    imagePrompt: string;
    dialogue: Array<{
      speaker: string;
      text: string;
    }>;
  }>;
}

export interface Step4Output {
  userInput: {
    scenes: Array<{
      id: string;
      imagePrompt: string;
      dialogue: Array<{
        speaker: string;
        text: string;
      }>;
      customImage?: string; // CMなどのアップロード画像
      charactersInScene?: string[]; // 新規追加：このシーンに登場するキャラクターIDの配列
    }>;
  };
}

// Step 5: 音声生成
export interface Step5Input {
  characters: Array<{
    id: string;
    name: string;
    suggestedVoice: string;
  }>;
  scenes: Array<{
    id: string;
    title: string;
    dialogue: Array<{
      speaker: string;
      text: string;
      audioUrl?: string;
    }>;
  }>;
}

export interface Step5Output {
  userInput: {
    voiceSettings: {
      [characterId: string]: {
        voiceType: string;
        corrections?: {
          [sceneId: string]: {
            [dialogueIndex: number]: string; // 読み修正
          };
        };
      };
    };
  };
}

// Step 6: BGM & 字幕設定
export interface Step6Input {
  suggestedBgm: string;
  bgmOptions: string[];
  captionSettings: {
    enabled: boolean;
    language: string;
    styles?: string[]; // mulmocast形式のCSS配列
  };
}

export interface Step6Output {
  userInput: {
    bgm: {
      selected: string;
      customBgm?: string; // アップロードされたBGM URL
      volume: number;
    };
    caption: {
      enabled: boolean;
      language: string;
      styles: string[]; // mulmocast形式のCSS配列
    };
  };
}

// Step 7: 最終確認
export interface Step7Input {
  title: string;
  description: string;
  thumbnails: Array<{
    sceneId: string;
    imageUrl: string;
  }>;
  estimatedDuration: number;
  preview: MulmoScript;
}

export interface Step7Output {
  userInput: {
    title: string;
    description: string;
    tags: string[];
    confirmed: boolean;
  };
}

// API レスポンス型
export interface StepResponse {
  stepInput: Step1Input | Step2Input | Step3Input | Step4Input | Step5Input | Step6Input | Step7Input;
  stepOutput?: Step1Output | Step2Output | Step3Output | Step4Output | Step5Output | Step6Output | Step7Output;
  canEdit: boolean;
  canProceed: boolean;
}

// エラー型
export interface WorkflowError {
  code: string;
  message: string;
  step?: number;
  field?: string;
}

// ============= ヘルパー型と定数 =============

/** 画風プリセット */
export const IMAGE_STYLE_PRESETS = {
  anime: 'アニメ風、ソフトパステルカラー、繊細な線画、シネマティック照明',
  watercolor: '水彩画風、淡い色調、柔らかな筆致、芸術的な雰囲気',
  oil: '油絵風、重厚な色彩、印象派的な筆使い、豊かな質感',
  comic: 'コミック風、はっきりした線画、鮮やかな色彩、ダイナミックな構図',
  realistic: 'リアリスティック、写実的、自然な照明、高精細',
} as const;

/** OpenAI音声ID */
export type VoiceId =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'fable'
  | 'nova'
  | 'onyx'
  | 'sage'
  | 'shimmer'
  | 'verse';

/** 音声の説明 */
export const VOICE_DESCRIPTIONS: Record<VoiceId, string> = {
  alloy: '中性的で落ち着いた声',
  ash: '中性的で歯切れの良いビジネス向きの声',
  ballad: '滑らかで情感豊かな中性的な声',
  coral: '親しみやすく温かい女性の声',
  echo: '男性的で深みのある信頼感のある声',
  fable: '明瞭でエネルギッシュな男性の声',
  nova: '明るく会話的な若々しい女性の声',
  onyx: '重厚で威厳のある男性の声',
  sage: '穏やかで思慮深い中性的な声',
  shimmer: '優しく柔らかく明快な女性の声',
  verse: '多彩で表現力豊かな中性的な声',
};
