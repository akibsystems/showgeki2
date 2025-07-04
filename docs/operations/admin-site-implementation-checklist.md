# 管理サイト実装チェックリスト

## Phase 1: 基盤構築

### データベース設定
- [x] 管理者テーブル（admins）のマイグレーションファイル作成
- [x] RLSポリシー設定
- [x] 統計ビュー（stats_view）の作成
- [ ] マイグレーション実行

### 認証システム
- [x] 管理者認証ミドルウェア（withAdminAuth）実装
- [x] 管理者権限チェック関数作成
- [x] エラーレスポンス処理

### 基本レイアウト
- [x] /admin ルートの設定
- [x] 管理者用レイアウトコンポーネント作成
- [x] 管理者用ナビゲーション作成
- [x] 認証リダイレクト処理

## Phase 2: 統計機能

### バックエンド
- [x] GET /api/admin/stats エンドポイント実装
- [x] 日別統計データ処理関数
- [x] 週別・月別集計機能
- [x] ストレージ使用量計算

### フロントエンド
- [x] 統計ダッシュボードページ（/admin）作成
- [x] StatCardコンポーネント実装
- [x] rechartsパッケージインストール
- [x] UsageChartコンポーネント実装
- [x] データフェッチフック（useAdminStats）作成

## Phase 3: 動画管理機能

### バックエンド
- [x] GET /api/admin/videos エンドポイント実装
  - [x] ページネーション対応
  - [x] フィルタリング（status, date range）
  - [x] ユーザー情報の結合
- [x] DELETE /api/admin/videos 一括削除エンドポイント
  - [x] ストレージからの削除処理
  - [x] データベースからの削除処理
  - [x] トランザクション処理

### フロントエンド
- [x] 動画管理ページ（/admin/videos）作成
- [ ] @tanstack/react-tableパッケージインストール（※カスタムテーブル実装で対応）
- [x] VideoTableコンポーネント実装
  - [x] チェックボックス選択機能
  - [ ] ソート機能（※基本実装のみ）
  - [x] ページネーション
- [x] VideoFiltersコンポーネント実装
  - [x] 日付範囲フィルター
  - [x] ステータスフィルター
  - [x] ユーザー検索
- [x] 動画プレビューモーダル実装
- [x] 削除確認ダイアログ
- [x] データフェッチフック（useAdminVideos）作成

## Phase 4: 仕上げ

### エラーハンドリング
- [x] 403 Forbiddenページ作成
- [x] エラーバウンダリー実装
- [x] APIエラーの適切な表示

### UX改善
- [x] ローディングスケルトン実装
- [x] 操作成功/失敗のトースト通知
- [x] レスポンシブデザイン調整
- [ ] キーボードショートカット

### セキュリティ
- [ ] 管理者操作の監査ログ実装
- [ ] レート制限の適用
- [ ] CSRFトークン検証

### テスト
- [ ] 管理者認証のユニットテスト
- [ ] 統計APIのテスト
- [ ] 動画管理APIのテスト
- [ ] E2Eテスト（管理者フロー）

## 初期設定

### 環境準備
- [ ] 必要なnpmパッケージのインストール
- [ ] 型定義ファイルの作成
- [ ] 環境変数の確認

### 初期データ
- [ ] 開発環境用の管理者アカウント作成
- [ ] テスト用データのシード作成

## 完了基準

- [ ] 管理者のみがアクセスできることを確認
- [ ] 統計情報が正しく表示されることを確認
- [ ] 動画の一括削除が正常に動作することを確認
- [ ] レスポンシブデザインが適切に動作することを確認
- [ ] エラーハンドリングが適切に行われることを確認