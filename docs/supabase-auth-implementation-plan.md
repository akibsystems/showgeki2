# Supabase認証実装計画

## 概要
ShowGeki2にSupabase認証を導入し、Magic LinkとGoogle認証に対応。`setSession()`を活用したモバイル向けのセッション管理も実装。

## 実装チェックリスト

### 1. 環境設定 
- [ ] Supabase Dashboardで認証プロバイダーを有効化
  - [ ] Email（Magic Link）を有効化
  - [ ] Googleプロバイダーを有効化し、OAuth認証情報を設定
- [ ] 環境変数の追加
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`（既存）
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`（既存）
  - [ ] リダイレクトURLの設定確認

### 2. 依存関係のインストール
- [ ] `@supabase/ssr`のインストール（最新の推奨パッケージ）
- [ ] `@supabase/supabase-js`の更新（必要に応じて）

### 3. 認証基盤の実装
- [ ] `/src/lib/supabase/client.ts`にブラウザ用クライアントを作成（@supabase/ssr使用）
- [ ] `/src/lib/supabase/server.ts`にサーバー用クライアントを作成（@supabase/ssr使用）
- [ ] `/src/lib/supabase/middleware.ts`に認証ミドルウェアを実装
- [ ] `middleware.ts`でセッション管理を設定
- [ ] セッション復元用のユーティリティ関数を実装（`setSession()`活用）

### 4. 認証コンポーネントの作成（既存デザインに統合）
- [ ] `/src/components/auth/AuthForm.tsx`を作成
  - [ ] Magic Link入力フォーム（既存のフォームスタイルを踏襲）
  - [ ] Googleログインボタン（既存のボタンスタイルを使用）
  - [ ] エラーハンドリング（既存のアラートスタイルを使用）
  - [ ] ローディング状態の表示
- [ ] `/src/components/auth/UserMenu.tsx`を作成
  - [ ] ログイン状態の表示（ヘッダーに統合）
  - [ ] ログアウトボタン
  - [ ] ユーザー情報表示（アバターアイコン）

### 5. 認証ページの実装
- [ ] `/src/app/auth/login/page.tsx`を作成
  - [ ] AuthFormコンポーネントの配置
  - [ ] リダイレクト処理
- [ ] `/src/app/auth/callback/route.ts`を作成
  - [ ] 認証コールバック処理
  - [ ] セッションの確立

### 6. セッション管理の実装（setSession活用）
- [ ] `/src/components/auth/SessionProvider.tsx`を作成
  - [ ] クライアントサイドのセッション管理
  - [ ] 自動更新機能（refreshSession）
  - [ ] セッション復元機能（`setSession()`で手動復元）
  - [ ] セッショントークンのLocalStorage保存
- [ ] `/src/hooks/useAuth.ts`を作成
  - [ ] 認証状態のフック
  - [ ] ユーザー情報の取得
  - [ ] ログイン/ログアウト関数
  - [ ] セッション復元関数

### 7. モバイル対応（どこで開いてもセッション復元）
- [ ] セッション永続化の実装
  - [ ] アクセストークンとリフレッシュトークンのLocalStorage保存
  - [ ] アプリ起動時の`setSession()`による自動復元
  - [ ] QRコードやディープリンクでのセッション共有（オプション）
- [ ] リフレッシュトークンの管理
  - [ ] 自動更新の実装
  - [ ] エラー時の再認証フロー
  - [ ] トークン有効期限の監視
- [ ] クロスデバイス対応
  - [ ] セッショントークンの安全な共有方法
  - [ ] デバイス間でのシームレスな認証

### 8. 既存機能との統合
- [ ] ストーリー作成時のユーザー紐付け
  - [ ] `stories`テーブルに`user_id`カラムを追加
  - [ ] RLSポリシーの設定
- [ ] 管理画面のアクセス制御
  - [ ] 管理者権限の実装
  - [ ] ロールベースアクセス制御
- [ ] ユーザーダッシュボードの作成
  - [ ] 自分のストーリー一覧
  - [ ] プロフィール編集

### 9. セキュリティ対策
- [ ] CSRFトークンの実装
- [ ] セッションタイムアウトの設定
- [ ] 不正アクセス対策
  - [ ] レート制限
  - [ ] ブルートフォース対策
- [ ] セキュアなクッキー設定

### 10. テストの実装
- [ ] 認証フローのE2Eテスト
  - [ ] Magic Linkログインテスト
  - [ ] Googleログインテスト
  - [ ] ログアウトテスト
- [ ] セッション管理のユニットテスト
  - [ ] セッション復元テスト
  - [ ] リフレッシュトークンテスト
- [ ] モバイル環境でのテスト

### 11. ドキュメントの更新
- [ ] CLAUDE.mdに認証関連の情報を追加
- [ ] 環境変数の説明を更新
- [ ] 認証フローの図解を作成
- [ ] トラブルシューティングガイド

## 実装の優先順位

1. **Phase 1: 基本認証（1-2日）**
   - 環境設定
   - 認証基盤の実装
   - 基本的な認証コンポーネント

2. **Phase 2: UI/UXの実装（1-2日）**
   - 認証ページの作成
   - ユーザーメニューの実装
   - エラーハンドリング

3. **Phase 3: セッション管理（1-2日）**
   - SessionProviderの実装
   - モバイル向けセッション永続化
   - リフレッシュトークン管理

4. **Phase 4: 統合とセキュリティ（2-3日）**
   - 既存機能との統合
   - セキュリティ対策
   - テストの実装

## 技術的な考慮事項

### セッション管理の方針
- サーバーサイド: `@supabase/ssr`を使用してクッキーベースのセッション管理
- クライアントサイド: `setSession()`を使用した手動セッション管理
- モバイル: LocalStorageにトークンを保存し、`setSession()`で復元
- クロスデバイス: セッショントークンを安全に共有し、どこからでもアクセス可能に

### UIデザインの統合
- 既存のShowGeki2のデザインシステムを踏襲
- カラーパレット、フォント、スペーシングを統一
- 既存のコンポーネント（ボタン、フォーム、アラート）を再利用
- モバイルファーストでレスポンシブ対応

### エラーハンドリング
- ネットワークエラー時の再試行
- セッション期限切れ時の自動再認証
- ユーザーフレンドリーなエラーメッセージ

### パフォーマンス最適化
- 認証状態のキャッシング
- 不要な認証チェックの削減
- レイジーローディングの活用

## 実装例

### setSession()を使用したセッション復元
```typescript
// セッションの保存
const saveSession = async (session: Session) => {
  localStorage.setItem('supabase.auth.token', JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at
  }));
};

// セッションの復元
const restoreSession = async (supabase: SupabaseClient) => {
  const stored = localStorage.getItem('supabase.auth.token');
  if (stored) {
    const { access_token, refresh_token } = JSON.parse(stored);
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });
    if (!error) {
      // セッション復元成功
    }
  }
};
```

## 参考リソース
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Supabase Auth setSession](https://supabase.com/docs/reference/javascript/auth-setsession)
- [Session Management Best Practices](https://supabase.com/docs/guides/auth/sessions)