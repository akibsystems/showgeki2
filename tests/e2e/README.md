# E2E Tests for Instant Mode

インスタントモードの一気通貫E2Eテストの実行方法

## 概要

このE2Eテストは以下の完全なワークフローをテストします：

1. **ユーザー認証**: テストユーザーの作成・ログイン
2. **ストーリー作成**: `/api/instant/create` でのインスタントモード開始
3. **状態監視**: `/api/instant/[id]/status` での進捗追跡
4. **動画生成完了**: 実際の動画ファイル生成まで
5. **データベース確認**: 関連レコードの整合性確認

## 実行方法

### 前提条件

1. **Next.js開発サーバーが起動していること**:
   ```bash
   npm run dev
   ```

2. **環境変数が設定されていること**（`.env.local`）:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   OPENAI_API_KEY=your_openai_key
   ```

3. **データベースが正常に動作していること**

### テスト実行

```bash
# インスタントモードE2Eテストを実行
npm run test:instant-e2e
```

### 環境別実行

```bash
# 本番環境でテスト
TEST_BASE_URL=https://your-production-url.com npm run test:instant-e2e

# ローカル環境でテスト（デフォルト）
npm run test:instant-e2e
```

## テスト内容

### 1. Complete Workflow Test
- **所要時間**: 最大6分（動画生成含む）
- **テスト内容**:
  - ユーザー認証
  - ストーリー作成API呼び出し
  - 状態監視（5秒間隔でポーリング）
  - 動画生成完了まで待機
  - データベース整合性確認

### 2. Error Handling Tests
- **存在しないID**: 404エラーの確認
- **認証なし**: 401エラーの確認
- **入力検証**: 400エラーの確認

## ログ出力例

```
✅ Test user authenticated: 12345678-1234-5678-9012-123456789abc
✅ Instant generation created: instant-abc123
📊 Status: processing, Step: analyzing, Progress: 10%
📊 Status: processing, Step: script, Progress: 40%
📊 Status: processing, Step: voices, Progress: 70%
📊 Status: processing, Step: generating, Progress: 90%
✅ Video generation completed: video-def456
✅ Video record verified: { id: 'video-def456', status: 'completed', url: 'https://...' }
✅ Instant generation record verified: { id: 'instant-abc123', status: 'completed' }
```

## トラブルシューティング

### 1. タイムアウトエラー
```
Test timed out in 360000ms
```
- 動画生成に時間がかかっている可能性があります
- OpenAI APIの状況を確認してください
- ネットワーク接続を確認してください

### 2. 認証エラー
```
Failed to create test user: ...
```
- Supabaseの設定を確認してください
- 認証設定が有効になっているか確認してください

### 3. 動画生成エラー
```
Instant generation failed: ...
```
- OpenAI API keyが正しく設定されているか確認
- mulmocast-cliが正常に動作しているか確認
- ログでエラー詳細を確認

## 注意事項

- テストは実際のリソース（OpenAI API、データベース）を使用します
- API使用料金が発生する可能性があります
- テストユーザーとデータは自動でクリーンアップされます
- 並行実行は避けて、1つずつ実行してください