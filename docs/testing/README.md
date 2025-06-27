# 🧪 Showgeki2 テストドキュメント

Showgeki2プロジェクトのテスト関連ドキュメントの統合ナビゲーションページです。

## 📚 ドキュメント一覧

### 🎯 実用ガイド

| ドキュメント | 用途 | 対象者 |
|------------|------|--------|
| **[ユーザーガイド](./user-guide.md)** | テスト実行方法・カバレッジ確認 | 全開発者 |
| **[技術フレームワーク](./framework.md)** | Vitest+Playwright 設定詳細 | テックリード・新メンバー |

### 📋 計画・チェックリスト

| ドキュメント | 用途 | 対象者 |
|------------|------|--------|
| **[改善計画書](./improvement-plan.md)** | 4週間の改善ロードマップ | プロジェクトマネージャー |
| **[実装チェックリスト](./implementation-checklist.md)** | 単体テスト段階的実装 | 開発者 |
| **[作業チェックリスト](./work-checklist.md)** | 具体的な作業手順 | 実装担当者 |

## 🚀 クイックスタート

### 初回セットアップ
```bash
# 依存関係インストール
npm install

# テスト実行
npm test

# カバレッジ確認
npm run test:coverage
```

### 日常的な使用
```bash
# 開発中（ウォッチモード）
npm test

# PR前確認
npm run test:coverage

# HTMLレポート表示
open coverage/index.html
```

## 📊 現在のステータス

### ✅ 完了済み（Phase 1: 基盤安定化）
- **uid.test.ts修正**: 63/63件テスト成功（カバレッジ96.62%）
- **Supabaseモック改善**: 統合テスト安定化
- **カバレッジレポート設定**: HTML/JSON/テキスト出力

### 🔄 進行中
- **stories.test.ts改善**: 新しいモックシステム統合完了
- **テストドキュメント整理**: 論理的構造への再編成完了

### 📈 次のステップ（Phase 2）
- **API統合テスト拡充**: 全エンドポイントカバー
- **コンポーネントテスト実装**: React Testing Library導入
- **E2Eテスト基盤**: Playwright セットアップ

## 🎯 品質目標

| メトリック | 現在値 | 目標値 |
|-----------|--------|--------|
| **ユニットテスト** | 95%+ | 90%+ |
| **統合テスト** | 開発中 | 80%+ |
| **E2Eテスト** | 未実装 | 60%+ |
| **全体カバレッジ** | 測定中 | 85%+ |

## 📞 サポート・貢献

### よくある質問
- **テストが失敗する**: [user-guide.md - デバッグセクション](./user-guide.md#デバッグとトラブルシューティング)を参照
- **新しいテスト追加**: [implementation-checklist.md](./implementation-checklist.md)の段階的ガイドに従う
- **設定変更**: [framework.md](./framework.md)で技術詳細を確認

### 改善提案
1. **Issue作成**: GitHub Issues でバグ報告・機能要望
2. **ドキュメント修正**: PR作成でドキュメント改善
3. **テスト追加**: [work-checklist.md](./work-checklist.md)に従って実装

## 🔗 関連リンク

### プロジェクト内
- [開発環境セットアップ](../local-development.md)
- [デプロイメントガイド](../deployment.md)
- [要件仕様書](../requirements/)

### 外部ドキュメント
- [Vitest公式ドキュメント](https://vitest.dev/)
- [Playwright公式ドキュメント](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/)

## 📁 ドキュメント構造

### v2.0での改善点
- **論理的グループ化**: テスト関連ドキュメントを専用ディレクトリに集約
- **明確な命名**: 用途に応じたファイル名に統一
- **ナビゲーション強化**: READMEを中心とした統合ナビゲーション
- **相互参照**: プロジェクト全体からの一貫したリンク構造

### アクセス方法
```
docs/
├── testing/               # 📂 テスト関連ドキュメント
│   ├── README.md         # 🏠 メインナビゲーション
│   ├── user-guide.md     # 👥 日常使用ガイド
│   ├── framework.md      # ⚙️ 技術仕様
│   ├── improvement-plan.md # 📈 改善ロードマップ
│   ├── implementation-checklist.md # ✅ 実装手順
│   └── work-checklist.md # 🔧 作業チェックリスト
├── local-development.md → testing/README.md
├── README.md → testing/README.md
└── CLAUDE.md → testing commands
```

---

**最終更新**: 2024年6月27日  
**メンテナー**: Claude Code Assistant  
**バージョン**: v2.0 (Phase 1完了・ドキュメント再編成版)