# ローカル開発環境ガイド

## 概要

showgeki2のローカル開発環境セットアップと、エンドツーエンドテストの実行方法を説明します。

## 前提条件

- Docker & Docker Compose
- Node.js 18+
- OpenAI API キー

## 🚀 ローカル開発環境セットアップ

### 1. 環境設定

`.env.local` ファイルを設定：

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://soaespvgmvsjgnkghvzf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# For upload script only
SUPABASE_URL=https://soaespvgmvsjgnkghvzf.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# ローカルWebhookコンテナを使用
CLOUD_RUN_WEBHOOK_URL=http://localhost:8080/webhook
```

### 2. ローカルWebhookコンテナ起動

```bash
# コンテナをバックグラウンドで起動
docker-compose up -d

# ログを別ターミナルで監視（推奨）
docker-compose logs -f
```

### 3. フロントエンド開発サーバー起動

```bash
# 別ターミナルで Next.js 開発サーバー起動
npm run dev
```

これで以下のサービスが利用可能になります：
- **フロントエンド**: http://localhost:3000
- **Webhookコンテナ**: http://localhost:8080
- **ヘルスチェック**: http://localhost:8080/health

## 🧪 テスト実行

### エンドツーエンドテスト

```bash
# ローカル環境でのエンドツーエンドテスト
WEBHOOK_MODE=local node scripts/test-cloud-run.js
```

このテストでは以下の処理を自動実行します：

1. **ワークスペース作成** - ローカルAPI経由
2. **ストーリー作成** - ローカルAPI経由
3. **スクリプト生成** - ローカルAPI + OpenAI API
4. **動画生成** - ローカルWebhook経由（mulmocast-cli使用）
5. **動画完了確認** - ローカルAPIで状態確認
6. **URL検証** - 生成された動画URLの確認

### 個別コンポーネントテスト

#### Webhookコンテナの直接テスト

```bash
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "video_generation",
    "payload": {
      "video_id": "01234567-89ab-cdef-0123-456789abcdef",
      "story_id": "ABCD1234",
      "uid": "12345678-1234-1234-1234-123456789abc",
      "title": "テスト動画",
      "text_raw": "昔々あるところに、勇敢な騎士がいました。"
    }
  }'
```

#### ヘルスチェック

```bash
curl http://localhost:8080/health
# Expected: OK
```

## 🔧 トラブルシューティング

### よくある問題

#### 1. Webhookコンテナが起動しない

```bash
# コンテナ状態確認
docker-compose ps

# ログ確認
docker-compose logs showgeki2

# 再起動
docker-compose restart
```

#### 2. OpenAI API キーエラー

```bash
# 環境変数確認
echo $OPENAI_API_KEY

# .env.local の内容確認
cat .env.local | grep OPENAI
```

#### 3. ポート競合

```bash
# ポート使用状況確認
lsof -i :8080
lsof -i :3000

# 使用中のサービス停止
docker-compose down
```

### ログ監視のコツ

#### リアルタイムログ監視

```bash
# 全サービスのログ
docker-compose logs -f

# 特定サービスのみ
docker-compose logs -f showgeki2

# エラーのみフィルタリング
docker-compose logs -f | grep -i error
```

## 🔄 開発ワークフロー

### 推奨開発フロー

1. **環境起動**
   ```bash
   docker-compose up -d
   npm run dev
   ```

2. **ログ監視（別ターミナル）**
   ```bash
   docker-compose logs -f
   ```

3. **コード変更 & テスト**
   - フロントエンドはホットリロード
   - バックエンド変更は `docker-compose restart`

4. **エンドツーエンドテスト**
   ```bash
   WEBHOOK_MODE=local node scripts/test-cloud-run.js
   ```

5. **動画確認**
   - `./mulmocast-output/` フォルダで生成物確認
   - フロントエンドで動画再生テスト

### ファイル監視

生成されたファイルは以下で確認できます：

```bash
# 動画ファイル
ls -la ./mulmocast-output/

# ログファイル
ls -la ./logs/

# スクリプトファイル
ls -la ./scripts/
```

## 🏗️ 本番デプロイ前チェック

### 環境切り替えテスト

```bash
# Cloud Run環境でテスト
WEBHOOK_MODE=cloud node scripts/test-cloud-run.js

# .env.local のCLOUD_RUN_WEBHOOK_URLを本番に戻す
# CLOUD_RUN_WEBHOOK_URL=https://showgeki2-auto-process-598866385095.asia-northeast1.run.app/webhook
```

### パフォーマンステスト

```bash
# 複数並列テスト
for i in {1..3}; do
  WEBHOOK_MODE=local node scripts/test-cloud-run.js &
done
wait
```

## 📚 参考資料

- [Webhook API ドキュメント](./webhook-api.md)
- [デプロイメントガイド](./deployment.md)
- [実装チェックリスト](./requirements/implementation-checklist.md)