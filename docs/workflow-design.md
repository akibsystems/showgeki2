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

### projectsテーブル
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active', -- active, archived
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_projects_uid ON projects(uid);
CREATE INDEX idx_projects_status ON projects(status);

-- RLSは使用しない（SERVICE_ROLEでアクセス）
```

### storyboardsテーブル
```sql
CREATE TABLE storyboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, completed, archived
  
  -- カテゴリ別生成データ
  summary_data JSONB,        -- 作品概要・全体情報データ
  acts_data JSONB,           -- 幕場構成データ
  characters_data JSONB,     -- キャラクター設定データ
  scenes_data JSONB,         -- シーン一覧データ
  audio_data JSONB,          -- BGM・音声設定データ
  style_data JSONB,          -- 画風・スタイル設定データ
  caption_data JSONB,        -- 字幕設定データ
  
  -- 最終的なMulmoScript
  mulmoscript JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_storyboards_project_id ON storyboards(project_id);
CREATE INDEX idx_storyboards_uid ON storyboards(uid);
CREATE INDEX idx_storyboards_status ON storyboards(status);

-- RLSは使用しない（SERVICE_ROLEでアクセス）
```

### workflowsテーブル
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active', -- active, completed, archived
  
  -- 表示用データ（キャッシュ） GETで取得
  step1_in JSONB,
  step2_in JSONB,
  step3_in JSONB,
  step4_in JSONB,
  step5_in JSONB,
  step6_in JSONB,
  step7_in JSONB,
  
  -- ユーザー入力データ POSTで保存
  step1_out JSONB,
  step2_out JSONB,
  step3_out JSONB,
  step4_out JSONB,
  step5_out JSONB,
  step6_out JSONB,
  step7_out JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_workflows_storyboard_id ON workflows(storyboard_id);
CREATE INDEX idx_workflows_uid ON workflows(uid);
CREATE INDEX idx_workflows_status ON workflows(status);

-- RLSは使用しない（SERVICE_ROLEでアクセス）
```

## storyboardsのカテゴリ別データ構造

### summary_data: 作品概要・全体情報データ
```typescript
interface SummaryData {
  // ユーザーの元ストーリー
  originalStory: {
    mainStory: string;            // 主なストーリー
    characters: string;           // 主な登場人物説明
    dramaticTurningPoint: string; // ドラマチック転換点
    futureVision: string;         // 未来イメージ
    learnings: string;            // 学び
  };
  
  // 作品情報
  workInfo: {
    suggestedTitles: string[];    // 提案されたタイトル候補
    selectedTitle: string;        // 選択されたタイトル
    subtitle?: string;            // サブタイトル
    description: string;          // 作品説明
    synopsis: string;             // あらすじ
    theme: string;                // テーマ
    message: string;              // 伝えたいメッセージ
    tags: string[];               // タグ一覧
    genre: string;                // ジャンル
    targetAudience: string;       // ターゲット視聴者
  };
  
  // 技術設定
  technicalSettings: {
    language: string;             // 言語設定 (ja/en)
    style: string;                // 作品スタイル（シェイクスピア風など）
    totalScenes: number;          // 全体シーン数 (1-20)
    estimatedDuration: number;    // 推定動画時間（秒）
    complexity: string;           // 作品の複雑さレベル
  };
  
  // 全体構成
  overallStructure: {
    introduction: string;         // 導入部の説明
    development: string;          // 展開部の説明
    climax: string;               // クライマックスの説明
    resolution: string;           // 結末部の説明
    keyTurningPoints: string[];   // 重要な転換点
  };
  
  // メタデータ
  metadata: {
    createdAt: string;            // 作成日時
    lastModified: string;         // 最終更新日時
    version: number;              // バージョン番号
    inspirations?: string[];      // インスピレーション元
    references?: string[];        // 参考資料
  };
}
```

### acts_data: 幕場構成データ
```typescript
interface ActsData {
  totalActs: number;              // 総幕数
  totalScenes: number;            // 総シーン数
  acts: Array<{
    actNumber: number;            // 幕番号
    actTitle: string;             // 幕タイトル
    actDescription: string;       // 幕の説明
    scenes: Array<{
      sceneId: string;            // シーンID（UUID）
      sceneNumber: number;        // シーン番号
      sceneTitle: string;         // シーンタイトル
      summary: string;            // シーン概要
      estimatedDuration?: number; // 推定時間（秒）
      mood: string;               // シーンの雰囲気
      location?: string;          // 場所設定
      timeOfDay?: string;         // 時間帯
    }>;
  }>;
  overallStructure: string;       // 全体構成の説明
  climax: {
    actNumber: number;            // クライマックスの幕
    sceneNumber: number;          // クライマックスのシーン
    sceneId: string;              // クライマックスのシーンID
    description: string;          // クライマックスの説明
  };
}
```

### characters_data: キャラクター設定データ
```typescript
interface CharactersData {
  mainCharacters: Array<{
    id: string;                   // キャラクターID
    name: string;                 // キャラクター名
    role: string;                 // 役割（主人公、友人、敵役など）
    personality: string;          // 性格
    visualDescription: string;    // 外見描写
    background: string;           // 背景・設定
    motivation: string;           // 動機
    characterArc: string;         // キャラクターの成長
    relationships: Array<{        // 他キャラとの関係
      characterId: string;
      relationship: string;
    }>;
    voiceCharacteristics: string; // 音声特徴
    faceReference?: {             // 顔参照画像
      url: string;
      storagePath?: string;
      description: string;
    };
  }>;
  supportingCharacters: Array<{   // サブキャラクター
    id: string;
    name: string;
    role: string;
    description: string;
  }>;
  characterRelationships: string; // 全体的な人間関係の説明
}
```

### scenes_data: シーン一覧データ
```typescript
interface ScenesData {
  scenes: Array<{
    sceneId: string;              // シーンID（acts_dataで定義されたものを参照）
    actNumber: number;            // 所属する幕
    sceneNumber: number;          // シーン番号
    title: string;                // シーンタイトル
    summary: string;              // シーン概要
    dialogues: Array<{            // セリフ一覧
      id: string;                 // セリフID
      speaker: string;            // 話者（キャラクターID）
      text: string;               // セリフテキスト
      emotion: string;            // 感情表現
      volume: number;             // 音量 (0-1)
      speed: number;              // 話速 (0.5-2.0)
      pauseBefore?: number;       // 前の間（秒）
      pauseAfter?: number;        // 後の間（秒）
    }>;
    imagePrompt: string;          // 画像生成用プロンプト
    imageUrl?: string;            // 生成された画像URL
    customImage?: {               // カスタム画像
      url: string;
      storagePath?: string;
      description: string;
    };
    mood: string;                 // シーンの雰囲気
    visualElements: string[];     // 視覚的要素
    cameraAngle?: string;         // カメラアングル
    lighting?: string;            // 照明設定
    estimatedDuration: number;    // 推定時間（秒）
  }>;
  totalDialogues: number;         // 総セリフ数
  averageSceneDuration: number;   // 平均シーン時間
  
  // sceneId マッピング（acts_dataとの整合性確保）
  sceneIdMapping: Record<string, {
    actNumber: number;
    sceneNumber: number;
    sceneTitle: string;
  }>;
}
```

### audio_data: BGM・音声設定データ
```typescript
interface AudioData {
  speakers: Record<string, {      // キャラクターごとの音声設定
    characterId: string;
    voiceId: string;              // OpenAI音声ID
    displayName: {
      ja: string;
      en: string;
    };
    voiceDescription: string;     // 音声の説明
    sampleUrl?: string;           // サンプル音声URL
  }>;
  bgm: {
    preset?: {                    // プリセットBGM
      id: string;
      name: string;
      url: string;
      description: string;
      mood: string;
    };
    custom?: {                    // カスタムBGM
      url: string;
      storagePath?: string;
      name: string;
      description: string;
    };
    volume: number;               // BGM音量 (0-1)
    fadeIn: number;               // フェードイン時間（秒）
    fadeOut: number;              // フェードアウト時間（秒）
  };
  soundEffects: Array<{          // 効果音設定
    sceneId: string;
    effectType: string;           // 効果音タイプ
    url: string;
    volume: number;
    timing: number;               // 再生タイミング（秒）
  }>;
  overallAudioStyle: string;      // 全体的な音響スタイル
  pronunciation: Array<{          // 読み方注意点
    sceneId: string;
    dialogueId: string;
    originalText: string;
    correctedText: string;
    phonetic?: string;            // 発音記号
  }>;
}
```

### style_data: 画風・スタイル設定データ
```typescript
interface StyleData {
  imageStyle: {
    preset: string;               // 画風プリセット
    description: string;          // 画風の説明
    customPrompt?: string;        // カスタムプロンプト
    baseStyle: string;            // ベーススタイル（アニメ風、水彩画風など）
    colorPalette: string[];       // カラーパレット
    lighting: string;             // 照明スタイル
    composition: string;          // 構図スタイル
  };
  visualTheme: {
    mood: string;                 // 全体的な雰囲気
    timePeriod: string;          // 時代設定
    location: string;             // 主な舞台設定
    culturalElements: string[];   // 文化的要素
  };
  transitions: {
    sceneTransition: string;      // シーン転換エフェクト
    duration: number;             // 転換時間（秒）
    style: string;                // 転換スタイル
  };
}
```

### caption_data: 字幕設定データ
```typescript
interface CaptionData {
  enabled: boolean;               // 字幕有効/無効
  language: string;               // 字幕言語 (ja/en)
  textSettings: {
    fontSize: number;             // フォントサイズ (px)
    fontFamily: string;           // フォントファミリー
    fontWeight: string;           // フォント太さ
    color: string;                // 文字色 (hex)
    strokeColor?: string;         // 縁取り色 (hex)
    strokeWidth?: number;         // 縁取り幅 (px)
    backgroundColor?: string;     // 背景色 (hex)
    backgroundOpacity?: number;   // 背景透明度 (0-1)
  };
  positioning: {
    position: string;             // 表示位置 (bottom/top/center)
    marginBottom: number;         // 下マージン (px)
    marginTop: number;            // 上マージン (px)
    horizontalAlign: string;      // 水平配置 (left/center/right)
    maxWidth: number;             // 最大幅 (%)
  };
  timing: {
    displayDuration: number;      // 表示時間 (秒)
    fadeInDuration: number;       // フェードイン時間 (秒)
    fadeOutDuration: number;      // フェードアウト時間 (秒)
    syncWithAudio: boolean;       // 音声と同期
  };
  animation: {
    type: string;                 // アニメーション種類
    duration: number;             // アニメーション時間 (秒)
    easing: string;               // イージング関数
  };
  sceneOverrides: Array<{         // シーン別設定
    sceneId: string;
    overrideSettings: Partial<CaptionData>;
  }>;
  customCSS?: string;             // カスタムCSS
}
```

### URL設計
- 基本URL: `https://localhost:3000/workflow/[workflow_id]?step=x` (x=1〜7)
- ワークフローがactiveでありかつ、それまでのステップが完了していれば表示可能
- トップページの「脚本をつくる」ボタンから、ワークフローのステップ1の画面に遷移

## 各ステップの入出力JSONスキーマ

### ステップ1: ストーリー入力 (01_STORY_INPUT)

#### Step1Input
```typescript
interface Step1Input {
  // 初期表示時は空（最初のステップのため）
}
```

#### Step1Output
```typescript
interface Step1Output {
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
}
```

### ステップ2: 初期幕場レビュー (02_SCENE_PREVIEW)

#### Step2Input
```typescript
interface Step2Input {
  // storyboardsから生成される表示用データ
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
}
```

#### Step2Output
```typescript
interface Step2Output {
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
}
```

### ステップ3: キャラクタ&画風設定 (03_CHARACTER_STYLE)

#### Step3Input
```typescript
interface Step3Input {
  // storyboardsから生成される表示用データ
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
}
```

#### Step3Output
```typescript
interface Step3Output {
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
}
```

### ステップ4: 台本＆静止画プレビュー (04_SCRIPT_PREVIEW)

#### Step4Input
```typescript
interface Step4Input {
  // storyboardsから生成される表示用データ
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
}
```

#### Step4Output
```typescript
interface Step4Output {
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
}
```

### ステップ5: 音声生成 (05_VOICE_GEN)

#### Step5Input
```typescript
interface Step5Input {
  // storyboardsから生成される表示用データ
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
}
```

#### Step5Output
```typescript
interface Step5Output {
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
}
```

### ステップ6: BGM & 字幕設定 (06_BGM_SUBTITLE)

#### Step6Input
```typescript
interface Step6Input {
  // storyboardsから生成される表示用データ
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
}
```

#### Step6Output
```typescript
interface Step6Output {
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
}
```

### ステップ7: 最終確認 (07_CONFIRM_PREVIEW)

#### Step7Input
```typescript
interface Step7Input {
  // storyboardsから生成される表示用データ
  finalTitle: string;          // 最終タイトル案
  description: string;         // 作品説明文
  tags: string[];              // タグ候補
  estimatedDuration: number;   // 推定動画時間（秒）
  
  // 最終的なMulmoScript
  mulmoScript: MulmoScript;
}
```

#### Step7Output
```typescript
interface Step7Output {
  userInput: {
    finalTitle: string;          // 最終タイトル
    description: string;         // 作品説明文
    tags: string[];              // タグ
    confirmGeneration: boolean;  // 動画生成確認
  };
}
```

### MulmoScript
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

### ステップ間のAI処理（Step Processors）

#### 概要
ワークフローの各ステップ間でAIを使用してデータを生成・変換する処理を管理するシステムです。

#### ディレクトリ構成
```
src/lib/workflow/step-processors/
├── index.ts                 # エクスポートとWorkflowStepManager
├── step1-processor.ts       # Step1→Step2の処理
├── step2-processor.ts       # Step2→Step3の処理
├── step4-processor.ts       # Step4→Step5の処理
├── step5-processor.ts       # Step5→Step6の処理
├── step6-processor.ts       # Step6→Step7の処理
└── step7-processor.ts       # Step7の完了処理
```

※ Step3の処理は既存の`/src/lib/workflow/generators/step3-generator.ts`を使用

#### 各プロセッサーの詳細

**step1-processor.ts**
- 役割: ユーザーのストーリー入力からAIで初期のstoryboardを生成
- 生成内容: タイトル案、シェイクスピア風5幕構成、登場人物リスト（性格・外見含む）
- AIプロンプト設計: ストーリーの要素を分析し、5幕構成に適切にシーンを配分、キャラクターの役割と関係性を定義

**step2-processor.ts**
- 役割: 幕場構成とタイトルを確定し、キャラクターを詳細化
- 生成内容: キャラクターの詳細な性格設定、視覚的な外見描写、キャラクター間の関係性

**step3-generator.ts（既存）**
- 役割: キャラクターと画風設定から台本を生成
- 特徴: 既に実装済みのジェネレーター、各シーンの台詞と画像プロンプトを生成、シェイクスピア風の文体で日本語台本を作成

**step4-processor.ts**
- 役割: 台本から音声設定の準備
- 生成内容: 各キャラクターへの推奨音声タイプ、読み方の注意点、感情表現の指示

**step5-processor.ts**
- 役割: 音声設定からBGM設定の準備
- 生成内容: シーンに適したBGMの提案（AudioSettings.tsxで定義されたBGM URLリストから選択）
- BGMオプション: story001.mp3〜story005.mp3, theme001.mp3, vibe001.mp3, voice001.mp3
- デフォルト: story002.mp3 (Rise and Shine)

**step6-processor.ts**
- 役割: 最終確認用データの生成
- 生成内容: サムネイル候補の選定、動画の説明文案、タグの提案

**step7-processor.ts**
- 役割: ワークフロー完了処理
- 処理内容: 最終的なMulmoScriptの生成準備、ワークフローステータスの更新、動画生成キューへの登録準備

#### WorkflowStepManager
統一的なインターフェースでステップ処理を管理するクラス。

```typescript
const manager = new WorkflowStepManager(workflowId, storyboardId);

// 次のステップへ進む
const result = await manager.proceedToNextStep(currentStep, stepOutput);

if (result.success) {
  // 成功時の処理
  const nextStepInput = result.data;
} else {
  // エラー処理
  console.error(result.error);
}
```

#### エラーハンドリング

**エラーレスポンス形式**
```typescript
{
  error: string;      // 日本語のわかりやすいメッセージ
  code: string;       // エラーコード（例: STEP2_GENERATION_FAILED）
  step: number;       // エラーが発生したステップ番号
  details?: string;   // 詳細情報（デバッグ用）
}
```

**エラーメッセージの例**
- "AIによるストーリー構成の生成中にエラーが発生しました。しばらく待ってから再度お試しください。"
- "キャラクター設定の生成に失敗しました。入力内容を確認してください。"
- "台本の生成中にエラーが発生しました。文字数が多すぎる可能性があります。"

#### 技術仕様

**使用AIモデル**
- モデル: `gpt-4.1`
- 温度設定: 0.7（創造的な生成のため）
- レスポンス形式: JSON

**データベース更新**
- Supabase SERVICE_ROLEキーを使用
- storyboardsテーブルを直接更新
- トランザクション的な更新を実装

**パフォーマンス考慮事項**
- 各ステップの処理は非同期で実行
- エラー時の再試行は実装していない（ユーザーが手動で再実行）
- タイムアウトは設定していない（OpenAIのデフォルトを使用）

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