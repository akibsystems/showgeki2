# ScriptDirector V2 データベースマイグレーション設計書

## 概要
このドキュメントは`003_add_workflow_fields.sql`マイグレーションの設計判断と実装詳細を説明します。

## 設計原則

### 1. 後方互換性の維持
- 既存の`script_json`カラムは標準MulmoScript形式を維持
- 既存データは自動的にワークフロー状態に変換
- 新機能はオプトイン方式で提供

### 2. パフォーマンスの最適化
- 大容量データは別テーブル（`story_workflow_data`）に分離
- 適切なインデックスによる高速検索
- JSONBサイズ制限によるメモリ効率化

### 3. スケーラビリティ
- アセット管理の専用テーブル化
- 履歴管理による監査証跡
- 水平スケーリングを考慮した設計

## テーブル設計詳細

### 1. storiesテーブルの拡張

#### 新規カラム
```sql
story_elements JSONB  -- ユーザー入力（最大1MB）
workflow_state JSONB  -- 進行状態（最大1MB）
custom_assets JSONB   -- アセット参照（最大1MB）
```

#### サイズ制限の理由
- メインテーブルの行サイズを抑制
- クエリパフォーマンスの維持
- バックアップ・レプリケーションの効率化

### 2. story_workflow_data テーブル

#### 設計理由
- AI生成結果は数MB〜数十MBになる可能性
- メインテーブルから分離してパフォーマンス維持
- 必要時のみJOINして取得

#### データタイプ
- `ai_screenplay`: 初期脚本生成結果
- `scene_scripts`: シーン詳細スクリプト
- `final_video_config`: 最終動画設定
- `bgm_instructions`: BGM処理指示
- `post_processing_config`: 後処理設定

### 3. story_assets テーブル

#### 設計理由
- ファイルメタデータの一元管理
- アップロード履歴の追跡
- ストレージ使用量の監視

#### 主要フィールド
- `asset_type`: アセットの種類
- `file_size`: ファイルサイズ（クォータ管理用）
- `mime_type`: ファイル形式の検証
- `uploaded_by`: アップロードユーザーの追跡

### 4. workflow_history テーブル

#### 設計理由
- 操作履歴の完全な記録
- デバッグとサポートの効率化
- コンプライアンス要件への対応

#### 記録される操作
- `complete_step`: ステップ完了
- `update_data`: データ更新
- `skip_step`: ステップスキップ
- `revert_step`: ステップ巻き戻し

## インデックス戦略

### 1. 基本インデックス
```sql
idx_stories_workflow_current_step     -- 現在のステップで検索
idx_stories_active_workflow          -- アクティブなワークフロー検索
idx_stories_has_custom_assets        -- カスタムアセット有無
```

### 2. 部分インデックス
```sql
-- 完了・失敗以外のアクティブなストーリーのみ
WHERE status NOT IN ('completed', 'failed')
```

### 3. 複合インデックス
```sql
idx_workflow_data_story_type         -- story_id + data_type
idx_story_assets_story_type         -- story_id + asset_type
```

## RLSポリシー設計

### セキュリティ原則
1. ユーザーは自分のデータのみアクセス可能
2. 認証されたユーザーのみ操作可能
3. 管理者は別途ポリシーで制御

### ポリシー実装
```sql
-- 基本パターン
story_id IN (
  SELECT id FROM stories WHERE uid = auth.uid()
)
```

## 既存データの移行戦略

### 1. workflow_state の自動設定
```
status = 'completed' → current_step = 5, completed_steps = [1,2,3,4,5]
script_json EXISTS → current_step = 3, completed_steps = [1,2,3]
それ以外 → current_step = 1, completed_steps = []
```

### 2. story_elements の推測
- `text_raw`を`main_story`にコピー
- `beats`を`total_scenes`に設定
- その他フィールドは空文字列

## パフォーマンス考慮事項

### 1. クエリ最適化
- 必要なデータのみSELECT
- 大容量データは遅延読み込み
- バッチ処理でのデータ更新

### 2. 推奨クエリパターン
```sql
-- 基本情報のみ取得
SELECT id, title, workflow_state FROM stories WHERE uid = ?;

-- 必要時のみ大容量データを取得
SELECT data FROM story_workflow_data 
WHERE story_id = ? AND data_type = 'ai_screenplay';
```

### 3. キャッシュ戦略
- `workflow_state`は頻繁にアクセスされるため積極的にキャッシュ
- 大容量データは必要時のみ取得しキャッシュ期間を短く

## 運用上の注意点

### 1. バックアップ
- `story_workflow_data`は容量が大きいため別途バックアップ戦略が必要
- 差分バックアップの活用を推奨

### 2. モニタリング
```sql
-- テーブルサイズの監視
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename IN ('stories', 'story_workflow_data', 'story_assets');

-- 大容量データの確認
SELECT 
  story_id,
  data_type,
  pg_size_pretty(pg_column_size(data)) as size
FROM story_workflow_data
ORDER BY pg_column_size(data) DESC
LIMIT 10;
```

### 3. メンテナンス
- 定期的なVACUUM ANALYZEの実行
- 不要な履歴データの定期削除
- インデックスの再構築

## ロールバック手順

1. 本番環境でのロールバックスクリプトは慎重に実行
2. データのバックアップを必ず取得
3. 段階的なロールバック（RLS→インデックス→テーブル→カラム）

## 今後の拡張性

### 1. パーティショニング
大規模化した場合は以下を検討：
- `workflow_history`の日付パーティション
- `story_assets`のタイプ別パーティション

### 2. アーカイブ戦略
- 完了後6ヶ月以上のデータは別スキーマへ
- コールドストレージへの移行

### 3. 追加インデックス
使用パターンに応じて以下を検討：
- GINインデックス（JSONB内部検索）
- 全文検索インデックス

## チェックリスト

マイグレーション実行前の確認事項：

- [ ] 本番データベースのバックアップ完了
- [ ] ステージング環境でのテスト完了
- [ ] パフォーマンステスト実施
- [ ] ロールバック手順の確認
- [ ] 監視アラートの設定
- [ ] アプリケーションコードの準備完了