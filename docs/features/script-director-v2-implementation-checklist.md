# ScriptDirector V2 実装チェックリスト

## Phase 1: 基盤構築

### データベース拡張
- [ ] `migrations/003_add_workflow_fields.sql` - ワークフロー関連フィールドの追加
  ```sql
  -- story_elementsカラム（JSONB）
  -- workflow_stateカラム（JSONB）
  -- custom_assetsカラム（JSONB）
  ```

### 型定義
- [ ] `src/types/workflow.types.ts` - 新規作成
  - [ ] `StoryElements` インターフェース
  - [ ] `WorkflowState` インターフェース
  - [ ] `CustomAssets` インターフェース
  - [ ] `WorkflowMetadata` インターフェース（MulmoScript拡張データ）
  - [ ] `ScriptConverter` インターフェース（変換関数）
  - [ ] `WorkflowStep` 列挙型

- [ ] `src/types/index.ts` - 更新
  - [ ] workflow.types.tsのエクスポート追加

### Zodスキーマ
- [ ] `src/lib/schemas.ts` - 更新
  - [ ] `storyElementsSchema` 追加
  - [ ] `workflowStateSchema` 追加
  - [ ] `workflowMetadataSchema` 追加（MulmoScript拡張データ）
  - [ ] `scriptConverterSchema` 追加（変換バリデーション）

### API基盤
- [ ] `src/lib/api-client.ts` - 更新
  - [ ] `generateScreenplay()` メソッド追加
  - [ ] `generateSceneDetails()` メソッド追加
  - [ ] `uploadAsset()` メソッド追加
  - [ ] `updateWorkflowState()` メソッド追加

### MulmoScript変換
- [ ] `src/lib/mulmo-converter.ts` - 新規作成
  - [ ] `toMulmoScript()` 関数実装
  - [ ] `extractBGMInstructions()` 関数実装
  - [ ] `applySubtitleSettings()` 関数実装
  - [ ] `validateMulmoCompatibility()` 関数実装

### レスポンシブ基盤
- [ ] `src/types/responsive.types.ts` - 新規作成
  - [ ] `DeviceType` 列挙型（mobile, tablet, desktop, wide）
  - [ ] `Breakpoint` インターフェース
  - [ ] `ResponsiveConfig` インターフェース
  - [ ] `TouchGesture` 型定義

- [ ] `src/hooks/useResponsive.ts` - 新規作成
  - [ ] ブレークポイント検出
  - [ ] デバイスタイプ判定
  - [ ] オリエンテーション検出

- [ ] `src/hooks/useDeviceCapabilities.ts` - 新規作成
  - [ ] タッチ対応検出
  - [ ] カメラ・マイク検出
  - [ ] ネットワーク状態監視
  - [ ] ストレージ容量チェック

- [ ] `src/styles/breakpoints.css` - 新規作成
  - [ ] CSS変数定義
  - [ ] メディアクエリミックスイン
  - [ ] ユーティリティクラス

- [ ] `src/components/editor/script-director-v2/components/responsive/DeviceDetector.tsx` - 新規作成
  - [ ] デバイス自動検出
  - [ ] ケイパビリティチェック
  - [ ] ポリフィル自動適用

## Phase 2: コンポーネント実装

### メインコンポーネント
- [ ] `src/components/editor/script-director-v2/index.tsx` - 新規作成
  - [ ] ワークフロー全体の管理
  - [ ] ステップ間の遷移制御
  - [ ] 状態管理の統合

### ステップナビゲーション
- [ ] `src/components/editor/script-director-v2/components/StepNavigation.tsx` - 新規作成
  - [ ] 進捗バー表示
  - [ ] ステップ間の移動ボタン
  - [ ] 完了状態の表示
  - [ ] モバイル: 下部固定タブバー実装
  - [ ] タブレット: サイドバー折りたたみ実装
  - [ ] デスクトップ: 上部進捗バー実装
  - [ ] スワイプジェスチャー対応

- [ ] `src/components/editor/script-director-v2/components/responsive/MobileNavigation.tsx` - 新規作成
  - [ ] 下部固定ナビゲーション
  - [ ] アクティブステップ表示
  - [ ] スワイプインジケーター

### ステップ1: ストーリー入力
- [ ] `src/components/editor/script-director-v2/components/steps/Step1StoryInput.tsx` - 新規作成
  - [ ] フォーム実装（主ストーリー、転換点、未来イメージ、学び）
  - [ ] 場数設定UI
  - [ ] バリデーション
  - [ ] モバイル: ステップ式フォーム（1項目ずつ）
  - [ ] モバイル: 音声入力ボタン実装
  - [ ] デスクトップ: 2カラムレイアウト（入力+プレビュー）
  - [ ] キーボードショートカット対応

- [ ] `src/components/editor/script-director-v2/hooks/useStoryElements.ts` - 新規作成
  - [ ] ストーリー要素の状態管理
  - [ ] 保存・読み込み処理
  - [ ] 音声入力API統合

### ステップ2: シーン一覧
- [ ] `src/components/editor/script-director-v2/components/steps/Step2SceneList.tsx` - 新規作成
  - [ ] 幕・場の階層表示
  - [ ] ドラッグ&ドロップ機能
  - [ ] シーン追加・削除・編集
  - [ ] モバイル: 縦スクロールリスト、長押しドラッグ
  - [ ] モバイル: スワイプで削除機能
  - [ ] デスクトップ: グリッド/リスト切り替え
  - [ ] 複数選択機能（デスクトップのみ）

- [ ] `src/components/editor/script-director-v2/components/editors/SceneEditor.tsx` - 新規作成
  - [ ] シーン編集モーダル
  - [ ] 幕の割り当て変更
  - [ ] レスポンシブモーダルサイズ

### ステップ3: キャラクタ一覧
- [ ] `src/components/editor/script-director-v2/components/steps/Step3Characters.tsx` - 新規作成
  - [ ] キャラクタグリッド表示
  - [ ] 画像プレビュー
  - [ ] キャラクタ追加・編集・削除
  - [ ] モバイル: 2列グリッド、ピンチズーム
  - [ ] タブレット: 3-4列グリッド
  - [ ] デスクトップ: 4-6列適応グリッド
  - [ ] タップ/クリックで詳細表示

- [ ] `src/components/editor/script-director-v2/components/editors/CharacterEditor.tsx` - 新規作成
  - [ ] キャラクタ詳細編集
  - [ ] 顔画像アップロード
  - [ ] 音声設定
  - [ ] モバイル: フルスクリーンモーダル
  - [ ] デスクトップ: インライン編集対応

- [ ] `src/components/editor/script-director-v2/components/common/AssetUploader.tsx` - 新規作成
  - [ ] ファイル選択・ドラッグ&ドロップ
  - [ ] アップロード進捗表示
  - [ ] プレビュー機能
  - [ ] モバイル: カメラ直接起動
  - [ ] モバイル: ギャラリー選択最適化

### ステップ4: 台詞・画像編集
- [ ] `src/components/editor/script-director-v2/components/steps/Step4Dialogue.tsx` - 新規作成
  - [ ] シーンごとの台詞表示
  - [ ] 画像プレビュー
  - [ ] CM画像挿入UI
  - [ ] モバイル: タブ切り替え（台詞/画像）
  - [ ] モバイル: フローティングツールバー
  - [ ] デスクトップ: 分割画面（リサイズ可能）
  - [ ] 同期スクロール機能

- [ ] `src/components/editor/script-director-v2/components/editors/DialogueEditor.tsx` - 新規作成
  - [ ] 台詞編集フォーム
  - [ ] キャラクタ割り当て
  - [ ] プレビュー
  - [ ] モバイル: インライン編集
  - [ ] デスクトップ: マルチモーダル編集

- [ ] `src/components/editor/script-director-v2/components/editors/ImageEditor.tsx` - 新規作成
  - [ ] 画像プロンプト編集
  - [ ] カスタム画像アップロード
  - [ ] 画像位置調整
  - [ ] タッチ対応の画像操作

### ステップ5: 音声・BGM設定
- [ ] `src/components/editor/script-director-v2/components/steps/Step5AudioBGM.tsx` - 新規作成
  - [ ] 音声設定一覧
  - [ ] BGM設定UI
  - [ ] 字幕設定
  - [ ] モバイル: 簡易リスト表示
  - [ ] モバイル: プリセット中心UI
  - [ ] デスクトップ: 詳細タイムライン

- [ ] `src/components/editor/script-director-v2/components/editors/AudioTimeline.tsx` - 新規作成
  - [ ] タイムライン表示
  - [ ] BGM配置・編集
  - [ ] フェードイン・アウト設定
  - [ ] モバイル: 縦向きタイムライン
  - [ ] デスクトップ: マルチトラック表示
  - [ ] 波形表示（デスクトップのみ）

- [ ] `src/components/editor/script-director-v2/components/common/BGMSelector.tsx` - 新規作成
  - [ ] BGMライブラリ表示
  - [ ] プレビュー再生
  - [ ] カスタムBGMアップロード
  - [ ] モバイル: カテゴリ別リスト
  - [ ] ジェスチャーで音量調整

### カスタムフック
- [ ] `src/components/editor/script-director-v2/hooks/useWorkflowState.ts` - 新規作成
  - [ ] ワークフロー状態管理
  - [ ] ステップ遷移制御
  - [ ] 進捗保存

- [ ] `src/components/editor/script-director-v2/hooks/useAssetManager.ts` - 新規作成
  - [ ] アセット管理（画像、音声、BGM）
  - [ ] アップロード処理
  - [ ] 削除・更新

- [ ] `src/components/editor/script-director-v2/hooks/useAIGeneration.ts` - 新規作成
  - [ ] AI生成API呼び出し
  - [ ] 生成状態管理
  - [ ] エラーハンドリング

- [ ] `src/components/editor/script-director-v2/hooks/useBGMLibrary.ts` - 新規作成
  - [ ] BGMライブラリ取得
  - [ ] BGM検索・フィルタリング

- [ ] `src/components/editor/script-director-v2/hooks/useOfflineSync.ts` - 新規作成
  - [ ] オフライン検出
  - [ ] ローカルストレージ同期
  - [ ] 同期キュー管理
  - [ ] 再接続時の自動同期

### レスポンシブコンポーネント
- [ ] `src/components/editor/script-director-v2/components/responsive/ResponsiveContainer.tsx` - 新規作成
  - [ ] ブレークポイント検出
  - [ ] 条件付きレンダリング
  - [ ] デバイス別コンポーネント切り替え

- [ ] `src/components/editor/script-director-v2/components/responsive/TouchGestures.tsx` - 新規作成
  - [ ] スワイプ検出
  - [ ] ピンチズーム
  - [ ] 長押し処理
  - [ ] ドラッグ操作

- [ ] `src/components/editor/script-director-v2/components/responsive/TabletSidebar.tsx` - 新規作成
  - [ ] 折りたたみ可能サイドバー
  - [ ] フローティングボタン
  - [ ] ジェスチャー対応

- [ ] `src/components/editor/script-director-v2/components/responsive/DesktopLayout.tsx` - 新規作成
  - [ ] マルチカラムレイアウト
  - [ ] ドッキング可能パネル
  - [ ] ワイドスクリーン最適化

### スタイル
- [ ] `src/components/editor/script-director-v2/styles/ScriptDirectorV2.module.css` - 新規作成
  - [ ] ステップナビゲーションスタイル
  - [ ] 各ステップのレイアウト
  - [ ] レスポンシブデザイン

- [ ] `src/components/editor/script-director-v2/styles/mobile.module.css` - 新規作成
  - [ ] モバイル専用スタイル
  - [ ] タッチ最適化スタイル
  - [ ] 親指ゾーン考慮のレイアウト

- [ ] `src/components/editor/script-director-v2/styles/tablet.module.css` - 新規作成
  - [ ] タブレット最適化レイアウト
  - [ ] 2カラムグリッド
  - [ ] ペン入力対応スタイル

- [ ] `src/components/editor/script-director-v2/styles/desktop.module.css` - 新規作成
  - [ ] デスクトップレイアウト
  - [ ] ホバー効果
  - [ ] キーボード操作インジケーター

## Phase 3: APIエンドポイント

### 脚本生成API
- [ ] `src/app/api/stories/[id]/generate-screenplay/route.ts` - 新規作成
  - [ ] ストーリー要素から初期脚本生成
  - [ ] OpenAI API統合
  - [ ] レスポンス整形

### シーン詳細生成API
- [ ] `src/app/api/stories/[id]/generate-scene-details/route.ts` - 新規作成
  - [ ] 各シーンの台詞・画像生成
  - [ ] バッチ処理対応
  - [ ] プログレス通知

### アセットアップロードAPI
- [ ] `src/app/api/stories/[id]/upload-asset/route.ts` - 新規作成
  - [ ] ファイルアップロード処理
  - [ ] Supabase Storage統合
  - [ ] メタデータ管理

### BGMライブラリAPI
- [ ] `src/app/api/bgm/library/route.ts` - 新規作成
  - [ ] BGMリスト取得
  - [ ] カテゴリ・タグ対応

### ワークフロー状態API
- [ ] `src/app/api/stories/[id]/workflow-state/route.ts` - 新規作成
  - [ ] 状態の取得・更新
  - [ ] 進捗管理

### 動画生成API（拡張）
- [ ] `src/app/api/stories/[id]/generate-video/route.ts` - 更新
  - [ ] WorkflowMetadataからMulmoScriptへの変換
  - [ ] BGM処理の分離実装
  - [ ] 後処理パイプラインの追加

## Phase 4: 統合作業

### 既存コンポーネントの更新
- [ ] `src/app/stories/[id]/page.tsx` - 更新
  - [ ] ScriptDirector V2への切り替えオプション
  - [ ] フィーチャーフラグ対応

- [ ] `src/components/editor/index.ts` - 更新
  - [ ] ScriptDirectorV2のエクスポート追加

### プロンプトテンプレート
- [ ] `src/lib/prompt-templates.ts` - 更新
  - [ ] 脚本生成プロンプト追加
  - [ ] シーン詳細生成プロンプト追加
  - [ ] キャラクタ別の調整

### OpenAIクライアント
- [ ] `src/lib/openai-client.ts` - 更新
  - [ ] 新しい生成メソッド追加
  - [ ] ストリーミング対応

## Phase 5: テスト

### ユニットテスト
- [ ] `tests/unit/components/script-director-v2/` - 新規ディレクトリ
  - [ ] 各コンポーネントのテスト
  - [ ] カスタムフックのテスト

### 統合テスト
- [ ] `tests/integration/workflow/` - 新規ディレクトリ
  - [ ] ワークフロー全体のテスト
  - [ ] API統合テスト

### E2Eテスト
- [ ] `tests/e2e/workflows/script-director-v2.test.ts` - 新規作成
  - [ ] 5ステップの完全なフロー
  - [ ] エラーケース

### レスポンシブテスト
- [ ] `tests/e2e/responsive/mobile.test.ts` - 新規作成
  - [ ] モバイルでの全ステップ動作確認
  - [ ] タッチジェスチャーテスト
  - [ ] オフライン動作テスト

- [ ] `tests/e2e/responsive/tablet.test.ts` - 新規作成
  - [ ] タブレットレイアウト確認
  - [ ] ペン入力テスト
  - [ ] サイドバー動作テスト

- [ ] `tests/e2e/responsive/cross-device.test.ts` - 新規作成
  - [ ] デバイス間の切り替えテスト
  - [ ] データ同期確認
  - [ ] レイアウト切り替えテスト

- [ ] `tests/unit/hooks/responsive.test.ts` - 新規作成
  - [ ] useResponsiveフックテスト
  - [ ] useDeviceCapabilitiesテスト
  - [ ] useOfflineSyncテスト

## Phase 6: ドキュメント

### ユーザーガイド
- [ ] `docs/features/script-director-v2-user-guide.md` - 新規作成
  - [ ] 各ステップの使い方
  - [ ] Tips & トリック

### API仕様
- [ ] `docs/reference/script-director-v2-api.md` - 新規作成
  - [ ] エンドポイント仕様
  - [ ] リクエスト/レスポンス例

### 移行ガイド
- [ ] `docs/operations/script-director-migration-guide.md` - 新規作成
  - [ ] 既存データの移行方法
  - [ ] 後方互換性

## デプロイメント

### 環境変数
- [ ] `.env.local.example` - 更新
  - [ ] BGMライブラリ関連の設定追加
  - [ ] アセットサイズ制限設定

### Cloud Run設定
- [ ] `cloudbuild.yaml` - 更新（必要に応じて）
  - [ ] 新しい環境変数
  - [ ] リソース調整

### 監視・ログ
- [ ] ワークフロー完了率の監視追加
- [ ] 各ステップの処理時間計測
- [ ] エラー率の追跡

## 完了基準

### 機能要件
- [ ] 全5ステップが正常に動作
- [ ] AI生成が各段階で成功
- [ ] アセットアップロードが機能
- [ ] 既存機能との互換性維持

### レスポンシブ要件
- [ ] モバイル（320px〜）で全機能動作
- [ ] タブレット（768px〜）で最適化表示
- [ ] デスクトップ（1024px〜）でフル機能
- [ ] タッチ操作の完全対応
- [ ] オフライン時の基本編集機能
- [ ] デバイス間でのシームレスな切り替え

### パフォーマンス要件
- [ ] モバイルで初回ロード < 3秒
- [ ] デスクトップで初回ロード < 2秒
- [ ] レイアウト切り替え < 100ms
- [ ] 60fps以上のアニメーション

### 品質要件
- [ ] テストカバレッジ80%以上
- [ ] アクセシビリティスコア95以上
- [ ] Lighthouse Performance 90以上
- [ ] 全主要ブラウザ対応（iOS Safari含む）