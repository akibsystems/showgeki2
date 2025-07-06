# ワークフロー設計変更点

## 変更の概要

既存のワークフロー設計を以下の新しい設計に変更します：

### 1. JSONスキーマの分割
- 従来の `step1_json` 〜 `step7_json` を削除
- `step1_in` / `step1_out` 形式に分割（各ステップ同様）
- `stepn_in`: そのステップで表示する初期データ（前のステップの結果やLLM生成データ）
- `stepn_out`: そのステップでユーザーが入力したデータ

### 2. データベース構造の変更
- 新しい `projects` テーブルを追加（workspacesに代わる）
- `storyboards` テーブルが主体となり、project_id を持つ
- `workflows` テーブルは storyboard_id を持ち、storyboard作成のためのツールとなる
- 関係性: `project` → `storyboard` = `workflow`（1対多対1）

### 3. データフロー
```
Project（1）→ Storyboard（多）= Workflow（1）

データ生成フロー:
User Input → stepn_out → workflows テーブル
LLM生成データ → stepn_generated → storyboards テーブル
storyboards → stepn_in 生成 → workflows テーブル（キャッシュ）→ 画面表示
```

### 4. API仕様の変更
- `POST /api/workflow/[workflow_id]/step/[step]`: ユーザー入力保存 + storyboard更新
- `GET /api/workflow/[workflow_id]/step/[step]`: 画面表示用データ取得

## 具体的な変更

### データベース設計

#### projectsテーブル（新規）
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
```

#### storyboardsテーブル（新規）
```sql
CREATE TABLE storyboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  title TEXT,
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
```

#### workflowsテーブル（変更後）
```sql
-- 既存のworkflowsテーブルをDROP
DROP TABLE IF EXISTS workflows CASCADE;

-- 新しいworkflowsテーブルを作成
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active', -- active, completed, archived
  
  -- 表示用データ（キャッシュ）
  step1_in JSONB,
  step2_in JSONB,
  step3_in JSONB,
  step4_in JSONB,
  step5_in JSONB,
  step6_in JSONB,
  step7_in JSONB,
  
  -- ユーザー入力データ
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
```

### JSONスキーマ変更

#### Step1 Input/Output
```typescript
interface Step1Input {
  // 初期表示時は空（最初のステップのため）
}

interface Step1Output {
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
```

#### Step2 Input/Output
```typescript
interface Step2Input {
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
    name: string;
    role: string;
    personality: string;
  }>;
}

interface Step2Output {
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
```

### API仕様の変更

#### POST処理
```typescript
// POST /api/workflow/[workflow_id]/step/[step]
{
  data: StepNOutput.userInput
}
```

1. `workflows.stepN_out` に StepNOutput（userInputを含む）を保存
2. LLMで次のステップ用データを生成
3. `storyboards.stepN_generated` に生成データを保存
4. 次のステップの `StepN+1Input` を生成
5. `workflows.stepN+1_in` にキャッシュとして保存
6. `StepN+1Input` を返却

#### GET処理
```typescript
// GET /api/workflow/[workflow_id]/step/[step]
{
  stepInput: StepNInput,  // 画面表示用データ（workflows.stepN_in から取得）
  stepOutput: StepNOutput | null,  // 既存の入力データ
  canEdit: boolean,
  canProceed: boolean
}
```

処理:
1. `workflows.stepN_in` からキャッシュされた表示用データを取得
2. キャッシュが存在しない場合は `storyboards` から再生成
3. `workflows.stepN_out` から既存のユーザー入力データを取得

## 実装上の変更点

### 1. 型定義ファイル
- `/src/types/workflow.ts`
- `StepNJson` → `StepNInput`, `StepNOutput` に分割

### 2. APIエンドポイント
- `/src/app/api/workflow/[workflow_id]/step/[step]/route.ts`
- POST: ユーザー入力保存 + LLM生成 + storyboard更新
- GET: 画面表示用データ取得

### 3. データベースマイグレーション
- `/migrations/002_add_workflows_table.sql` を修正
- storyboardsテーブル追加

### 4. 生成ロジック
- `/src/lib/workflow/generators/`
- 各ステップの生成ロジックを storyboards テーブル操作に変更

### 5. 状態管理
- `/src/hooks/workflow/useWorkflow.ts`
- 新しいデータフローに対応

## 利点

1. **データの分離**: ユーザー入力と生成データが明確に分離
2. **柔軟性**: 生成データの再生成が容易
3. **保守性**: 各ステップの役割が明確
4. **拡張性**: 新しいステップの追加が容易
5. **パフォーマンス**: stepN_in のキャッシュにより高速表示
6. **効率性**: 一度生成したデータは再利用される

## 移行計画

1. 新しいテーブル構造でマイグレーション作成
   - **重要**: RLSは使用せず、全てSERVICE_ROLEでアクセス
2. 型定義の更新
3. APIエンドポイントの実装
4. フロントエンドコンポーネントの更新
5. テストの更新

## データベースアクセス方針

- **認証方式**: SERVICE_ROLE キーを使用
- **RLS**: 無効化（使用しない）
- **セキュリティ**: APIレベルでuid検証を実装
- **利点**: シンプルな構成、パフォーマンス向上、複雑なRLSポリシー不要