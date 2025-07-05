# 開発環境セットアップガイド

## 概要

このガイドでは、showgeki2プロジェクトの開発環境を新規にセットアップする手順を説明します。macOS、Windows、Linuxでの環境構築に対応しています。

## 前提条件

### 必須ツール

- **Node.js**: v20以上（推奨: v22）
- **npm**: v10以上
- **Git**: v2.30以上
- **Docker**: v20以上（動画生成のローカルテスト用）
- **VS Code**（推奨）または好みのエディタ

### 推奨ツール

- **pnpm**: より高速なパッケージ管理
- **GitHub Copilot**: AI支援コーディング
- **Postman/Insomnia**: API開発・テスト

## 1. 基本セットアップ

### 1.1 リポジトリのクローン

```bash
# HTTPSを使用
git clone https://github.com/your-org/showgeki2.git
cd showgeki2

# または、SSHを使用（推奨）
git clone git@github.com:your-org/showgeki2.git
cd showgeki2
```

### 1.2 Node.jsのインストール

#### macOS
```bash
# Homebrewを使用
brew install node@22

# または nvm を使用
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22
```

#### Windows
```powershell
# Chocolateyを使用
choco install nodejs

# または公式サイトからダウンロード
# https://nodejs.org/
```

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# または nvm を使用
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
```

### 1.3 依存関係のインストール

```bash
# プロジェクトルートで実行
npm install

# または pnpm を使用（推奨）
npm install -g pnpm
pnpm install
```

## 2. 環境変数の設定

### 2.1 環境変数ファイルの作成

```bash
# .env.localファイルをコピー
cp .env.local.example .env.local
```

### 2.2 必須環境変数

`.env.local`ファイルを編集：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# OpenAI設定
OPENAI_API_KEY=sk-your-api-key

# 開発環境設定
OPENAI_IMAGE_QUALITY_DEFAULT=low  # 開発時はコスト削減のためlow推奨
NODE_ENV=development
```

### 2.3 Supabaseプロジェクトの設定

1. [Supabase](https://app.supabase.com)にアクセス
2. 新規プロジェクトを作成（または既存のプロジェクトを使用）
3. Settings → API から以下を取得：
   - Project URL → `SUPABASE_URL`
   - Anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_KEY`

### 2.4 OpenAI APIキーの取得

1. [OpenAI Platform](https://platform.openai.com)にアクセス
2. API Keys → Create new secret key
3. 生成されたキーを`OPENAI_API_KEY`に設定

## 3. データベースセットアップ

### 3.1 マイグレーションの実行

```bash
# Supabaseダッシュボードで実行
# SQL Editor → New Query

# 1. 初期スキーマを作成
# migrations/000_initial_schema_recreation.sql の内容をコピー&実行

# 2. 追加の変更がある場合
# migrations/001_add_beats_column.sql などを順次実行
```

### 3.2 テストデータの作成（オプション）

```sql
-- テスト用ワークスペースとストーリーを作成
INSERT INTO workspaces (uid, name) 
VALUES ('test-uid-12345', 'テスト用ワークスペース');

INSERT INTO stories (workspace_id, uid, title, text_raw, status)
VALUES (
  (SELECT id FROM workspaces WHERE name = 'テスト用ワークスペース'),
  'test-uid-12345',
  'テストストーリー',
  'これはテスト用のストーリーです。',
  'draft'
);
```

## 4. Docker環境のセットアップ

### 4.1 Dockerのインストール

#### macOS/Windows
[Docker Desktop](https://www.docker.com/products/docker-desktop)をダウンロード＆インストール

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 4.2 開発用Dockerイメージのビルド

```bash
# 開発用コンテナのビルド
docker-compose build showgeki2-dev

# または個別にビルド
docker build -f Dockerfile.dev -t showgeki2-dev .
```

### 4.3 Dockerコンテナの起動

```bash
# 開発環境の起動
docker-compose up showgeki2-dev

# バックグラウンドで起動
docker-compose up -d showgeki2-dev

# ログの確認
docker-compose logs -f showgeki2-dev
```

## 5. 開発サーバーの起動

### 5.1 フロントエンド開発サーバー

```bash
# 開発サーバーの起動
npm run dev

# または特定のポートで起動
PORT=3001 npm run dev
```

アクセス: http://localhost:3000

### 5.2 ローカルWebhookサーバー（動画生成テスト用）

```bash
# 別ターミナルで実行
node scripts/test-local.js
```

## 6. VS Code設定（推奨）

### 6.1 推奨拡張機能

`.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "csstools.postcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "yoavbls.pretty-ts-errors"
  ]
}
```

### 6.2 ワークスペース設定

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## 7. 開発ワークフロー

### 7.1 ブランチ戦略

```bash
# 新機能の開発
git checkout -b feature/new-feature

# バグ修正
git checkout -b fix/bug-description

# ドキュメント更新
git checkout -b docs/update-readme
```

### 7.2 コミット規約

```bash
# 機能追加
git commit -m "feat: 新しい動画エフェクトを追加"

# バグ修正
git commit -m "fix: 動画生成のタイムアウトエラーを修正"

# ドキュメント
git commit -m "docs: 開発環境セットアップガイドを更新"

# リファクタリング
git commit -m "refactor: API クライアントの構造を改善"
```

### 7.3 テストの実行

```bash
# 全テストの実行
npm test

# 単体テストのみ
npm run test:unit

# カバレッジレポート付き
npm run test:coverage

# 特定のファイルのテスト
npm test -- components/Button.test.tsx
```

## 8. よくある問題と解決方法

### 8.1 npm install エラー

```bash
# キャッシュクリア
npm cache clean --force

# node_modules削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### 8.2 Docker関連のエラー

```bash
# Dockerデーモンが起動していない
sudo systemctl start docker  # Linux
# macOS/Windows: Docker Desktopを起動

# 権限エラー（Linux）
sudo usermod -aG docker $USER
newgrp docker
```

### 8.3 環境変数が読み込まれない

```bash
# .env.localファイルの確認
cat .env.local

# Next.jsサーバーの再起動
# Ctrl+C で停止後
npm run dev
```

## 9. デバッグ設定

### 9.1 VS Code デバッグ設定

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

### 9.2 ブラウザ開発ツール

1. React Developer Tools のインストール
2. Redux DevTools（使用している場合）
3. Network タブでAPIリクエストの監視

## 10. パフォーマンス最適化（開発時）

### 10.1 Next.js の高速リフレッシュ

```bash
# Turbopackを使用（実験的）
npm run dev -- --turbo
```

### 10.2 TypeScript の設定

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "incremental": true,
    "skipLibCheck": true
  }
}
```

## まとめ

以上で基本的な開発環境のセットアップは完了です。追加の設定や詳細については以下を参照してください：

- [フロントエンドアーキテクチャ](./frontend-architecture.md)
- [API設計](./api-design.md)
- [テスト戦略](./testing-strategy.md)
- [コーディング規約](./coding-standards.md)

問題が発生した場合は、[トラブルシューティングガイド](./troubleshooting-guide.md)を参照するか、チームメンバーに相談してください。