# ワークフロー実装プラン（ファイル単位チェックリスト）

## 1. データベース関連

### migration files
- [ ] `/migrations/002_add_workflows_table.sql`
  - workflowsテーブル作成
  - インデックス追加
  - RLS設定

## 2. 型定義

### types
- [ ] `/src/types/workflow.ts`
  - WorkflowState型定義
  - Step1Json〜Step7Json型定義
  - MulmoScript型定義
  - ワークフロー関連の共通型

## 3. APIエンドポイント

### workflow API
- [ ] `/src/app/api/workflow/create/route.ts`
  - POST: 新規ワークフロー作成
  - uid検証
  - workflow_id生成とリダイレクトURL返却

- [ ] `/src/app/api/workflow/[workflow_id]/route.ts`
  - GET: ワークフロー情報取得
  - DELETE: ワークフロー削除（将来実装）

- [ ] `/src/app/api/workflow/[workflow_id]/step/[step]/route.ts`
  - GET: ステップデータ取得
  - POST: ステップデータ保存とLLM生成
  - バリデーション処理

- [ ] `/src/app/api/workflow/[workflow_id]/generate-script/route.ts`
  - POST: MulmoScript生成
  - 動画生成ジョブの開始

- [ ] `/src/app/api/workflow/[workflow_id]/upload/image/route.ts`
  - POST: 画像アップロード（顔参照、CM画像）
  - Supabase Storageへの保存

- [ ] `/src/app/api/workflow/[workflow_id]/upload/audio/route.ts`
  - POST: 音声アップロード（カスタムBGM）
  - Supabase Storageへの保存

## 4. LLM生成ロジック

### generators
- [ ] `/src/lib/workflow/generators/step1-generator.ts`
  - タイトル案生成
  - 幕場構成生成
  - 登場人物リスト生成

- [ ] `/src/lib/workflow/generators/step2-generator.ts`
  - キャラクター詳細情報生成
  - 画風提案生成

- [ ] `/src/lib/workflow/generators/step3-generator.ts`
  - シーンごとの台本生成
  - 画像プロンプト生成

- [ ] `/src/lib/workflow/generators/step4-generator.ts`
  - 音声割り当て提案
  - 読み方注意点生成

- [ ] `/src/lib/workflow/generators/step5-generator.ts`
  - BGM提案生成
  - 字幕設定提案

- [ ] `/src/lib/workflow/generators/script-generator.ts`
  - 最終的なMulmoScript生成
  - 各ステップのデータ統合

## 5. ユーティリティ

### utils
- [ ] `/src/lib/workflow/validation.ts`
  - 各ステップの入力検証
  - 文字数制限チェック
  - 必須項目チェック

- [ ] `/src/lib/workflow/state-manager.ts`
  - ワークフロー状態管理
  - ステップ遷移可否判定
  - データ整合性チェック

- [ ] `/src/lib/workflow/storage.ts`
  - 画像/音声アップロード処理
  - Supabase Storage操作
  - ファイルサイズ/形式チェック

## 6. UIコンポーネント

### 共通コンポーネント
- [ ] `/src/components/workflow/WorkflowLayout.tsx`
  - ワークフロー全体のレイアウト
  - ステップインジケーター
  - ナビゲーション

- [ ] `/src/components/workflow/StepIndicator.tsx`
  - 進行状況表示
  - ステップ間ナビゲーション
  - モバイル対応

- [ ] `/src/components/workflow/NavigationButtons.tsx`
  - 前へ/次へボタン
  - 保存状態表示
  - ローディング表示

### ステップ別コンポーネント
- [ ] `/src/components/workflow/steps/Step1StoryInput.tsx`
  - ストーリー入力フォーム
  - 文字数カウンター
  - バリデーション表示

- [ ] `/src/components/workflow/steps/Step2ScenePreview.tsx`
  - 幕場構成エディタ
  - ドラッグ&ドロップ対応
  - タイトル編集

- [ ] `/src/components/workflow/steps/Step3CharacterStyle.tsx`
  - キャラクター設定
  - 画像アップロード
  - 画風選択UI

- [ ] `/src/components/workflow/steps/Step4ScriptPreview.tsx`
  - Storyboard表示
  - シーンカード
  - インライン編集

- [ ] `/src/components/workflow/steps/Step5VoiceGen.tsx`
  - 音声設定UI
  - 試聴プレーヤー
  - 読み間違い修正

- [ ] `/src/components/workflow/steps/Step6BgmSubtitle.tsx`
  - BGM選択UI
  - 字幕設定
  - プレビュー

- [ ] `/src/components/workflow/steps/Step7Confirm.tsx`
  - 最終確認画面
  - サムネイル一覧
  - 動画生成開始

### サブコンポーネント
- [ ] `/src/components/workflow/cards/SceneCard.tsx`
  - シーン表示カード
  - 編集モード切り替え
  - プレビュー表示
  - 所属する幕の表示

- [ ] `/src/components/workflow/cards/ActDivider.tsx`
  - 幕の区切り表示
  - 幕番号とタイトル
  - 折りたたみ機能（モバイル）

- [ ] `/src/components/workflow/modals/ImageUploadModal.tsx`
  - 画像アップロードUI
  - プレビュー
  - トリミング（将来実装）

- [ ] `/src/components/workflow/modals/CharacterEditModal.tsx`
  - キャラクター詳細編集
  - 顔参照設定
  - プレビュー

## 7. ページコンポーネント

### workflow pages
- [ ] `/src/app/workflow/[workflow_id]/page.tsx`
  - メインワークフローページ
  - ステップ管理
  - データ取得/保存

- [ ] `/src/app/workflow/[workflow_id]/loading.tsx`
  - ローディング表示

- [ ] `/src/app/workflow/[workflow_id]/error.tsx`
  - エラーハンドリング

## 8. カスタムフック

### hooks
- [ ] `/src/hooks/workflow/useWorkflow.ts`
  - ワークフロー全体の状態管理
  - API呼び出し
  - エラーハンドリング

- [ ] `/src/hooks/workflow/useStep.ts`
  - 各ステップのデータ管理
  - 保存/取得
  - バリデーション

- [ ] `/src/hooks/workflow/useAutoSave.ts`
  - 自動保存機能
  - デバウンス処理
  - 保存状態管理

## 9. スタイル

### styles
- [ ] `/src/components/workflow/workflow.module.css`
  - ワークフロー固有のスタイル
  - アニメーション定義
  - レスポンシブ対応

## 10. テスト

### unit tests
- [ ] `/src/lib/workflow/__tests__/validation.test.ts`
- [ ] `/src/lib/workflow/__tests__/generators.test.ts`
- [ ] `/src/lib/workflow/__tests__/state-manager.test.ts`

### integration tests
- [ ] `/src/app/api/workflow/__tests__/workflow-api.test.ts`
- [ ] `/src/components/workflow/__tests__/workflow-flow.test.tsx`

## 11. ドキュメント

### documentation
- [ ] `/docs/workflow-user-guide.md`
  - ユーザー向け使用方法
  - FAQ
  - トラブルシューティング

- [ ] `/docs/workflow-api-reference.md`
  - API仕様詳細
  - リクエスト/レスポンス例
  - エラーコード一覧

## 12. 設定・環境変数

### configuration
- [ ] `.env.local`への追加
  ```
  NEXT_PUBLIC_ENABLE_WORKFLOW=true
  WORKFLOW_MAX_IMAGE_SIZE=5242880
  WORKFLOW_MAX_AUDIO_SIZE=10485760
  ```

- [ ] `/src/config/workflow.ts`
  - ワークフロー関連の設定値
  - 制限値定義
  - デフォルト値

## 実装順序の推奨

### Phase 1: 基盤構築（1-2週間）
1. データベース構造
2. 型定義
3. 基本API実装
4. 共通コンポーネント

### Phase 2: ステップ1-3実装（1週間）
1. ステップ1-3のUI実装
2. LLM生成ロジック
3. 状態管理

### Phase 3: ステップ4-6実装（1週間）
1. ステップ4-6のUI実装
2. 画像/音声アップロード
3. プレビュー機能

### Phase 4: 完成と最適化（1週間）
1. ステップ7実装
2. MulmoScript生成
3. エラーハンドリング強化
4. パフォーマンス最適化

### Phase 5: テストとドキュメント（3日）
1. テスト作成
2. ドキュメント整備
3. バグ修正

## 注意事項

- 各ファイルは既存のコーディング規約に従う
- TypeScriptの型安全性を保つ
- エラーハンドリングを適切に実装
- モバイルファーストで実装
- アクセシビリティを考慮