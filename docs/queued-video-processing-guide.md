# Queuedビデオ処理ガイド

## 概要

何らかの理由でWebhookが送信されなかったり、処理が開始されなかった`queued`ステータスのビデオを手動で処理するためのスクリプト群の使用方法を説明します。

## スクリプト一覧

### 1. find-queued-videos.js
queuedステータスのビデオを検索し、状況を確認します。

### 2. process-queued-video.js
指定したビデオIDの処理を手動で開始します。

## 使用方法

### 1. Queuedビデオの検索

```bash
# 基本的な使用方法（過去7日間のqueuedビデオ）
node scripts/find-queued-videos.js

# 過去30日間を検索
node scripts/find-queued-videos.js --days 30

# 表示件数を増やす（デフォルト: 20件）
node scripts/find-queued-videos.js --limit 50

# 全てのステータスを表示（queued以外も含む）
node scripts/find-queued-videos.js --all

# 組み合わせて使用
node scripts/find-queued-videos.js --days 30 --limit 100 --all
```

#### 出力例
```
🔍 ビデオを検索中...
  期間: 過去7日間
  表示上限: 20件
  フィルター: queuedのみ

📊 3件のビデオが見つかりました:

⏳ Queuedビデオ:
────────────────────────────────────────────────────────────────────────────────
ID: 123e4567-e89b-12d3-a456-426614174000
  タイトル: 未来への扉
  作成日時: 2025/1/15 10:30:00
  最終更新: 2025/1/15 10:30:00
  待機時間: 2時間
  UID: user123
  処理コマンド: node scripts/process-queued-video.js 123e4567-e89b-12d3-a456-426614174000
────────────────────────────────────────────────────────────────────────────────

📊 サマリー:
  Queued: 3件
  Processing: 0件
  Failed: 0件
  Completed: 10件
  合計: 13件

💡 queuedビデオを処理するには:
  個別処理: node scripts/process-queued-video.js <video_id>
  一括処理スクリプト例:
  #!/bin/bash
  node scripts/process-queued-video.js 123e4567-e89b-12d3-a456-426614174000
  node scripts/process-queued-video.js 234f5678-f89c-23e4-b567-537625285001
  node scripts/process-queued-video.js 345g6789-g90d-34f5-c678-648736396002
```

### 2. Queuedビデオの処理

```bash
# 基本的な使用方法（デフォルト: ローカルWebhook）
node scripts/process-queued-video.js <video_id>

# ドライラン（実行せずに確認のみ）
node scripts/process-queued-video.js <video_id> --dry-run

# Webhook宛先を指定
node scripts/process-queued-video.js <video_id> --webhook production
node scripts/process-queued-video.js <video_id> --webhook debug
node scripts/process-queued-video.js <video_id> --webhook local

# 利用可能なWebhook宛先を表示
node scripts/process-queued-video.js --list-webhooks

# Webhook URL設定の確認
node scripts/process-queued-video.js --check-webhook-url
```

#### Webhook宛先
- **local** (デフォルト): `http://localhost:8080/webhook`
- **production**: `https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/webhook`
- **debug**: `https://showgeki2-auto-process-debug-mqku5oexhq-an.a.run.app/webhook`

#### 実行例
```bash
node scripts/process-queued-video.js 123e4567-e89b-12d3-a456-426614174000
```

#### 出力例
```
📹 queuedビデオの処理を開始します...
  ビデオID: 123e4567-e89b-12d3-a456-426614174000
  モード: 実行

📊 ビデオ情報:
  ステータス: queued
  作成日時: 2025-01-15T01:30:00.000Z
  UID: user123
  ストーリーID: abc123-def456-ghi789
  タイトル: 未来への扉

🔍 関連するワークフローを検索中...
  ワークフローID: workflow-123-456-789
  ワークフローステータス: completed

📡 generate-script APIを呼び出し中...

✅ API呼び出し成功!
  実行時間: 0.5秒
  レスポンス: {
    "success": true,
    "storyboardId": "abc123-def456-ghi789",
    "videoId": "123e4567-e89b-12d3-a456-426614174000"
  }

⏳ 処理状況を確認中...

📊 処理後のステータス:
  ステータス: processing

🎉 処理が完了しました
```

## 処理の仕組み

### 1. APIエンドポイント経由の処理（推奨）

スクリプトは以下の順序で処理を試みます：

1. **ワークフロー検索**
   - ビデオの`story_id`から関連する完了済みワークフローを検索
   - 見つかった場合は`/api/workflow/[workflow_id]/generate-script` APIを呼び出し

2. **直接Webhook送信（フォールバック）**
   - ワークフローが見つからない場合
   - `CLOUD_RUN_WEBHOOK_URL`または`WEBHOOK_URL`環境変数を使用
   - 必要なペイロードを構築して直接送信

### 2. ペイロード構造

Webhookに送信されるペイロード：

```json
{
  "type": "video_generation",
  "payload": {
    "video_id": "ビデオID",
    "story_id": "ストーリーボードID",
    "uid": "ユーザーID",
    "title": "作品タイトル",
    "text_raw": "作品の説明文",
    "script_json": {
      // MulmoScriptオブジェクト
    }
  }
}
```

## 一括処理の例

複数のqueuedビデオを処理する場合：

```bash
#!/bin/bash
# batch-process-queued-videos.sh

# queuedビデオのリストを取得して処理
VIDEO_IDS=(
  "123e4567-e89b-12d3-a456-426614174000"
  "234f5678-f89c-23e4-b567-537625285001"
  "345g6789-g90d-34f5-c678-648736396002"
)

for VIDEO_ID in "${VIDEO_IDS[@]}"; do
  echo "処理中: $VIDEO_ID"
  node scripts/process-queued-video.js "$VIDEO_ID"
  
  # 次の処理まで5秒待機（API負荷軽減）
  sleep 5
done
```

## トラブルシューティング

### Q: 「MulmoScriptが見つかりません」エラー

A: ストーリーボードにMulmoScriptが生成されていません。以下を確認：
- ワークフローが最後まで完了しているか
- ストーリーボードのステータスが`completed`か

### Q: 「ワークフローが見つかりません」警告

A: これは正常な動作です。スクリプトは自動的に直接Webhook送信に切り替えます。

### Q: 処理後もステータスが`queued`のまま

A: 以下の可能性があります：
- Cloud Runサービスが停止している
- Webhook URLが正しく設定されていない
- 処理中にエラーが発生した

確認方法：
```bash
# Webhook URL設定を確認
node scripts/process-queued-video.js --check-webhook-url

# Cloud Runのログを確認
gcloud run logs read --service showgeki2-auto-process
```

### Q: 429エラー（レート制限）

A: OpenAI APIのレート制限に達しています：
- 処理間隔を長くする（sleep時間を増やす）
- 同時処理数を減らす

## 環境変数

必要な環境変数（`.env.local`）:

```bash
# Supabase設定（必須）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# API URL（ローカル開発時）
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Webhook URL（直接送信時に必要）
CLOUD_RUN_WEBHOOK_URL=https://your-cloud-run-url/webhook
# または
WEBHOOK_URL=https://your-cloud-run-url/webhook
```

## 注意事項

1. **処理の重複**
   - 同じビデオを複数回処理しても問題ありませんが、無駄なリソース消費になります
   - 処理前にステータスを確認してください

2. **権限**
   - `SUPABASE_SERVICE_KEY`が必要です（管理者権限）
   - 通常のユーザーキーでは動作しません

3. **処理時間**
   - ビデオ生成には2-5分かかります
   - ステータスが`processing`に変わった後も完了まで時間がかかります

## 関連ファイル

- `/scripts/find-queued-videos.js` - queuedビデオ検索
- `/scripts/process-queued-video.js` - queuedビデオ処理
- `/src/app/api/workflow/[workflow_id]/generate-script/route.ts` - 動画生成API
- `/cloud-run/webhook-handler.js` - Cloud Run Webhookハンドラー

## よくある使用シナリオ

### シナリオ1: 定期的なチェックと処理

```bash
# 毎朝queuedビデオをチェックして処理
# crontabに追加: 0 9 * * * /path/to/check-queued-videos.sh

#!/bin/bash
cd /path/to/showgeki2
node scripts/find-queued-videos.js | grep "ID:" | awk '{print $2}' | while read VIDEO_ID; do
  node scripts/process-queued-video.js "$VIDEO_ID"
  sleep 10
done
```

### シナリオ2: 特定ユーザーのビデオのみ処理

```bash
# 特定ユーザーのqueuedビデオを検索
node scripts/find-queued-videos.js | grep -B3 -A3 "UID: user123"

# 見つかったビデオIDを処理
node scripts/process-queued-video.js <found_video_id>
```

### シナリオ3: エラー後の再処理

```bash
# failedステータスも含めて表示
node scripts/find-queued-videos.js --all

# failedビデオをqueuedに戻してから処理
# （別途データベース更新が必要）
```