#!/bin/bash

# 開発環境セットアップスクリプト

set -e

# 色設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 mulmocast-cli開発環境セットアップ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 必要なディレクトリを作成
echo -e "${YELLOW}📁 必要なディレクトリを作成中...${NC}"
mkdir -p mulmocast-output mulmocast-scripts logs

echo "  ✅ mulmocast-output/ - 動画出力用"
echo "  ✅ mulmocast-scripts/ - スクリプト保存用"
echo "  ✅ logs/ - ログ保存用"
echo ""

# 2. 環境変数ファイルの確認
echo -e "${YELLOW}🔧 環境変数ファイルの確認...${NC}"
if [ ! -f .env.local ]; then
  echo -e "${RED}❌ .env.local ファイルが見つかりません${NC}"
  echo "以下の内容で .env.local ファイルを作成してください:"
  echo ""
  echo "SUPABASE_URL=your_supabase_url"
  echo "SUPABASE_SERVICE_KEY=your_supabase_service_key"
  echo "OPENAI_API_KEY=your_openai_api_key"
  echo ""
  exit 1
else
  echo "  ✅ .env.local ファイルが存在します"
fi

# 環境変数の読み込み確認
source .env.local
if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${RED}❌ OPENAI_API_KEY が設定されていません${NC}"
  exit 1
else
  echo "  ✅ OPENAI_API_KEY が設定されています"
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo -e "${RED}❌ Supabase設定が不完全です${NC}"
  exit 1
else
  echo "  ✅ Supabase設定が完了しています"
fi

echo ""

# 3. Docker環境の確認
echo -e "${YELLOW}🐳 Docker環境の確認...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Dockerがインストールされていません${NC}"
  echo "Dockerをインストールしてください: https://docs.docker.com/get-docker/"
  exit 1
else
  echo "  ✅ Docker: $(docker --version)"
fi

if ! command -v docker-compose &> /dev/null; then
  echo -e "${RED}❌ Docker Composeがインストールされていません${NC}"
  echo "Docker Composeをインストールしてください"
  exit 1
else
  echo "  ✅ Docker Compose: $(docker-compose --version)"
fi

echo ""

# 4. 開発環境の起動
echo -e "${YELLOW}🏗️  開発環境を構築・起動中...${NC}"
echo "この処理には数分かかる場合があります..."
echo ""

# Docker イメージをビルド
docker-compose build showgeki2-dev

echo ""
echo -e "${GREEN}✅ セットアップ完了！${NC}"
echo ""
echo -e "${GREEN}🎯 使用方法:${NC}"
echo ""
echo "# 1. 開発環境を起動"
echo "docker-compose up showgeki2-dev"
echo ""
echo "# 2. 別ターミナルでWebhookテスト"
echo "node scripts/test-local.js"
echo ""
echo "# 3. mulmocast-cliテスト"
echo "docker-compose exec showgeki2-dev node scripts/test-mulmocast.js"
echo ""
echo "# 4. コンテナ内にアクセス"
echo "docker-compose exec showgeki2-dev bash"
echo ""
echo -e "${GREEN}🌐 アクセスポイント:${NC}"
echo "  - ヘルスチェック: http://localhost:8080/health"
echo "  - Webhook: http://localhost:8080/webhook"
echo ""
echo -e "${GREEN}📁 ファイル共有:${NC}"
echo "  - ./scripts/ ↔ /app/scripts/"
echo "  - ./mulmocast-output/ ↔ /app/mulmocast-cli/output/"
echo "  - ./mulmocast-scripts/ ↔ /app/mulmocast-cli/scripts/"
echo ""
echo -e "${GREEN}🎬 mulmocast-cli について:${NC}"
echo "  開発環境では実際のmulmocast-cliで動画生成を行います。"
echo "  初回実行時は依存関係のダウンロードに時間がかかります。"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"