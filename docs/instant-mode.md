# Instant Mode ドキュメント

Instant Modeは、ユーザーがストーリーを入力するだけで、残りのすべてのステップを自動的に処理し、動画を生成する機能です。

## 概要

- 7ステップのワークフローをすべて自動化
- ログインが必要（セキュリティのため）
- リアルタイムで進捗状況を表示
- 既存のworkflowインフラストラクチャを完全に再利用

## アーキテクチャ

### データフロー

1. ユーザーがストーリーを入力 → Instant Mode作成API
2. `instant_generations`テーブルにレコード作成
3. 既存のworkflowシステムを使用して全ステップを自動実行
4. 動画生成APIを呼び出して動画を作成
5. 完成後、動画一覧ページへリダイレクト

### 主要コンポーネント

- `/src/app/instant/create/page.tsx` - ストーリー入力UI
- `/src/app/instant/[id]/status/page.tsx` - 進捗表示UI
- `/src/app/api/instant/create/route.ts` - Instant Mode作成API
- `/src/app/api/instant/[id]/status/route.ts` - ステータス取得API
- `/src/lib/instant/instant-generator.ts` - 自動処理エンジン
- `/src/lib/instant/instant-status.ts` - ステータス管理
- `/src/lib/instant/instant-defaults.ts` - デフォルト設定

## セットアップ

### 1. データベースマイグレーション

Supabase Dashboardから以下のSQLを実行：

```sql
-- Instant Mode用のテーブル作成
CREATE TABLE IF NOT EXISTS instant_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT NOT NULL,
    storyboard_id UUID REFERENCES storyboards(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    current_step TEXT, -- analyzing, structuring, characters, script, voices, finalizing, generating
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_instant_generations_uid ON instant_generations(uid);
CREATE INDEX IF NOT EXISTS idx_instant_generations_status ON instant_generations(status);
CREATE INDEX IF NOT EXISTS idx_instant_generations_created_at ON instant_generations(created_at DESC);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_instant_generations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER instant_generations_updated_at_trigger
    BEFORE UPDATE ON instant_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_instant_generations_updated_at();
```

### 2. 環境変数の設定

`.env.local`に以下の環境変数を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

### 3. 開発サーバーの起動

```bash
npm install
npm run dev
```

## 使い方

### 1. ログイン

まず、アカウントにログインしてください。ログインしていない場合は自動的にログインページにリダイレクトされます。

### 2. Instant Mode作成ページにアクセス

```
http://localhost:3000/instant/create
```

### 3. ストーリーを入力

- **ストーリー** (必須): あなたの物語を入力
- **タイトル** (任意): 動画のタイトル
- **画風**: アニメ風、リアル風、水彩画風から選択
- **動画の長さ**: 短め（5シーン）、標準（10シーン）、長め（15シーン）

### 4. 生成開始

「🚀 動画を生成する」ボタンをクリック

### 5. 進捗確認

自動的にステータスページに遷移し、以下の処理が順番に実行されます：

1. **analyzing** - ストーリー解析中
2. **structuring** - 幕場構成を作成中
3. **characters** - キャラクター詳細を生成中
4. **script** - 台本を作成中
5. **voices** - 音声を割り当て中
6. **finalizing** - 最終調整中
7. **generating** - 動画を生成中

### 6. 完成

動画が完成すると、自動的に動画一覧ページ（`/videos`）にリダイレクトされます。

## 技術詳細

### 認証

- **ログインが必須**
- ログインしていない場合は`/auth/login`にリダイレクトされる
- すべてのAPIエンドポイントで`X-User-UID`ヘッダーによる認証が必要
- 他のユーザーの生成状況は閲覧できない（UIDでフィルタリング）

### 既存workflowの再利用

Instant Modeは既存の7ステップワークフローのインフラストラクチャを完全に再利用しています：

```typescript
// WorkflowStepManagerを使用して各ステップを自動実行
const stepManager = new WorkflowStepManager(workflow.id, storyboardId);
const step2Result = await stepManager.proceedToNextStep(1, step1Output);
```

### 動画生成

Step7完了後、既存の`/api/workflow/[workflow_id]/generate-script`エンドポイントを呼び出して動画生成を開始します。

### エラーハンドリング

各ステップでエラーが発生した場合：
- `instant_generations`のstatusが`failed`に更新される
- `error_message`にエラー内容が保存される
- ステータス画面にエラーが表示される

## トラブルシューティング

### "instant_generations table does not exist"
→ データベースマイグレーションを実行してください

### "Service role key is required"
→ `.env.local`に`SUPABASE_SERVICE_ROLE_KEY`を設定してください

### "OpenAI API error"
→ `.env.local`に`OPENAI_API_KEY`を設定してください

### 動画生成がタイムアウトする
→ 動画生成には最大10分かかることがあります。Cloud Run側の処理を確認してください。

## API仕様

### POST /api/instant/create

Instant Modeの新規作成

**リクエスト**：
```json
{
  "storyText": "string (required)",
  "title": "string (optional)",
  "style": "anime | realistic | watercolor",
  "duration": "short | medium | long"
}
```

**レスポンス**：
```json
{
  "instantId": "uuid"
}
```

### GET /api/instant/[id]/status

Instant Modeのステータス取得

**レスポンス**：
```json
{
  "status": "pending | processing | completed | failed",
  "currentStep": "string",
  "progress": 0-100,
  "message": "string",
  "error": "string (if failed)",
  "videoId": "uuid (if completed)"
}
```

## 今後の改善案

- [ ] 生成履歴の表示機能
- [ ] より詳細なカスタマイズオプション（BGM選択、字幕スタイルなど）
- [ ] 動画のプレビュー機能
- [ ] 複数の動画を同時生成する機能
- [ ] WebSocketを使用したリアルタイム進捗更新