# 顔検出機能セットアップガイド

## 概要

このガイドでは、Google Cloud Vision APIを使用した顔検出機能のセットアップ手順を説明します。

## 前提条件

- Google Cloudアカウント
- Node.js 18以上
- Supabaseプロジェクト

## セットアップ手順

### 1. Google Cloud Projectの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成、または既存のプロジェクトを選択
3. プロジェクトIDをメモしておく

### 2. Vision APIの有効化

1. [Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)ページにアクセス
2. 「有効にする」ボタンをクリック
3. APIが有効になるまで待つ（数秒〜1分程度）

### 3. サービスアカウントの作成

1. [サービスアカウント](https://console.cloud.google.com/iam-admin/serviceaccounts)ページにアクセス
2. 「サービスアカウントを作成」をクリック
3. 以下の情報を入力：
   - **サービスアカウント名**: showgeki2-vision
   - **サービスアカウントID**: 自動生成されたものを使用
   - **説明**: Showgeki2 Vision API用サービスアカウント
4. 「作成して続行」をクリック
5. ロールの選択で「Cloud Vision API ユーザー」を選択
6. 「続行」→「完了」をクリック

### 4. 認証キーの作成

1. 作成したサービスアカウントをクリック
2. 「キー」タブを選択
3. 「鍵を追加」→「新しい鍵を作成」をクリック
4. キーのタイプで「JSON」を選択
5. 「作成」をクリック（JSONファイルがダウンロードされる）

### 5. 環境変数の設定

ダウンロードしたJSONファイルを開き、以下の情報を`.env.local`に追加：

```env
# GCP Vision API設定
GCP_PROJECT_ID=your-project-id
GCP_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n実際の秘密鍵\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_ENABLE_FACE_DETECTION=true
```

**重要な注意事項:**
- `GCP_PRIVATE_KEY`の値は必ずダブルクォートで囲む
- 改行文字（\n）はそのまま残す
- 秘密鍵の前後の改行も含める

### 6. パッケージのインストール

```bash
npm install @google-cloud/vision sharp
```

### 7. データベースマイグレーション

Supabase Dashboardで以下のSQLを実行：

```sql
-- migrations/004_add_face_detection_tables.sql の内容を実行
```

### 8. 動作確認

1. 開発サーバーを起動
   ```bash
   npm run dev
   ```

2. インスタントモード作成画面（`/instant/create`）にアクセス

3. 画像をアップロード後、「顔を検出してキャラクターを作成」ボタンが表示されることを確認

## トラブルシューティング

### エラー: "GCP credentials not found"

**原因**: 環境変数が正しく設定されていない

**解決方法**:
1. `.env.local`ファイルが存在することを確認
2. 環境変数名が正確であることを確認
3. サーバーを再起動

### エラー: "Failed to initialize Vision API client"

**原因**: 認証情報が無効

**解決方法**:
1. サービスアカウントのメールアドレスが正しいか確認
2. 秘密鍵が完全にコピーされているか確認（特に改行文字）
3. プロジェクトIDが正しいか確認

### エラー: "API quota exceeded"

**原因**: Vision APIの無料枠を超過

**解決方法**:
1. [割り当て](https://console.cloud.google.com/apis/api/vision.googleapis.com/quotas)ページで使用状況を確認
2. 必要に応じて有料プランにアップグレード

### 顔が検出されない

**原因**: 画像の品質や顔の向き

**解決方法**:
1. より高解像度の画像を使用
2. 顔が正面を向いている画像を使用
3. 明るい場所で撮影された画像を使用

## 料金について

Google Cloud Vision APIの料金体系：

- **無料枠**: 月間1,000ユニットまで無料
- **有料**: 1,000ユニットごとに$1.50

1つの顔検出リクエスト = 1ユニット

詳細は[Vision API料金ページ](https://cloud.google.com/vision/pricing)を参照してください。

## セキュリティのベストプラクティス

1. **秘密鍵の管理**
   - `.env.local`ファイルは絶対にGitにコミットしない
   - 本番環境では環境変数を安全に管理（Vercelの環境変数機能など）

2. **アクセス制限**
   - サービスアカウントには最小限の権限のみ付与
   - 本番環境ではIPアドレス制限を検討

3. **使用量の監視**
   - Google Cloudの予算アラートを設定
   - 異常な使用量を検知できるようにする

## 次のステップ

- [顔検出API仕様](./face-detection-api.md)を確認
- カスタマイズ方法について学ぶ
- 本番環境へのデプロイ準備