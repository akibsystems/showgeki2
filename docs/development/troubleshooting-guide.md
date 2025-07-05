# トラブルシューティングガイド

## 概要

このガイドでは、showgeki2の開発・運用で頻繁に発生する問題とその解決方法を説明します。問題はカテゴリ別に整理されており、迅速な問題解決を支援します。

## 目次

1. [開発環境の問題](#開発環境の問題)
2. [動画生成の問題](#動画生成の問題)
3. [API・認証の問題](#api認証の問題)
4. [データベースの問題](#データベースの問題)
5. [デプロイメントの問題](#デプロイメントの問題)
6. [パフォーマンスの問題](#パフォーマンスの問題)
7. [エラーメッセージ一覧](#エラーメッセージ一覧)

## 開発環境の問題

### Node.js バージョンエラー

**症状**: `yargs parser supports a minimum Node.js version of 20`

**原因**: Node.jsのバージョンが古い

**解決方法**:
```bash
# バージョン確認
node --version

# nvmを使用してアップグレード
nvm install 22
nvm use 22

# または直接インストール
# macOS
brew upgrade node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### npm install失敗

**症状**: `npm ERR! code ERESOLVE`

**解決方法**:
```bash
# 1. キャッシュクリア
npm cache clean --force

# 2. node_modulesとlockファイル削除
rm -rf node_modules package-lock.json

# 3. 再インストール
npm install

# それでも失敗する場合
npm install --legacy-peer-deps
```

### 環境変数が読み込まれない

**症状**: `NEXT_PUBLIC_SUPABASE_URL is not defined`

**解決方法**:
```bash
# 1. .env.localファイルの確認
ls -la .env.local

# 2. ファイルが存在しない場合
cp .env.local.example .env.local

# 3. 環境変数の確認
cat .env.local | grep SUPABASE

# 4. Next.jsサーバーの再起動
# Ctrl+C で停止後
npm run dev
```

### Dockerビルドエラー

**症状**: `Cannot connect to the Docker daemon`

**解決方法**:
```bash
# macOS/Windows
# Docker Desktopが起動しているか確認

# Linux
sudo systemctl status docker
sudo systemctl start docker

# 権限エラーの場合
sudo usermod -aG docker $USER
newgrp docker
```

## 動画生成の問題

### 429 Rate Limit エラー

**症状**: `Rate limit exceeded (429)`

**原因**: 同時実行数の制限またはOpenAI APIのレート制限

**解決方法**:

1. **Cloud Run設定の調整**:
```bash
# 最大インスタンス数を増やす
gcloud run services update showgeki2-auto-process \
  --max-instances 200 \
  --region asia-northeast1
```

2. **負荷テストスクリプトの調整**:
```javascript
// load-test-concurrent.js
const CONCURRENT_USERS = 5; // 20から5に減らす
const DELAY_BETWEEN_REQUESTS = 2000; // 遅延を追加
```

3. **OpenAI APIキーの確認**:
```bash
# 使用量の確認
# https://platform.openai.com/usage
```

### 動画生成タイムアウト

**症状**: `Processing timeout` または動画が生成されない

**解決方法**:

1. **Cloud Runのタイムアウト延長**:
```bash
gcloud run services update showgeki2-auto-process \
  --timeout 3600 \
  --region asia-northeast1
```

2. **ローカル環境でのデバッグ**:
```bash
# Dockerコンテナで直接テスト
docker-compose up showgeki2-dev
docker-compose exec showgeki2-dev node scripts/test-mulmocast.js
```

### mulmocast-cli エラー

**症状**: `Failed to launch the browser process!`

**解決方法**:

1. **Puppeteer環境変数の確認**:
```dockerfile
# Dockerfile
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CI=true
```

2. **必要なパッケージの確認**:
```bash
# コンテナ内で確認
docker exec -it showgeki2-dev sh
which chromium-browser
fc-list | grep -i japan  # 日本語フォント確認
```

### 字幕付き動画が見つからない

**症状**: `動画ファイルが見つかりません: script__ja.mp4`

**解決方法**:

```javascript
// webhook-handler.js の確認
const captionLang = script_json.captionParams?.lang;
const outputFiles = captionLang 
  ? [`script__${captionLang}.mp4`]  // 字幕付き
  : ['script.mp4'];                  // 字幕なし
```

## API・認証の問題

### 401 Unauthorized エラー

**症状**: `Invalid token` または `Unauthorized`

**解決方法**:

1. **トークンの確認**:
```javascript
// フロントエンド
const token = await supabase.auth.getSession();
console.log('Token:', token?.access_token);

// APIリクエスト
headers: {
  'Authorization': `Bearer ${token.access_token}`
}
```

2. **Supabase設定の確認**:
```bash
# .env.local
SUPABASE_SERVICE_KEY=your-service-key  # anon keyではなくservice key
```

### CORS エラー

**症状**: `Access to fetch at ... has been blocked by CORS policy`

**解決方法**:

1. **Next.js API Routeの設定**:
```typescript
// app/api/route.ts
export async function POST(request: Request) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}
```

2. **Vercel設定**:
```json
// vercel.json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

## データベースの問題

### Row Level Security (RLS) エラー

**症状**: `new row violates row-level security policy`

**解決方法**:

1. **RLSポリシーの確認**:
```sql
-- 現在のポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'stories';

-- ポリシーの更新
DROP POLICY IF EXISTS stories_user_access ON stories;
CREATE POLICY stories_user_access ON stories
  FOR ALL
  USING (uid = auth.uid());
```

2. **サービスキーの使用**（バックエンドのみ）:
```javascript
// サービスキーはRLSをバイパス
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

### マイグレーションエラー

**症状**: `relation "stories" already exists`

**解決方法**:

```sql
-- 1. 既存テーブルの確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. IF NOT EXISTS を使用
CREATE TABLE IF NOT EXISTS stories (...);

-- 3. または既存テーブルを削除（注意！）
DROP TABLE IF EXISTS stories CASCADE;
```

## デプロイメントの問題

### Cloud Run デプロイ失敗

**症状**: `ERROR: (gcloud.run.deploy) Failed to deploy service`

**解決方法**:

1. **認証の確認**:
```bash
gcloud auth login
gcloud config set project showgeki2
```

2. **APIの有効化**:
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

3. **権限の確認**:
```bash
# プロジェクト番号を取得
PROJECT_NUMBER=$(gcloud projects describe showgeki2 --format="value(projectNumber)")

# Secret Manager権限を付与
gcloud projects add-iam-policy-binding showgeki2 \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Dockerイメージプッシュエラー

**症状**: `denied: Token exchange failed`

**解決方法**:
```bash
# Docker認証設定
gcloud auth configure-docker

# または明示的に認証
gcloud auth print-access-token | docker login -u oauth2accesstoken --password-stdin gcr.io
```

### メモリ不足エラー

**症状**: `Memory limit exceeded` in Cloud Run logs

**解決方法**:
```bash
# メモリを増やす
gcloud run services update showgeki2-auto-process \
  --memory 8Gi \
  --cpu 4 \
  --region asia-northeast1
```

## パフォーマンスの問題

### フロントエンドの遅延

**症状**: ページロードが遅い

**解決方法**:

1. **ビルド最適化**:
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-supabase-url.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
};
```

2. **動的インポート**:
```javascript
// 重いコンポーネントの遅延ロード
const ScriptDirector = dynamic(
  () => import('@/components/editor/ScriptDirector'),
  { 
    loading: () => <Spinner />,
    ssr: false 
  }
);
```

### データベースクエリの遅延

**症状**: APIレスポンスが遅い

**解決方法**:

1. **インデックスの追加**:
```sql
-- よく検索されるカラムにインデックス追加
CREATE INDEX idx_stories_status_created ON stories(status, created_at DESC);
```

2. **クエリの最適化**:
```javascript
// N+1問題を避ける
const { data } = await supabase
  .from('stories')
  .select(`
    *,
    videos (
      id,
      status,
      video_url
    )
  `)
  .limit(20);
```

## エラーメッセージ一覧

### OpenAI API エラー

| エラーコード | 意味 | 解決方法 |
|------------|------|----------|
| 401 | APIキー無効 | APIキーを確認・更新 |
| 429 | レート制限 | リトライまたは待機 |
| 500 | OpenAIサーバーエラー | 時間をおいて再試行 |
| context_length_exceeded | トークン制限超過 | テキストを短くする |

### Supabase エラー

| エラー | 意味 | 解決方法 |
|--------|------|----------|
| PGRST301 | RLS違反 | ポリシーを確認 |
| PGRST204 | データなし | クエリを確認 |
| 23505 | 重複エラー | ユニーク制約を確認 |
| 23503 | 外部キー違反 | 参照整合性を確認 |

### mulmocast-cli エラー

| エラー | 意味 | 解決方法 |
|--------|------|----------|
| ENOENT | ファイル未発見 | パスを確認 |
| FFMPEG_ERROR | 動画処理エラー | FFmpegログを確認 |
| BROWSER_ERROR | Puppeteerエラー | Chromium設定を確認 |

## デバッグツール

### ログの確認

```bash
# Cloud Runログ
gcloud run services logs read showgeki2-auto-process \
  --region asia-northeast1 \
  --limit 100 \
  --format json | jq '.entries[].jsonPayload'

# ローカルログ
docker-compose logs -f showgeki2-dev --tail 100

# フロントエンドログ
# ブラウザのDeveloper Tools → Console
```

### ネットワーク監視

```bash
# APIリクエストの確認
# ブラウザのDeveloper Tools → Network

# curlでAPIテスト
curl -X POST http://localhost:3000/api/stories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Test"}'
```

### データベース確認

```sql
-- 最近のエラー確認
SELECT * FROM videos 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;

-- 処理時間の分析
SELECT 
  AVG(proc_time) as avg_time,
  MAX(proc_time) as max_time,
  COUNT(*) as total
FROM videos
WHERE status = 'completed';
```

## 緊急時の対応

### サービス停止時

1. **ステータス確認**:
```bash
./scripts/check-cloudrun-status.sh
```

2. **手動リスタート**:
```bash
gcloud run services update showgeki2-auto-process \
  --region asia-northeast1 \
  --no-traffic
  
gcloud run services update showgeki2-auto-process \
  --region asia-northeast1 \
  --traffic 100
```

3. **ロールバック**:
```bash
# 前のリビジョンに戻す
gcloud run services update-traffic showgeki2-auto-process \
  --to-revisions showgeki2-auto-process-00001-abc=100 \
  --region asia-northeast1
```

## 問題が解決しない場合

1. **詳細なログを収集**
2. **再現手順を明確化**
3. **関連するコードやエラーメッセージを記録**
4. **チームメンバーまたはGitHub Issuesで相談**

関連ドキュメント:
- [開発環境セットアップ](./development-setup.md)
- [デプロイメントガイド](./deployment.md)
- [監視・ログ管理](./monitoring-logging.md)