-- 顔検出機能用のテーブルを追加
-- 実行日: 2025-01-16

-- 顔検出結果を保存するテーブル
CREATE TABLE IF NOT EXISTS detected_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  storyboard_id UUID REFERENCES storyboards(id) ON DELETE CASCADE,
  original_image_url TEXT NOT NULL,
  face_index INTEGER NOT NULL,
  face_image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  bounding_box JSONB NOT NULL, -- {x, y, width, height, vertices}
  detection_confidence FLOAT,
  face_attributes JSONB, -- {joy, sorrow, anger, surprise, ageRange, gender}
  tag_name TEXT,
  tag_role TEXT CHECK (tag_role IN ('protagonist', 'friend', 'family', 'colleague', 'other', NULL)),
  tag_description TEXT,
  position_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, face_index)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_detected_faces_workflow_id ON detected_faces(workflow_id);
CREATE INDEX IF NOT EXISTS idx_detected_faces_storyboard_id ON detected_faces(storyboard_id);

-- Row Level Security (RLS) の有効化
ALTER TABLE detected_faces ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分のワークフローに関連する顔検出結果のみ閲覧可能
CREATE POLICY "Users can view own detected faces" ON detected_faces
  FOR SELECT USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE uid = auth.uid()::text
    )
  );

-- RLSポリシー: ユーザーは自分のワークフローに関連する顔検出結果を作成・更新・削除可能
CREATE POLICY "Users can manage own detected faces" ON detected_faces
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE uid = auth.uid()::text
    )
  );

-- RLSポリシー: サービスロールは全ての顔検出結果を管理可能
CREATE POLICY "Service role can manage all detected faces" ON detected_faces
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_detected_faces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 自動更新トリガー
CREATE TRIGGER update_detected_faces_updated_at
    BEFORE UPDATE ON detected_faces
    FOR EACH ROW
    EXECUTE FUNCTION update_detected_faces_updated_at();

-- 検証クエリ
-- SELECT 
--     table_name,
--     column_name,
--     data_type,
--     is_nullable,
--     column_default
-- FROM 
--     information_schema.columns
-- WHERE 
--     table_name = 'detected_faces'
-- ORDER BY 
--     ordinal_position;