# Cloud Run デプロイメントガイド

## 概要

新しいデータベーススキーマ（workspaces, stories, videos）を使用した動画生成システムのCloud Runデプロイメントガイドです。webhook-handler.jsがOpenAI o4-miniモデルとmulmocast-cliを使用して高品質な動画を生成します。

## アーキテクチャ

```
Next.js API Routes → Cloud Run Webhook → mulmocast-cli → Supabase Storage
     ↓                    ↓                  ↓               ↓
[Workspaces]         [Script生成]      [動画生成]      [動画配信]
[Stories]            [OpenAI o4-mini]   [FFmpeg]        [公開URL]
[Videos]             [JSON生成]         [音声合成]      [メタデータ更新]
```

### 新しいスキーマ構成

- **workspaces**: プロジェクト管理単位
- **stories**: ストーリーテキストとスクリプト管理
- **videos**: 動画ファイルとメタデータ管理
- **UID based**: 匿名ユーザー識別による データ隔離

## 事前準備

### 1. Google Cloud SDK のインストール
```bash
# macOS
brew install google-cloud-sdk

# 認証
gcloud auth login
gcloud config set project showgeki2
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
gcloud secrets versions add supabase-url --data-file=<(echo "your_supabase_url") --project=showgeki2
gcloud secrets versions add supabase-service-key --data-file=<(echo "your_service_key") --project=showgeki2
gcloud secrets versions add openai-api-key --data-file=<(echo "your_api_key") --project=showgeki2
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

- `Dockerfile` - Cloud Run用のコンテナ設定（mulmocast-cli統合済み）
- `clouddeploy.yaml` - Cloud Runサービス設定
- `scripts/webhook-handler.js` - Webhook受信・処理スクリプト（新スキーマ対応）
- `deploy.sh` - デプロイメント自動化スクリプト
- `scripts/test-cloud-run.js` - ハイブリッドテストスクリプト

### webhook-handler.js の詳細

新しいwebhook-handler.jsは以下の処理を実行します：

1. **Webhook受信**: `/webhook` エンドポイントでvideo_generation リクエストを受信
2. **スクリプト生成**: OpenAI o4-miniモデルで5幕構成のシェイクスピア風台本を生成
3. **動画生成**: mulmocast-cliを使用してFFmpegベースの動画生成
4. **ストレージ**: Supabase Storageに動画をアップロード
5. **データベース更新**: videosテーブルのステータスとメタデータを更新

### Docker構成の特徴

- **Node.js 18 Alpine**: 軽量ベースイメージ
- **mulmocast-cli**: GitHubからクローンして完全セットアップ
- **FFmpeg**: 動画処理ライブラリ
- **Canvas dependencies**: 画像生成に必要なライブラリ
- **Fonts**: 日本語フォントサポート

## 監視とログ

### ログの確認
```bash
# リアルタイムログ
gcloud run services logs tail showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=showgeki2 \
  --follow

# 過去のログ
gcloud run services logs read showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=showgeki2 \
  --limit=50
```

### サービスの状態確認
```bash
gcloud run services describe showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=showgeki2
```

### 非侵襲的状態チェック
```bash
./check-cloudrun-status.sh
```

## テスト手順

### 基本動作テスト

```bash
# ハイブリッドテスト（ローカルAPI + 本番Webhook）
node scripts/test-cloud-run.js
```

このテストスクリプトは以下を検証します：
1. ワークスペース作成（ローカルAPI）
2. ストーリー作成（ローカルAPI）
3. スクリプト生成（ローカルAPI + OpenAI）
4. 動画生成（本番Cloud Run Webhook）
5. 動画完了待機とURL検証

### 個別エンドポイントテスト

```bash
# ヘルスチェック
curl https://showgeki2-auto-process-598866385095.asia-northeast1.run.app/health

# Webhook動作テスト
curl -X POST "https://showgeki2-auto-process-598866385095.asia-northeast1.run.app/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "video_generation",
    "payload": {
      "video_id": "test-video-id",
      "story_id": "test-story-id", 
      "uid": "test-uid",
      "title": "テスト動画",
      "text_raw": "テスト用のストーリーです。"
    }
  }'
```

### ログ監視でのテスト

```bash
# リアルタイムでログを確認しながらテスト実行
gcloud run services logs tail showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=showgeki2 \
  --follow &

# 別ターミナルでテスト実行
node scripts/test-cloud-run.js
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
gcloud services enable secretmanager.googleapis.com --project=showgeki2
```

#### 3. 権限エラー
```bash
# YOUR_PROJECT_NUMBERは実際のプロジェクト番号に置き換えてください
# プロジェクト番号の確認: gcloud projects describe showgeki2 --format="value(projectNumber)"
gcloud projects add-iam-policy-binding showgeki2 \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 実装固有のトラブルシューティング

#### 1. OpenAI o4-mini モデルエラー
```bash
# ログで確認
gcloud run services logs read showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=showgeki2 \
  --filter="OpenAI"

# o4-miniモデルが利用できない場合はgpt-4o-miniに変更
# しかし現在o4-miniが最新モデルなので変更不要
```

#### 2. mulmocast-cli実行エラー
```bash
# コンテナ内でmulmocast-cliのセットアップ確認
gcloud run services logs read showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=showgeki2 \
  --filter="mulmocast-cli"

# FFmpegの動作確認ログ
gcloud run services logs read showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=showgeki2 \
  --filter="ffmpeg"
```

#### 3. 新しいスキーマ関連エラー
```bash
# データベーステーブル構造確認
# workspaces, stories, videos テーブルが正しく作成されているか
# UIDベースの認証が機能しているか

# Supabase側のログも確認推奨
```

#### 4. 動画生成タイムアウト
- デフォルト3600秒（1時間）設定済み
- mulmocast-cliの処理時間は通常5-15分
- 必要に応じてclouddeploy.yamlのタイムアウトを延長

### デバッグ用コマンド

```bash
# ヘルスチェック
curl https://showgeki2-auto-process-598866385095.asia-northeast1.run.app/health

# サービス詳細
gcloud run services describe showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=showgeki2

# 動画生成処理の詳細ログ
gcloud run services logs read showgeki2-auto-process \
  --region=asia-northeast1 \
  --project=showgeki2 \
  --filter="動画生成" \
  --limit=20
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
- UIDベースの認証によるデータ隔離
- Supabase Row Level Security (RLS) の活用推奨

## 実装ノート

### 現在の実装状況
- ✅ 新しいデータベーススキーマ（workspaces, stories, videos）
- ✅ OpenAI o4-miniモデル統合
- ✅ mulmocast-cli完全統合
- ✅ Supabase Storage自動アップロード
- ✅ ハイブリッドテスト環境（ローカル + Cloud Run）
- ✅ FFmpeg + Canvas依存関係完全対応

### 今後の改善点
- 🔄 Webhook認証機能の追加
- 🔄 バッチ処理による複数動画生成
- 🔄 動画品質設定のカスタマイズ
- 🔄 処理進捗の詳細レポート機能

---

**更新日**: 2024年12月
**対応バージョン**: showgeki2 v2.0（新スキーマ対応）
**検証済み環境**: Google Cloud Platform + Supabase + OpenAI o4-mini