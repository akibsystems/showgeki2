-- workflowsテーブルの作成
-- 誰でも動画作成ができるワークフローシステム用

-- テーブル作成
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
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

-- インデックス作成
CREATE INDEX idx_workflows_uid ON workflows(uid);
CREATE INDEX idx_workflows_workspace_id ON workflows(workspace_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created_at ON workflows(created_at DESC);

-- Row Level Security (RLS) を有効化
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分のworkflowのみアクセス可能
CREATE POLICY "Users can view own workflows" ON workflows
  FOR SELECT USING (uid = auth.uid()::text);

CREATE POLICY "Users can insert own workflows" ON workflows
  FOR INSERT WITH CHECK (uid = auth.uid()::text);

CREATE POLICY "Users can update own workflows" ON workflows
  FOR UPDATE USING (uid = auth.uid()::text);

CREATE POLICY "Users can delete own workflows" ON workflows
  FOR DELETE USING (uid = auth.uid()::text);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE workflows IS '動画作成ワークフローの管理テーブル';
COMMENT ON COLUMN workflows.id IS 'ワークフローID (UUID)';
COMMENT ON COLUMN workflows.uid IS 'ユーザーID';
COMMENT ON COLUMN workflows.workspace_id IS 'ワークスペースID';
COMMENT ON COLUMN workflows.title IS '作品タイトル';
COMMENT ON COLUMN workflows.current_step IS '現在のステップ (1-7)';
COMMENT ON COLUMN workflows.status IS 'ワークフローステータス';
COMMENT ON COLUMN workflows.step1_json IS 'ステップ1: ストーリー入力データ';
COMMENT ON COLUMN workflows.step2_json IS 'ステップ2: 初期幕場レビューデータ';
COMMENT ON COLUMN workflows.step3_json IS 'ステップ3: キャラクタ&画風設定データ';
COMMENT ON COLUMN workflows.step4_json IS 'ステップ4: 台本＆静止画プレビューデータ';
COMMENT ON COLUMN workflows.step5_json IS 'ステップ5: 音声生成データ';
COMMENT ON COLUMN workflows.step6_json IS 'ステップ6: BGM & 字幕設定データ';
COMMENT ON COLUMN workflows.script_json IS '最終的なMulmoScript';

-- 検証クエリ
-- SELECT * FROM workflows WHERE uid = 'test-user' ORDER BY created_at DESC;