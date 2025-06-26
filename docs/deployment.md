# Cloud Run デプロイメントガイド

## 概要

ユーザーがストーリーを投稿した瞬間に自動で動画生成処理を開始するリアルタイム処理システムのデプロイ手順です。

## アーキテクチャ

```
ユーザー投稿 → Supabase → Database Webhook → Cloud Run → 動画生成処理
```

## 事前準備

### 1. Google Cloud SDK のインストール
```bash
# macOS
brew install google-cloud-sdk

# 認証
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Docker のインストール
```bash
# macOS
brew install docker
```

### 3. 必要なAPI の有効化
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

## デプロイ手順

### 1. プロジェクト設定
`deploy.sh` ファイルの `PROJECT_ID` を自分のGoogle CloudプロジェクトIDに変更：

```bash
PROJECT_ID="your-actual-project-id"
```

### 2. 環境変数の設定
シークレットファイルを作成：

```bash
# supabase.env
url=your_supabase_url
service_key=your_supabase_service_key

# openai.env  
api_key=your_openai_api_key
```

### 3. デプロイ実行
```bash
./deploy.sh
```

### 4. シークレットの更新（自動作成済みの場合は不要）
```bash
gcloud secrets versions add supabase-url --data-file=<(echo "your_supabase_url") --project=YOUR_PROJECT_ID
gcloud secrets versions add supabase-service-key --data-file=<(echo "your_service_key") --project=YOUR_PROJECT_ID
gcloud secrets versions add openai-api-key --data-file=<(echo "your_api_key") --project=YOUR_PROJECT_ID
```

## 設定詳細

### リソース設定
- **CPU**: 1 vCPU
- **メモリ**: 2GB
- **最大スケール**: 10インスタンス
- **最小スケール**: 0インスタンス（コスト削減）
- **タイムアウト**: 3600秒（1時間）

### 環境変数
- `NODE_ENV=production`
- `PORT=8080`
- Supabase設定（シークレットから取得）
- OpenAI API設定（シークレットから取得）

## ファイル構成

- `Dockerfile` - Cloud Run用のコンテナ設定
- `clouddeploy.yaml` - Cloud Runサービス設定
- `scripts/webhook-handler.js` - Webhook受信・処理スクリプト
- `deploy.sh` - デプロイメント自動化スクリプト

## 監視とログ

### ログの確認
```bash
# リアルタイムログ
gcloud run services logs tail showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=YOUR_PROJECT_ID \
  --follow

# 過去のログ
gcloud run services logs read showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=YOUR_PROJECT_ID \
  --limit=50
```

### サービスの状態確認
```bash
gcloud run services describe showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=YOUR_PROJECT_ID
```

### 非侵襲的状態チェック
```bash
./check-cloudrun-status.sh
```

## トラブルシューティング

### 設定関連

#### 1. メモリ不足エラー
処理が重い場合、メモリを増やしてください：

```yaml
# clouddeploy.yaml
resources:
  limits:
    memory: "4Gi"  # 2Gi -> 4Gi
```

#### 2. タイムアウトエラー
長時間の処理が必要な場合：

```yaml
# clouddeploy.yaml
annotations:
  run.googleapis.com/timeout: "7200"  # 2時間
```

### デプロイエラー

#### 1. Docker認証エラー
```bash
gcloud auth configure-docker
```

#### 2. Secret Manager API無効
```bash
gcloud services enable secretmanager.googleapis.com --project=YOUR_PROJECT_ID
```

#### 3. 権限エラー
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### デバッグ用コマンド

```bash
# ヘルスチェック
curl https://YOUR_SERVICE_URL/health

# サービス詳細
gcloud run services describe showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=YOUR_PROJECT_ID
```

## コスト最適化

- 最小スケール0で未使用時のコストを削減
- CPU制限なしのフラグを無効にしてコスト削減
- 必要に応じてリージョンを変更（asia-northeast1は東京）

### コスト分析

| 方式 | 月額コスト | 特徴 |
|------|-----------|------|
| **常時監視** | ~$36 | 24時間稼働、即座に処理 |
| **Webhook** | ~$0.50-2 | 処理時のみ課金、リアルタイム |

### コスト内訳（Webhook方式）

- **CPU使用量**: $0.0000024/vCPU秒
- **メモリ使用量**: $0.0000025/GB秒  
- **リクエスト**: $0.0000004/リクエスト

**月10回処理の場合**: 約$0.50
**月100回処理の場合**: 約$2.00

## セキュリティ

- 環境変数はGoogle Cloud Secretsで管理
- サービスアカウントに最小権限を付与
- イングレスは必要に応じて制限
- Webhook認証の実装推奨（本番環境）