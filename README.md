# Showgeki - ストーリー動画化サービス

ユーザーが入力したストーリーを動画化できるWebサービスです。

## 機能

### ユーザー向け機能
- **作成画面** (`/create`): ストーリーを入力して8桁の登録番号を取得
- **閲覧画面** (`/watch`): 登録番号で動画を視聴・ダウンロード

### オペレーター向け機能
- **管理画面**: 投稿されたストーリーの確認と完了フラグの管理（セキュアなURL）
- **動画アップロードスクリプト**: 作成した動画をアップロードするためのNode.jsスクリプト

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **ストレージ**: Supabase Storage
- **認証**: なし（匿名利用可能）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example`を参考に`.env.local`ファイルを作成してください。

```bash
cp .env.local.example .env.local
```

### 3. Supabaseの設定

1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. `src/lib/database.sql`のSQLを実行してテーブルとストレージを作成
3. 環境変数にSupabaseの設定を追加

### 4. 開発サーバーの起動

```bash
npm run dev
```

## データベース構造

### storiesテーブル
- `id`: VARCHAR(8) - 8桁のランダムな登録番号（主キー）
- `story_text`: TEXT - ストーリー内容
- `is_completed`: BOOLEAN - 動画完成フラグ
- `video_url`: TEXT - 動画のURL（完成後に設定）
- `created_at`: TIMESTAMP - 作成日時

### Supabase Storage
- バケット名: `videos`
- 動画ファイル名: `{登録番号}.mp4`

## オペレーター用の動画アップロード

動画を作成後、以下のスクリプトを使用してアップロードできます：

```bash
node scripts/upload-video.js <動画ファイルパス> <登録番号>
```

例：
```bash
node scripts/upload-video.js /path/to/video.mp4 ABC12345
```

## 自動処理スクリプト

### 単発処理モード
最も古い未完了の依頼を1件処理します：

```bash
node scripts/auto-process.js
```

### 自動監視モード
5秒間隔でデータベースを監視し、新しい依頼があれば自動処理します：

```bash
node scripts/auto-process.js --watch
# または
node scripts/auto-process.js -w
```

### 自動処理の流れ
1. 未完了の最も古い依頼を取得
2. OpenAI GPT-4 miniでシェイクスピア風5幕劇のスクリプトを生成
3. mulmocast-cliで動画を生成
4. 動画をSupabaseにアップロードして完了フラグを設定

### 監視モードの特徴
- 5秒間隔での自動監視
- 1件ずつ順次処理（並列処理なし）
- エラー時も監視継続
- Ctrl+Cで安全終了
- 処理統計の表示

### 必要な環境変数（スクリプト用）
- `SUPABASE_URL`: SupabaseプロジェクトのURL
- `SUPABASE_SERVICE_KEY`: Supabaseのサービスキー
- `OPENAI_API_KEY`: OpenAI APIキー（自動処理用）

## API エンドポイント

### ユーザー向け
- `POST /api/stories` - ストーリーの投稿
- `GET /api/stories/[id]` - 特定のストーリーと動画の取得

### 管理者向け
- `GET /api/admin/stories` - 全ストーリーの一覧取得
- `POST /api/admin/stories/[id]/complete` - ストーリーの完了フラグ設定

## フォルダ構成

```
src/
├── app/
│   ├── page.tsx              # ホーム画面
│   ├── create/
│   │   └── page.tsx          # ストーリー作成画面
│   ├── watch/
│   │   └── page.tsx          # 動画視聴画面
│   ├── [管理画面]/
│   │   └── page.tsx          # オペレーター管理画面
│   └── api/
│       ├── stories/          # ストーリー関連API
│       └── admin/            # 管理者用API
├── lib/
│   ├── supabase.ts           # Supabase設定
│   └── database.sql          # データベーススキーマ
└── scripts/
    ├── upload-video.js       # 動画アップロードスクリプト
    └── auto-process.js       # 自動処理スクリプト
```

## ワークフロー

### 手動処理
1. ユーザーがストーリーを作成画面で入力
2. システムが8桁の登録番号を生成してDBに保存
3. オペレーターが管理画面でストーリーを確認
4. オペレーターが動画を作成
5. 動画アップロードスクリプトで動画をアップロード
6. ユーザーが登録番号で動画を視聴・ダウンロード

### 自動処理
1. ユーザーがストーリーを作成画面で入力
2. システムが8桁の登録番号を生成してDBに保存
3. 自動処理スクリプト (`auto-process.js`) を実行
4. AIが5幕劇のスクリプトを生成し、自動で動画を作成・アップロード
5. ユーザーが登録番号で動画を視聴・ダウンロード
