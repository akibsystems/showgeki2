# ワークフロー設計ドキュメント

## 概要
誰でも動画作成ができる新しいワークフローシステムの設計仕様書です。

## 全体の流れ
1. ストーリー入力（主ストーリー、主な登場人物説明、ドラマチック転換点入力、未来イメージ、学び）と全体シーン数、設定
2. 劇的シーン一覧（幕と場の構成）修正→確認
3. 登場人物一覧、修正（特別モードで顔など画像upload可）『画像AI生成準備完了』、アニメ風、水彩画風などの画風選択
4. 各シーンのキャラクタのしゃべる台詞と、シーンごとの画像およびプロンプト一覧、修正、CM等追加自分でアップロードした画像を元にシーンを挿入可
5. 音声設定と初期生成AIで音声作成、読み間違い修正
6. シーンごとのBGM一覧、修正（特別モードで音声音楽upload可）、字幕設定『全体動画AI生成準備完了』
7. 完成動画一覧、保存、ダウンロード可

## 画面設計

### 各工程ごとに１つの画面
| ステップ | 画面名 | システム識別子 (ID) | 役割の目安 |
| ---- | ----------- | ------------------------ | --------------- |
| 1 | ストーリー入力 | **01_STORY_INPUT** | 物語の骨子を登録 |
| 2 | 初期幕場レビュー | **02_SCENE_PREVIEW** | 幕・場構成案を確認／修正 |
| 3 | キャラクタ&画風設定 | **03_CHARACTER_STYLE** | 登場人物・顔画像の確定、画風の確定 |
| 4 | 台本＆静止画プレビュー | **04_SCRIPT_PREVIEW** | 台詞・静止画を編集 |
| 5 | 音声生成 | **05_VOICE_GEN** | セリフ音声の合成・再生成 |
| 6 | BGM & 字幕設定 | **06_BGM_SUBTITLE** | BGM選択・字幕タイミング調整 |
| 7 | 最終確認 | **07_CONFIRM_PREVIEW** | 最終確認、タイトルの変更、動画生成の開始 |

### 主要な設計要件
- 現在どこのステップにいるかすぐにわかるようにすること
- これまでに完了したステップにはすぐに戻ることができて、再編集することが可能
- 1-3はそれ以降のステップの前提となるので、再編集したらまた次のステップ以降はやり直し
- ステップ4は全体をStoryboardとして構成し、各シーンごとに分割、上から下に一ページで順に並べる
- 各シーンは左側にプレビュー画像、右側に画像プロンプト、下に台詞を表示

## モバイル画面設計（スマートフォン）

### ステップ1: ストーリー入力 (01_STORY_INPUT)
```
┌─────────────────────────┐
│ [←] ステップ 1/7        │
│                         │
│ ストーリーを入力        │
│ ─────────────────────  │
│                         │
│ [主なストーリー]        │
│ ┌─────────────────┐    │
│ │                 │    │
│ │ (テキストエリア) │    │
│ │                 │    │
│ └─────────────────┘    │
│                         │
│ [主な登場人物]          │
│ ┌─────────────────┐    │
│ │                 │    │
│ └─────────────────┘    │
│                         │
│ [ドラマチック転換点]    │
│ ┌─────────────────┐    │
│ │                 │    │
│ └─────────────────┘    │
│                         │
│ [詳細設定 ▼]           │
│                         │
│ [次へ →]                │
└─────────────────────────┘
```

### ステップ4: 台本＆静止画プレビュー (04_SCRIPT_PREVIEW)
```
┌─────────────────────────┐
│ [←] ステップ 4/7        │
│                         │
│ シーン構成              │
│ ─────────────────────  │
│                         │
│ ▼第1幕: 運命の出会い    │
│                         │
│ ┌─────────────────┐    │
│ │ シーン1: 序章    │    │
│ │ [画像プレビュー] │    │
│ │                 │    │
│ │ プロンプト:      │    │
│ │ [編集可能]       │    │
│ │                 │    │
│ │ セリフ:          │    │
│ │ "ああ、運命よ..." │    │
│ └─────────────────┘    │
│                         │
│ ┌─────────────────┐    │
│ │ シーン2: 葛藤    │    │
│ │ [画像プレビュー] │    │
│ │ ...              │    │
│ └─────────────────┘    │
│                         │
│ ▼第2幕: 試練と成長     │
│                         │
│ [前へ] [次へ →]         │
└─────────────────────────┘
```

## PC画面設計（デスクトップ）

### ステップ1: ストーリー入力
```
┌────────────────────────────────────────────────────────┐
│ ステップ 1/7: ストーリー入力                            │
│                                                        │
│ ┌─ 進行状況 ─────────────────────────────────────┐    │
│ │ ●──○──○──○──○──○──○                          │    │
│ └────────────────────────────────────────────────┘    │
│                                                        │
│ ┌─────────────────┬─────────────────────────────┐    │
│ │ 主なストーリー   │ [ヒント]                    │    │
│ │                 │ • 将来の夢や目標を具体的に   │    │
│ │ [テキストエリア] │ • 主人公の感情や葛藤を含める │    │
│ │                 │ • 500文字程度が理想的       │    │
│ ├─────────────────┼─────────────────────────────┤    │
│ │ 主な登場人物     │ 例: 太郎(主人公)、花子(友人) │    │
│ │ [入力欄]         │                            │    │
│ ├─────────────────┼─────────────────────────────┤    │
│ │ 転換点           │ 物語の山場となる出来事      │    │
│ │ [入力欄]         │                            │    │
│ └─────────────────┴─────────────────────────────┘    │
│                                                        │
│ [詳細設定] シーン数: [5▼] スタイル: [シェイクスピア風▼]  │
│                                                        │
│                              [キャンセル] [次へ →]      │
└────────────────────────────────────────────────────────┘
```

### ステップ4: 台本＆静止画プレビュー（Storyboard形式）
```
┌────────────────────────────────────────────────────────┐
│ ステップ 4/7: 台本＆静止画プレビュー                    │
│                                                        │
│ ┌─ 進行状況 ─────────────────────────────────────┐    │
│ │ ●──●──●──●──○──○──○                          │    │
│ └────────────────────────────────────────────────┘    │
│                                                        │
│ ═══ 第1幕: 運命の出会い ═══════════════════════════    │
│                                                        │
│ ┌────────────────────────────────────────────────┐    │
│ │ シーン1: 序章                                    │    │
│ │ ┌─────────┬─────────────────────────────────┐ │    │
│ │ │[画像]   │ プロンプト:                      │ │    │
│ │ │         │ 夕暮れの教室で一人佇む主人公...   │ │    │
│ │ │         │ [編集]                          │ │    │
│ │ └─────────┴─────────────────────────────────┘ │    │
│ │ セリフ: "ああ、運命よ、なぜ私をこのような..." │    │
│ │ 話者: [主人公▼]                              │    │
│ └────────────────────────────────────────────────┘    │
│                                                        │
│ ┌────────────────────────────────────────────────┐    │
│ │ シーン2: 葛藤                                    │    │
│ │ ┌─────────┬─────────────────────────────────┐ │    │
│ │ │[画像]   │ プロンプト:                      │ │    │
│ │ │         │ 激しい雨の中での対話シーン...     │ │    │
│ │ │         │ [編集]                          │ │    │
│ │ └─────────┴─────────────────────────────────┘ │    │
│ │ セリフ: "友よ、なぜ私を裏切るのか..."         │    │
│ │ 話者: [主人公▼]                              │    │
│ └────────────────────────────────────────────────┘    │
│                                                        │
│ ═══ 第2幕: 試練と成長 ═════════════════════════════    │
│                                                        │
│ [シーンを追加]                    [← 前へ] [次へ →]    │
└────────────────────────────────────────────────────────┘
```

## データベース設計

### workflowsテーブル
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL,
  workspace_id UUID REFERENCES workspaces(id),
  title TEXT,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active', -- active, completed, archived
  step1_json JSONB,
  step2_json JSONB,
  step3_json JSONB,
  step4_json JSONB,
  step5_json JSONB,
  step6_json JSONB,
  script_json JSONB, -- 最終的なMulmoScript
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_workflows_uid ON workflows(uid);
CREATE INDEX idx_workflows_workspace_id ON workflows(workspace_id);
CREATE INDEX idx_workflows_status ON workflows(status);
```

### URL設計
- 基本URL: `https://localhost:3000/workflow/[workflow_id]?step=x` (x=1〜7)
- ワークフローがactiveでありかつ、それまでのステップが完了していれば表示可能
- トップページの「脚本をつくる」ボタンから、ワークフローのステップ1の画面に遷移

## 各ステップの入出力JSONスキーマ

### ステップ1: ストーリー入力 (01_STORY_INPUT)
**入力**: なし（初期ステップ）
**出力**:
```typescript
interface Step1Json {
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
```

### ステップ2: 初期幕場レビュー (02_SCENE_PREVIEW)
**入力**: Step1Json
**出力**:
```typescript
interface Step2Json {
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
```

### ステップ3: キャラクタ&画風設定 (03_CHARACTER_STYLE)
**入力**: Step2Json
**出力**:
```typescript
interface Step3Json {
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
```

### ステップ4: 台本＆静止画プレビュー (04_SCRIPT_PREVIEW)
**入力**: Step3Json
**出力**:
```typescript
interface Step4Json {
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
```

### ステップ5: 音声生成 (05_VOICE_GEN)
**入力**: Step4Json
**出力**:
```typescript
interface Step5Json {
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
```

### ステップ6: BGM & 字幕設定 (06_BGM_SUBTITLE)
**入力**: Step5Json
**出力**:
```typescript
interface Step6Json {
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
```

### ステップ7: 最終確認 (07_CONFIRM_PREVIEW)
**入力**: すべての前ステップのJSONを統合
**出力**: 
```typescript
interface MulmoScript {
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
```

## 実装に関する重要事項

### コンポーネント構成
- components/workflow以下に独立したコンポーネントとして作成
- 各ステップへの入出力はJSON形式
- 各ステップへの入力JSONとユーザーの入力をもとに、LLMを使ってそのステップでの出力JSONを生成

### 既存コンポーネントの再利用
- 画風設定: `/src/components/editor/script-director/components/ImageSettings.tsx`を参照
- 音声設定: `/src/components/editor/script-director/components/SpeechSettings.tsx`を参照
- BGM設定: `/src/components/editor/script-director/components/AudioSettings.tsx`を参照
- 字幕設定: `/src/components/editor/script-director/components/CaptionSettings.tsx`を参照

### 認証とセキュリティ
- APIの認証は現在のバージョンと同じ仕組みを継続
- videosテーブルは現在のものを変更せずにそのまま利用

### MulmoScript生成
- ステップ6が完了した時点でMulmoScriptを生成
- 初期実装はモックで良い（各ステップで生成された結果から作成）