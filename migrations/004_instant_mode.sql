-- Instant Mode用のテーブル作成
-- 実行日: 2025-01-12

-- instant_generations テーブル
-- Instant Modeで生成される動画の状態を管理
CREATE TABLE IF NOT EXISTS instant_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT NOT NULL,
    storyboard_id UUID REFERENCES storyboards(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    current_step TEXT, -- analyzing, structuring, characters, script, voices, finalizing, generating
    error_message TEXT,
    metadata JSONB DEFAULT '{}', -- 入力データや設定を保存
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

-- 検証クエリ
-- SELECT * FROM instant_generations WHERE uid = 'test-user' ORDER BY created_at DESC LIMIT 10;