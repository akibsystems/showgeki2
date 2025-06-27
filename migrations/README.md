# Database Migrations

このディレクトリには、Supabaseデータベースのマイグレーションスクリプトが含まれています。

## ファイル命名規則

```
{番号}_{説明}.sql
```

例:
- `000_initial_schema_recreation.sql` (完全なDB再作成)
- `001_add_beats_column.sql` (beatsカラム追加)
- `002_add_user_preferences.sql`
- `003_update_video_schema.sql`

## マイグレーション実行手順

### 1. Supabase Dashboard での実行（推奨）

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. プロジェクトを選択
3. 左サイドバーの「SQL Editor」をクリック
4. 「New query」をクリック
5. マイグレーションファイルの内容をコピー&ペースト
6. 「Run」ボタンをクリックして実行

### 2. Supabase CLI での実行

```bash
# CLIがインストールされている場合
supabase db reset
# または
supabase db push
```

### 3. 直接SQL実行

```bash
# psqlを使用する場合（ローカル開発環境）
psql -h localhost -p 54322 -U postgres -d postgres -f migrations/001_add_beats_column.sql
```

## マイグレーション履歴

| 番号 | ファイル名 | 説明 | 実行日 | 実行者 |
|------|------------|------|--------|--------|
| 000 | `000_initial_schema_recreation.sql` | 完全なデータベーススキーマ再作成（beats含む） | - | システム |
| 001 | `001_add_beats_column.sql` | 既存DBにbeatsカラムを追加（増分更新） | 2024-12-26 | Claude |

## 注意事項

- **本番環境での実行前に必ずバックアップを取得してください**
- マイグレーションは番号順に実行してください
- 実行後は必ず動作確認を行ってください
- エラーが発生した場合は、ロールバック手順を確認してください

### ⚠️ 特別な注意事項

- **`000_initial_schema_recreation.sql`**: 全データを削除して再作成します。新規セットアップ時のみ使用してください。
- **`001_add_beats_column.sql`**: 既存データを保持しつつbeatsカラムを追加します。本番環境での増分更新に使用してください。

## ロールバック手順

各マイグレーションにはロールバック用のSQLも含まれている場合があります。
ロールバックが必要な場合は、逆順で実行してください。

## トラブルシューティング

### よくあるエラー

1. **カラムが既に存在する**
   ```
   ERROR: column "beats" of relation "stories" already exists
   ```
   → マイグレーションが既に実行済みです。スキップしてください。

2. **権限エラー**
   ```
   ERROR: permission denied for table stories
   ```
   → Service Role Keyを使用してください。

3. **制約違反**
   ```
   ERROR: check constraint "stories_beats_check" is violated
   ```
   → 既存データが制約に違反しています。データを確認してください。

## 開発者向け

新しいマイグレーションを作成する場合：

1. 次の番号を使用してファイルを作成
2. 説明的なファイル名を使用
3. コメントを充実させる
4. 可能であればロールバック用SQLも追加
5. このREADMEの履歴表を更新