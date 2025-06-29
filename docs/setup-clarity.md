# Microsoft Clarity セットアップ手順

Microsoft Clarityは、ユーザーの行動を可視化し、ウェブサイトのUX改善に役立つ無料の分析ツールです。

## セットアップ手順

### 1. Microsoft Clarityアカウントの作成

1. [Microsoft Clarity](https://clarity.microsoft.com/) にアクセス
2. Microsoftアカウントでサインイン（またはGoogleアカウントでサインイン）
3. 「新しいプロジェクト」をクリック

### 2. プロジェクトの設定

1. **プロジェクト名**: "TOBE ストーリー動画生成" または任意の名前
2. **ウェブサイトURL**: あなたのアプリケーションのURL（例：https://your-app.vercel.app）
3. **カテゴリ**: 「エンターテインメント」または「その他」を選択

### 3. Clarity Project IDの取得

プロジェクト作成後、設定画面で以下の情報が表示されます：
- **Project ID**: 英数字の文字列（例：`abcd1234ef`）

### 4. アプリケーションへの統合

`/src/app/layout.tsx` に既にClarityのトラッキングコードを追加済みです。

**YOUR_CLARITY_PROJECT_ID** を実際のProject IDに置き換えてください：

```tsx
// 変更前
})(window, document, "clarity", "script", "YOUR_CLARITY_PROJECT_ID");

// 変更後（例）
})(window, document, "clarity", "script", "abcd1234ef");
```

### 5. 環境変数での管理（推奨）

セキュリティとメンテナンス性のため、環境変数で管理することを推奨します：

1. `.env.local` に追加：
```
NEXT_PUBLIC_CLARITY_PROJECT_ID=your_project_id_here
```

2. `layout.tsx` を更新：
```tsx
})(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}");
```

### 6. デプロイと確認

1. 変更をコミットしてデプロイ
2. Microsoft Clarityダッシュボードで「インストールの確認」をクリック
3. データが収集され始めるまで数分待つ

## Clarityの主な機能

- **ヒートマップ**: クリックやタップの頻度を可視化
- **セッション録画**: ユーザーの実際の操作を録画して確認
- **ダッシュボード**: ユーザー行動の統計情報
- **フィルタリング**: デバイス、ブラウザ、ページ別の分析

## プライバシーとコンプライアンス

- Clarityは自動的に個人情報をマスキング
- GDPR、CCPA準拠
- IPアドレスは匿名化される

## トラブルシューティング

### データが表示されない場合

1. ブラウザの開発者ツールでエラーを確認
2. Project IDが正しいか確認
3. アドブロッカーを無効化して確認
4. Clarityダッシュボードで「サイトの確認」を実行

### パフォーマンスへの影響

- Clarityは非同期で読み込まれるため、サイトの読み込み速度に影響しない
- `strategy="afterInteractive"` により、ページの初期読み込み後に実行される