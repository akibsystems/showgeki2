# E2Eテストガイド

## 概要

このドキュメントは、Showgeki2アプリケーションのE2E（End-to-End）テストの実行方法と構成について説明します。

## テスト環境

### 使用技術
- **Playwright**: モダンなE2Eテストフレームワーク
- **TypeScript**: 型安全なテストコード
- **Next.js**: アプリケーションのフレームワーク

### サポートブラウザ
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## セットアップ

### 初回セットアップ
```bash
# Playwrightパッケージのインストール
npm install --save-dev @playwright/test

# Playwrightブラウザのインストール
npx playwright install
```

### 設定ファイル
- `playwright.config.ts`: メイン設定ファイル
- `tests/e2e/fixtures/global-setup.ts`: グローバルセットアップ
- `tests/e2e/fixtures/global-teardown.ts`: グローバルティアダウン

## テスト実行

### 基本的な実行コマンド

```bash
# 全てのE2Eテストを実行
npm run test:e2e

# UIモードでテストを実行（インタラクティブ）
npm run test:e2e:ui

# ヘッド付きモードで実行（ブラウザが表示される）
npm run test:e2e:headed

# デバッグモードで実行
npm run test:e2e:debug

# テストレポートを表示
npm run test:e2e:report
```

### 特定のテストのみ実行

```bash
# 特定のファイルのみ実行
npx playwright test pages/basic-navigation.test.ts

# 特定のブラウザのみ
npx playwright test --project=chromium

# 特定のテスト名で実行
npx playwright test --grep "ホームページが正常に表示される"
```

## テスト構成

### ディレクトリ構造
```
tests/e2e/
├── fixtures/          # 共通設定とヘルパー
│   ├── base-page.ts   # ページオブジェクトの基底クラス
│   ├── global-setup.ts
│   └── global-teardown.ts
├── pages/              # ページオブジェクトモデル
│   ├── home-page.ts
│   └── create-story-page.ts
└── workflows/          # ワークフローテスト
    └── story-creation.test.ts
```

### テストカテゴリ

#### 1. 基本ページナビゲーション (`pages/basic-navigation.test.ts`)
- ページロードテスト
- ナビゲーション確認
- レスポンシブデザイン
- パフォーマンス測定

#### 2. ストーリー作成ワークフロー (`workflows/story-creation.test.ts`)
- フォーム入力テスト
- バリデーション確認
- エラーハンドリング
- エンドツーエンドフロー

## ページオブジェクトモデル (POM)

### BasePage クラス
全てのページオブジェクトの基底クラス。共通機能を提供：

```typescript
export abstract class BasePage {
  protected page: Page;
  protected url: string;

  // 共通メソッド
  async goto(options?: { waitUntil?: 'networkidle' | 'domcontentloaded' | 'load' })
  async getTitle(): Promise<string>
  async expectUrl(expectedUrl?: string)
  async waitForElement(selector: string, timeout?: number)
  async takeScreenshot(name: string)
  // ...
}
```

### ページ固有クラス
各ページに特化したクラス：

```typescript
export class HomePage extends BasePage {
  // ページ固有のセレクター
  private readonly selectors = {
    createStoryButton: '[data-testid="create-story-button"]',
    // ...
  };

  // ページ固有のメソッド
  async goToCreateStory()
  async verifyHeroSection()
  // ...
}
```

## ベストプラクティス

### 1. セレクター戦略
- **推奨**: `data-testid` 属性を使用
- **フォールバック**: セマンティックセレクター (`role`, `aria-label`)
- **最終手段**: CSS セレクター、テキストベース

```typescript
// 良い例
private readonly selectors = {
  createButton: '[data-testid="create-story-button"]',
  // フォールバック
  submitButton: 'button[type="submit"], button:has-text("作成")'
};
```

### 2. 待機戦略
- ページロード完了の適切な待機
- 動的コンテンツの表示待機
- ネットワークアクティビティの終了待機

```typescript
// ページロード待機
await this.page.waitForLoadState('networkidle');

// 要素の表示待機
await this.page.waitForSelector('[data-testid="content"]', { timeout: 10000 });

// カスタム条件の待機
await this.page.waitForFunction(() => 
  document.querySelector('[data-testid="loading"]') === null
);
```

### 3. エラーハンドリング
- 予期されるエラーの適切な処理
- フォールバック戦略の実装
- デバッグ情報の収集

```typescript
try {
  await this.createStory();
} catch (error) {
  console.log('エラーが発生:', error);
  await this.takeScreenshot('error-state');
  
  // フォールバック処理
  if (await this.hasErrorMessage()) {
    console.log('バリデーションエラーが検出されました');
  } else {
    throw error;
  }
}
```

## CI/CD統合

### GitHub Actions設定例
```yaml
- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
    PLAYWRIGHT_BASE_URL: ${{ env.STAGING_URL }}

- name: Upload test artifacts
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: |
      test-results/
      playwright-report/
```

### 環境変数
- `CI=true`: CI環境での実行設定
- `PLAYWRIGHT_BASE_URL`: テスト対象のベースURL
- `PLAYWRIGHT_BROWSERS_PATH`: ブラウザキャッシュパス

## デバッグとトラブルシューティング

### デバッグ手法

#### 1. ヘッドモードで実行
```bash
npm run test:e2e:headed
```

#### 2. インタラクティブモード
```bash
npm run test:e2e:ui
```

#### 3. デバッグモード
```bash
npm run test:e2e:debug
```

#### 4. スクリーンショット確認
- 失敗時に自動でスクリーンショット保存
- `test-results/screenshots/` ディレクトリに保存

#### 5. トレース機能
- 失敗時にテストのリプレイが可能
- `test-results/` ディレクトリにtrace.zip保存

### よくある問題と解決法

#### 1. タイムアウトエラー
```bash
# タイムアウト時間を延長
npx playwright test --timeout=60000
```

#### 2. セレクター見つからないエラー
- `data-testid` 属性の確認
- フォールバックセレクターの実装
- 要素の読み込み待機の追加

#### 3. ネットワークエラー
- ベースURLの確認
- 開発サーバーの起動状態確認
- ネットワーク遅延の考慮

## パフォーマンス考慮事項

### 並列実行
- `playwright.config.ts`で並列度設定
- CI環境では`workers: 1`を推奨
- ローカル環境では自動並列実行

### リソース管理
- ブラウザインスタンスの適切な管理
- 不要なファイルのクリーンアップ
- メモリ使用量の監視

## 継続的改善

### メトリクス収集
- テスト実行時間
- 成功率
- フレイキーテストの特定

### テストの拡張
- 新機能に対するテスト追加
- エラーケースの拡充
- パフォーマンステストの追加

## 関連ドキュメント

- [基本テストガイド](./user-guide.md)
- [テスト改善計画](./improvement-plan.md)
- [Playwright公式ドキュメント](https://playwright.dev/docs/intro)