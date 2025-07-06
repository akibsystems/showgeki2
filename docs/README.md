# showgeki2 技術ドキュメント

このディレクトリには、showgeki2プロジェクトの技術的な実装に関する包括的なドキュメントが含まれています。

## 📁 ディレクトリ構造

```
docs/
├── architecture/      # システムアーキテクチャと設計
├── features/         # 機能別の詳細実装
├── development/      # 開発環境とガイドライン
├── operations/       # 運用・監視・デプロイ
├── reference/        # APIリファレンスと仕様
├── requirements/     # 要件定義
└── testing/         # テスト関連ドキュメント
```

## 📚 ドキュメント一覧

### 🏗️ architecture/ - アーキテクチャ・設計

基本的なシステム設計とアーキテクチャに関するドキュメント：

- **[frontend-architecture.md](./architecture/frontend-architecture.md)** - Next.js 14 App Routerの構成とフロントエンド設計
- **[database-schema.md](./architecture/database-schema.md)** - データベース設計、テーブル構造、インデックス戦略
- **[authentication-system.md](./architecture/authentication-system.md)** - Supabase Auth統合と認証フロー

### ✨ features/ - 機能別実装

各機能の詳細な実装ドキュメント：

#### スクリプト編集機能
- **[script-editing-architecture.md](./features/script-editing-architecture.md)** - 脚本編集システムの全体設計
- **[script-director-implementation.md](./features/script-director-implementation.md)** - ビジュアルエディタの実装詳細
- **[script-generation-api.md](./features/script-generation-api.md)** - OpenAI GPT-4による脚本自動生成

#### 動画生成機能
- **[video-generation-pipeline.md](./features/video-generation-pipeline.md)** - Cloud Runでの動画生成プロセス

### 🛠️ development/ - 開発ガイド

開発環境のセットアップと開発ガイドライン：

- **[development-setup.md](./development/development-setup.md)** - 開発環境の構築手順
- **[testing-strategy.md](./development/testing-strategy.md)** - テスト戦略と実装方法
- **[coding-standards.md](./development/coding-standards.md)** - コーディング規約とベストプラクティス
- **[troubleshooting-guide.md](./development/troubleshooting-guide.md)** - よくある問題と解決方法

### 🚀 operations/ - 運用・デプロイ

本番環境の運用とデプロイメント：

- **[deployment.md](./operations/deployment.md)** - Cloud Runへのデプロイ手順
- **[migration-guide.md](./operations/migration-guide.md)** - データベース移行ガイド（8桁ID→UUID）
- **[monitoring-logging.md](./operations/monitoring-logging.md)** - 監視とログ管理
- **[performance-optimization.md](./operations/performance-optimization.md)** - パフォーマンス最適化手法
- **[security-guide.md](./operations/security-guide.md)** - セキュリティベストプラクティス

### 📖 reference/ - リファレンス

API仕様とリファレンス：

- **[api-design.md](./reference/api-design.md)** - REST API設計とエンドポイント仕様

### 📋 requirements/ - 要件定義

システム要件と実装チェックリスト（既存）

### 🧪 testing/ - テストドキュメント

テスト関連のガイドと実装（既存）

## 主要な技術スタック

- **フロントエンド**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Cloud Run
- **データベース**: Supabase (PostgreSQL)
- **動画生成**: mulmocast-cli, OpenAI APIs (GPT-4, DALL-E 3, TTS)
- **ストレージ**: Supabase Storage
- **認証**: Supabase Auth

## アーキテクチャ概要

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Supabase DB   │────▶│   Cloud Run    │
│   (Frontend)    │     │  (PostgreSQL)   │     │ (Video Gen)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│ Supabase Auth   │                           │   OpenAI APIs   │
└─────────────────┘                           │ GPT-4, DALL-E 3 │
                                              │      TTS        │
                                              └─────────────────┘
```

## クイックスタート

### 1. 開発環境のセットアップ
```bash
# development/development-setup.md を参照
npm install
cp .env.local.example .env.local
npm run dev
```

### 2. ドキュメントの参照順序

1. **新規開発者**: 
   - `development/development-setup.md` → `architecture/frontend-architecture.md` → `development/coding-standards.md`

2. **機能開発**: 
   - 関連する `features/` ドキュメント → `development/testing-strategy.md`

3. **デプロイ担当**: 
   - `operations/deployment.md` → `operations/monitoring-logging.md`

## ドキュメントの整理

このドキュメントは以下のスクリプトで整理されています：

```bash
# docsディレクトリで実行
chmod +x ../organize_docs.sh
../organize_docs.sh
```

## コントリビューション

新しいドキュメントを追加する際は：

1. 適切なカテゴリディレクトリに配置
2. このREADME.mdを更新
3. 関連する他のドキュメントからリンクを追加

## 関連リンク

- [CLAUDE.md](../CLAUDE.md) - AIアシスタント向けプロジェクト説明
- [package.json](../package.json) - 依存関係とスクリプト
- [migrations/](../migrations/) - データベース移行スクリプト