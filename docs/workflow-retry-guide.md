# インスタントモードワークフロー再実行ガイド

## 概要

インスタントモードで作成されたワークフローが途中でエラー停止した場合に、再実行するためのスクリプト群の使用方法を説明します。

## スクリプト一覧

### 1. find-stuck-workflows.js
中断されたインスタントモードのワークフローを検索します。

### 2. retry-instant-workflow.js
個別のワークフローを再実行します。

### 3. batch-retry-workflows.js
複数のワークフローを一括で再実行します。

## 使用方法

### 1. 中断されたワークフローの検索

```bash
# 基本的な使用方法（過去7日間）
node scripts/find-stuck-workflows.js

# 過去30日間を検索
node scripts/find-stuck-workflows.js --days 30

# 表示件数を増やす（デフォルト: 20件）
node scripts/find-stuck-workflows.js --limit 50

# 組み合わせて使用
node scripts/find-stuck-workflows.js --days 30 --limit 100
```

#### 出力例
```
🔍 中断されたインスタントモードのワークフローを検索中...
  期間: 過去7日間
  表示上限: 20件

📊 3件の中断されたワークフローが見つかりました:

🚀 インスタントモードのワークフロー:
────────────────────────────────────────────────────────────────────────────────
ID: 123e4567-e89b-12d3-a456-426614174000
  タイトル: 未来への扉
  現在のステップ: 3/7
  作成日時: 2025/1/15 10:30:00
  最終更新: 2025/1/15 10:35:00 (2時間前)
  UID: user123
  ストーリー: 私は将来、AIエンジニアになりたいです...
  再実行: node scripts/retry-instant-workflow.js 123e4567-e89b-12d3-a456-426614174000
────────────────────────────────────────────────────────────────────────────────

📊 サマリー:
  インスタントモード: 3件
  通常モード: 0件
  合計: 3件
```

### 2. 個別ワークフローの再実行

```bash
# 基本的な使用方法
node scripts/retry-instant-workflow.js <workflow_id>

# ドライラン（実行せずに状態確認のみ）
node scripts/retry-instant-workflow.js <workflow_id> --dry-run

# 特定のステップから再開
node scripts/retry-instant-workflow.js <workflow_id> --from-step 4

# Webhook宛先を指定
node scripts/retry-instant-workflow.js <workflow_id> --webhook production
node scripts/retry-instant-workflow.js <workflow_id> --webhook debug
node scripts/retry-instant-workflow.js <workflow_id> --webhook local

# 利用可能なWebhook宛先を表示
node scripts/retry-instant-workflow.js --list-webhooks

# オプションの組み合わせ
node scripts/retry-instant-workflow.js <workflow_id> --from-step 3 --webhook production
```

#### Webhook宛先
- **local** (デフォルト): `http://localhost:8080/webhook`
- **production**: `https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/webhook`
- **debug**: `https://showgeki2-auto-process-debug-mqku5oexhq-an.a.run.app/webhook`

#### 実行例
```bash
node scripts/retry-instant-workflow.js 123e4567-e89b-12d3-a456-426614174000
```

#### 出力例
```
🚀 ワークフロー再実行を開始します...
  ワークフローID: 123e4567-e89b-12d3-a456-426614174000
  開始ステップ: 1
  モード: 実行

📊 現在の状態:
  ステータス: active
  現在のステップ: 3
  作成日時: 2025-01-15T01:30:00.000Z
  UID: user123

📝 Step 1 を実行中...
  ✅ Step 1 入力データ取得完了
  ✅ Step 1 完了
  ⏱️  実行時間: 2.3秒

📝 Step 2 を実行中...
  ✅ Step 2 入力データ取得完了
  ✅ Step 2 完了
  ⏱️  実行時間: 15.7秒

[...各ステップの実行ログ...]

🎬 動画生成を開始...
  ✅ 動画生成開始: { success: true, videoId: 'abc123' }

✅ ワークフロー完了！

⏱️  合計実行時間: 125.4秒 (2分5秒)

📊 最終状態:
  ステータス: completed
  現在のステップ: 7
  動画URL: https://storage.supabase.co/...
  動画ステータス: processing
```

### 3. 複数ワークフローの一括再実行

```bash
# 自動検索して全て再実行
node scripts/batch-retry-workflows.js

# 特定のワークフローIDを指定
node scripts/batch-retry-workflows.js id1 id2 id3

# オプション
node scripts/batch-retry-workflows.js --concurrent 3    # 同時実行数（1-5）
node scripts/batch-retry-workflows.js --days 30        # 検索期間
node scripts/batch-retry-workflows.js --dry-run        # ドライラン
```

#### 実行例
```bash
# 過去30日間の中断されたワークフローを3つずつ並列で再実行
node scripts/batch-retry-workflows.js --days 30 --concurrent 3
```

#### 出力例
```
🔍 中断されたインスタントモードワークフローを検索中...

📊 10件の中断されたワークフローが見つかりました:
  - 123e4567-e89b-12d3-a456-426614174000 (未来への扉)
  - 234f5678-f89c-23e4-b567-537625285001 (私の夢)
  [...その他のワークフロー...]

⚠️  これらのワークフローを再実行しますか？
  Enterキーで続行、Ctrl+Cでキャンセル

🚀 10件のワークフローを再実行します
  同時実行数: 3

📦 バッチ 1/4 を処理中...
  ⏳ 次のバッチまで5秒待機...

📦 バッチ 2/4 を処理中...
  [処理ログ]

📊 実行結果:
  ✅ 成功: 9件
  ❌ 失敗: 1件
  ⏱️  実行時間: 8分45秒

❌ 失敗したワークフロー:
  - 789a1234-b567-89cd-ef01-234567890123: 終了コード 1

✅ 成功したワークフロー:
  - 123e4567-e89b-12d3-a456-426614174000
  - 234f5678-f89c-23e4-b567-537625285001
  [...その他の成功したワークフロー...]
```

## 実行時の動作詳細

### ステップごとの処理内容

1. **Step 1**: ストーリー入力データの復元
   - 既存のstory_dataから必要な情報を抽出
   - デフォルト設定（style: shakespeare, language: ja）を適用

2. **Step 2**: タイトルと幕場構成
   - AIが生成した提案タイトルを使用
   - 既存のacts構成を復元

3. **Step 3**: キャラクター設定
   - キャラクター情報をデフォルト設定で復元
   - 画風設定（preset: anime）を適用

4. **Step 4**: 台本とシーン
   - 既存のシーン情報をそのまま使用
   - 画像プロンプトと台詞を復元

5. **Step 5**: 音声設定
   - 各キャラクターにデフォルト音声（alloy）を割り当て
   - 提案された音声があればそれを使用

6. **Step 6**: BGMと字幕設定
   - デフォルトBGMを設定
   - 字幕設定（enabled: true, language: ja）を適用

7. **Step 7**: 最終確認と動画生成
   - タイトルと説明を設定
   - 動画生成webhookをトリガー

### エラーハンドリング

- 各ステップでエラーが発生した場合、詳細なエラーメッセージを表示
- ネットワークエラーや429エラー（レート制限）を適切に処理
- 実行時間を各ステップと合計で記録

## よくある使用シナリオ

### シナリオ1: 定期的なメンテナンス

```bash
# 1. まず中断されたワークフローを確認
node scripts/find-stuck-workflows.js

# 2. 問題なければ一括再実行
node scripts/batch-retry-workflows.js
```

### シナリオ2: 特定ユーザーのワークフロー復旧

```bash
# 1. 特定ユーザーのワークフローを検索
node scripts/find-stuck-workflows.js | grep "user123"

# 2. 該当のワークフローを個別に再実行
node scripts/retry-instant-workflow.js <該当のworkflow_id>
```

### シナリオ3: 大量のワークフロー処理

```bash
# 過去30日間のワークフローを3つずつ並列処理
node scripts/batch-retry-workflows.js --days 30 --concurrent 3
```

## トラブルシューティング

### Q: 「ワークフローが見つかりません」エラー

A: 以下を確認してください：
- ワークフローIDが正しいか
- `.env.local`にSupabaseの認証情報が設定されているか
- 該当のワークフローが存在するか

### Q: 429エラー（レート制限）

A: OpenAI APIのレート制限に達しています：
- `--concurrent`を小さくして実行
- しばらく待ってから再実行

### Q: 動画生成が開始されない

A: 以下を確認してください：
- Cloud Run webhookが正しく設定されているか
- `CLOUD_RUN_WEBHOOK_URL`環境変数が設定されているか
- Cloud Runサービスが稼働しているか

### Q: Step7で404エラー

A: APIエンドポイントの問題です：
- スクリプトが最新版か確認
- `/api/workflow/${workflowId}/generate-script`エンドポイントが存在するか確認

## 注意事項

- 再実行時は全てのステップでデフォルト値を使用します
- ユーザーがカスタマイズした設定（音声、BGMなど）は失われる可能性があります
- 同じワークフローを何度も再実行しても問題ありません
- 動画生成は非同期で行われるため、完了まで時間がかかります

## 関連ファイル

- `/scripts/find-stuck-workflows.js` - 中断ワークフロー検索
- `/scripts/retry-instant-workflow.js` - 個別再実行
- `/scripts/batch-retry-workflows.js` - 一括再実行
- `/src/app/api/workflow/[workflow_id]/step/[step]/route.ts` - ステップAPI
- `/src/app/api/workflow/[workflow_id]/generate-script/route.ts` - 動画生成API