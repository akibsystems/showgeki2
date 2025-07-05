# Supabase認証マイグレーションガイド

## 概要
ShowGeki2にSupabase認証を導入するためのデータベースマイグレーションガイドです。

## 重要な注意事項
- `stories`, `videos`, `workspaces`テーブルは既に`uid`カラムを持っています
- `reviews`テーブルには`uid`カラムがありません
- RLSは有効にしますが、実際のアクセス制御はサーバー側APIで行います

## マイグレーション手順

### 1. Supabase Dashboardにログイン
[Supabase Dashboard](https://app.supabase.com)にアクセスし、ShowGeki2プロジェクトを選択。

### 2. SQL Editorを開く
左側メニューから「SQL Editor」を選択。

### 3. RLSの有効化（シンプル版）

以下のSQLを実行してください：

```sql
-- ================================================================
-- Migration: Enable RLS (Minimal Setup)
-- Date: 2025-01-01
-- Description: Enable RLS for security, but actual access control is done in API
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role
-- These policies allow the service role (API) to access all data
-- Actual access control is implemented in the API layer

-- Workspaces - Allow all operations for service role
DROP POLICY IF EXISTS "Service role has full access to workspaces" ON workspaces;
CREATE POLICY "Service role has full access to workspaces" 
ON workspaces FOR ALL 
USING (true)
WITH CHECK (true);

-- Stories - Allow all operations for service role
DROP POLICY IF EXISTS "Service role has full access to stories" ON stories;
CREATE POLICY "Service role has full access to stories" 
ON stories FOR ALL 
USING (true)
WITH CHECK (true);

-- Videos - Allow all operations for service role
DROP POLICY IF EXISTS "Service role has full access to videos" ON videos;
CREATE POLICY "Service role has full access to videos" 
ON videos FOR ALL 
USING (true)
WITH CHECK (true);

-- Reviews - Allow all operations for service role
DROP POLICY IF EXISTS "Service role has full access to reviews" ON reviews;
CREATE POLICY "Service role has full access to reviews" 
ON reviews FOR ALL 
USING (true)
WITH CHECK (true);
```

### 4. 認証プロバイダーの設定

Supabase Dashboardで以下を設定：

1. **Authentication** → **Providers**に移動
2. **Email**を有効化（Magic Link用）
3. **Google**を有効化（OAuth認証用）
   - Google Cloud ConsoleでOAuth 2.0クライアントIDを作成
   - リダイレクトURIに`https://[PROJECT_ID].supabase.co/auth/v1/callback`を追加
   - クライアントIDとシークレットをSupabaseに設定

### 5. 環境変数の確認

`.env.local`に以下が設定されていることを確認：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

## マイグレーション後の確認

1. **データベース構造の確認**
   ```sql
   SELECT 
     table_name,
     column_name,
     data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' 
     AND column_name = 'user_id'
     AND table_name IN ('workspaces', 'stories', 'videos', 'reviews')
   ORDER BY table_name;
   ```

2. **RLSポリシーの確認**
   ```sql
   SELECT 
     schemaname,
     tablename,
     policyname,
     cmd
   FROM pg_policies
   WHERE schemaname = 'public' 
     AND tablename IN ('workspaces', 'stories', 'videos', 'reviews')
   ORDER BY tablename, policyname;
   ```

## トラブルシューティング

### エラー: "column workspaces.user_id does not exist"
→ マイグレーションが実行されていません。上記の手順3を実行してください。

### エラー: "permission denied for table workspaces"
→ RLSが有効になっているがポリシーが設定されていません。手順4を実行してください。

### ログインできない
→ Authentication → Providersで、EmailとGoogleが有効になっているか確認してください。

## 現在の実装について

- **アクセス制御**: サーバー側API（`withAuth`ミドルウェア）で実装
- **UID管理**: 既存の`uid`カラムをそのまま使用（Supabase認証のuser IDを`uid`として利用）
- **RLS**: セキュリティのために有効化するが、実際の制御はAPIで実施

## 完了チェックリスト

- [ ] RLS有効化（migration 003を実行）
- [ ] 認証プロバイダー有効化（Email、Google）
- [ ] 環境変数確認
- [ ] ログイン動作確認
- [ ] ワークスペース作成動作確認
- [ ] 既存データへのアクセス確認（既存の`uid`ベースのデータ）