# Showgeki2 テスト実行ガイド

このドキュメントでは、Showgeki2プロジェクトでのテストの実行方法、カバレッジレポートの生成、および各種テスト機能の使用方法について説明します。

## 📋 目次

- [基本的なテスト実行](#基本的なテスト実行)
- [カバレッジレポート](#カバレッジレポート)
- [テストファイル構成](#テストファイル構成)
- [モック機能](#モック機能)
- [デバッグとトラブルシューティング](#デバッグとトラブルシューティング)
- [CI/CD での使用](#cicd-での使用)

## 🚀 基本的なテスト実行

### 全テスト実行

```bash
# ウォッチモードで全テスト実行
npm test

# 一回のみ実行（CI用）
npm run test:run

# UIモードでテスト実行（ブラウザで可視化）
npm run test:ui
```

### 特定ファイルのテスト

```bash
# 単一ファイルをテスト
npm test tests/unit/lib/uid.test.ts

# パターンマッチでテスト
npm test "tests/unit/**/*.test.ts"

# 統合テストのみ実行
npm test tests/integration/

# ユニットテストのみ実行
npm test tests/unit/
```

### ファイル監視とホットリロード

```bash
# 変更されたファイルのみ再テスト（デフォルト）
npm test

# 全ファイルを監視して再テスト
npm test --coverage --watch
```

## 📊 カバレッジレポート

### カバレッジ生成

```bash
# カバレッジレポート生成
npm run test:coverage

# 特定ファイルのカバレッジ
npm run test:coverage tests/unit/lib/uid.test.ts

# HTMLレポートを生成してブラウザで開く
npm run test:coverage && open coverage/index.html
```

### カバレッジレポートの種類

#### 1. テキストレポート（コンソール出力）
```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   96.62 |    95.65 |     100 |   96.62 |                   
 lib/uid.ts        |   96.62 |    95.65 |     100 |   96.62 | 129-130,143-144   
-------------------|---------|----------|---------|---------|-------------------
```

#### 2. HTMLレポート（ブラウザ表示）
- **場所**: `coverage/index.html`
- **特徴**: ファイル別詳細表示、未カバー行のハイライト
- **開き方**: `open coverage/index.html` (macOS) / `start coverage/index.html` (Windows)

#### 3. JSONレポート（機械可読）
- **場所**: `coverage/coverage-final.json`
- **用途**: CI/CD パイプライン、自動化ツール連携

### カバレッジ閾値

現在の閾値設定（`vitest.config.ts`）:
```typescript
thresholds: {
  global: {
    branches: 70,    // 分岐カバレッジ
    functions: 80,   // 関数カバレッジ
    lines: 80,       // 行カバレッジ
    statements: 80,  // 文カバレッジ
  },
}
```

## 📁 テストファイル構成

### ディレクトリ構造
```
tests/
├── unit/                    # ユニットテスト
│   ├── lib/
│   │   ├── uid.test.ts     # UID管理機能
│   │   ├── auth.test.ts    # 認証機能
│   │   ├── schemas.test.ts # バリデーション
│   │   └── supabase.test.ts # データベース
│   └── components/         # コンポーネントテスト
├── integration/            # 統合テスト
│   └── api/
│       └── stories.test.ts # Stories API
├── fixtures/               # テストデータ
│   └── test-data.ts       # 共通テストデータ
├── helpers/               # テストヘルパー
│   └── supabase-mock.ts   # Supabaseモック
└── utils/                 # テストユーティリティ
    └── setup.ts          # グローバル設定
```

### テストの命名規則

- **ユニットテスト**: `[対象ファイル名].test.ts`
- **統合テスト**: `[機能名].test.ts`
- **E2Eテスト**: `[ユーザーフロー名].e2e.test.ts`

## 🎭 モック機能

### 環境変数モック

テストでは以下の環境変数が自動設定されます：
```javascript
env: {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
}
```

### Supabaseモック

```typescript
import { createMockSupabaseClient, mockStore } from '../../helpers/supabase-mock'

// モッククライアント使用
const client = createMockSupabaseClient()

// テストデータ設定
mockStore.setData('stories', [MOCK_STORY])

// データ取得確認
const stories = mockStore.getData('stories')
```

### ブラウザAPIモック

#### localStorage
```typescript
// テスト内で自動的にモック化
localStorage.setItem('test-key', 'test-value')
expect(localStorage.getItem('test-key')).toBe('test-value')
```

#### Cookie
```typescript
// documentオブジェクトもモック化済み
document.cookie = 'sessionId=abc123'
```

### OpenAI APIモック

```typescript
import { vi } from 'vitest'

// OpenAI API応答をモック
const { generateMulmoscriptWithFallback } = await import('@/lib/openai-client')
vi.mocked(generateMulmoscriptWithFallback).mockResolvedValue({
  script: MOCK_GENERATED_SCRIPT,
  generated_with_ai: true,
})
```

## 🔍 デバッグとトラブルシューティング

### デバッグ実行

```bash
# デバッグ情報付きでテスト実行
npm test -- --reporter=verbose

# 特定のテストケースのみ実行
npm test -- --grep "should validate UID format"

# タイムアウト時間の延長
npm test -- --timeout=30000
```

### よくある問題と解決法

#### 1. モック関連エラー
```
Error: Cannot find module '@/lib/supabase'
```
**解決**: パスエイリアス設定を確認し、必要に応じて相対パスを使用

#### 2. タイムアウトエラー
```
Test timeout after 10000ms
```
**解決**: `vitest.config.ts`で`testTimeout`を調整

#### 3. カバレッジ生成エラー
```
Error: Source map file not found
```
**解決**: `.next`ディレクトリを除外設定に追加済み（解決済み）

### ログ出力の確認

```bash
# コンソールログを含む詳細出力
npm test -- --reporter=verbose --no-coverage

# エラーのスタックトレース表示
npm test -- --reporter=verbose --bail
```

## 🔄 CI/CD での使用

### GitHub Actions での設定例

```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage reports
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/coverage-final.json
```

### カバレッジ閾値チェック

```bash
# 閾値を満たさない場合、ビルドが失敗
npm run test:coverage

# 閾値を一時的に無視
npm run test:coverage -- --coverage.thresholds.global.branches=50
```

## 📈 パフォーマンス最適化

### 並列実行

```bash
# 複数ワーカーでテスト実行
npm test -- --threads

# ワーカー数を指定
npm test -- --threads --max-workers=4
```

### キャッシュ活用

```bash
# Vitestキャッシュをクリア
npm test -- --no-cache

# 依存関係の変更を検出して実行
npm test -- --changed
```

## 🎯 ベストプラクティス

### 1. テスト実行頻度
- **開発中**: `npm test` でウォッチモード
- **PRマージ前**: `npm run test:coverage` で完全チェック
- **デプロイ前**: `npm run test:run` で本番確認

### 2. カバレッジ目標
- **新機能**: 90%以上のカバレッジを目指す
- **既存コード**: 段階的にカバレッジを向上
- **クリティカル機能**: 100%カバレッジを維持

### 3. テストデータ管理
- `tests/fixtures/test-data.ts`の共通データを活用
- テスト間でのデータ干渉を避ける
- 実際のデータ形式に近いモックを使用

## 🔗 関連ドキュメント

- [テスト改善計画](./improvement-plan.md)
- [実装チェックリスト](./implementation-checklist.md)
- [技術フレームワーク詳細](./framework.md)
- [テストドキュメント一覧](./README.md)

---

**更新日**: 2024年6月27日  
**バージョン**: v1.0  
**担当**: Claude Code Assistant