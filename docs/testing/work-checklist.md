# ✅ Showgeki2 テスト改善チェックリスト

## 🎯 実行用チェックリスト

このドキュメントは実際の作業で使用する詳細チェックリストです。各項目をチェックしながら確実に進めてください。

---

## 🔥 **PHASE 1: 基盤安定化** 

### **施策1: uid.test.ts修正** ⏱️ 2-4時間

#### **Pre-Work 準備作業**
- [ ] 現在の失敗テスト一覧を確認: `npm run test:run tests/unit/lib/uid.test.ts`
- [ ] 失敗原因をログで特定
- [ ] `tests/utils/setup.ts`のモック実装を確認

#### **Implementation 実装作業**

**🔧 LocalStorage モック修正**
- [ ] `mockLocalStorage.getItem`が正しい値を返すように修正
- [ ] `mockLocalStorage.setItem`の呼び出し記録機能を追加
- [ ] `mockLocalStorage.clear`の動作確認
- [ ] 容量制限エラー`QuotaExceededError`のシミュレーション実装

**🔧 Cookie モック実装**
- [ ] `document.cookie`のsetter実装: `Object.defineProperty(document, 'cookie', {...})`
- [ ] `document.cookie`のgetter実装で既存cookie取得
- [ ] URLエンコーディング処理: `encodeURIComponent`/`decodeURIComponent`
- [ ] Cookie属性解析機能: `path`, `domain`, `expires`, `secure`

**🔧 SSR環境テスト修正**
- [ ] `delete (global as any).window`処理の修正
- [ ] `window`オブジェクト復元処理の追加
- [ ] `typeof window === 'undefined'`条件での動作確認
- [ ] Node.js環境での適切なエラーハンドリング確認

#### **Testing 検証作業**
- [ ] テスト実行: `npm run test:run tests/unit/lib/uid.test.ts`
- [ ] 通過率確認: 63/63件すべて🟢にする
- [ ] エッジケースの追加テスト実行
- [ ] リグレッション確認: 他のテストに影響なし

#### **Documentation ドキュメント更新**
- [ ] 修正内容をCLAUDE.mdに記録
- [ ] 今後のブラウザAPIモック戦略を文書化

**✅ 完了条件**: `tests/unit/lib/uid.test.ts`で63/63件通過

---

### **施策2: Supabase統合テストモック簡素化** ⏱️ 6-8時間

#### **Pre-Work 準備作業**
- [ ] 現在の失敗分析: `npm run test:run tests/integration/api/stories.test.ts`
- [ ] 既存モック構造の問題点リストアップ
- [ ] Supabaseクエリビルダーの実際の動作確認

#### **Design 設計作業**

**🎨 モックファクトリ設計**
- [ ] `tests/helpers/supabase-mock.ts`ファイル作成
- [ ] `createMockSupabaseTable()`関数のインターフェース設計
- [ ] テストデータセットの型定義
- [ ] モックレスポンスの標準フォーマット定義

**🎨 ヘルパー関数仕様**
- [ ] `mockSelect()`メソッドの戻り値設計
- [ ] `mockInsert()`メソッドの戻り値設計  
- [ ] `mockUpdate()`メソッドの戻り値設計
- [ ] `mockDelete()`メソッドの戻り値設計
- [ ] チェーンメソッド（`eq`, `order`, `range`等）の設計

#### **Implementation 実装作業**

**🔧 モックファクトリ実装**
```typescript
// tests/helpers/supabase-mock.ts に実装
- [ ] createMockSupabaseTable() 基本実装
- [ ] チェーンメソッドの適切な戻り値設定
- [ ] thenable実装でawait対応
- [ ] エラーレスポンスのシミュレーション機能
```

**🔧 テストデータ整備**
```typescript
// tests/fixtures/test-data.ts に実装
- [ ] MOCK_STORY データセット拡充
- [ ] MOCK_USER データセット作成
- [ ] MOCK_WORKSPACE データセット作成
- [ ] MOCK_VIDEO データセット作成
```

**🔧 既存テスト書き換え**
- [ ] `GET /api/stories`テストの簡素化
- [ ] `POST /api/stories`テストの簡素化
- [ ] `PUT /api/stories/[id]`テストの簡素化
- [ ] `DELETE /api/stories/[id]`テストの簡素化
- [ ] ワークフロー統合テストの修正

#### **Testing 検証作業**
- [ ] テスト実行: `npm run test:run tests/integration/api/stories.test.ts`
- [ ] 通過率確認: 36/36件すべて🟢にする
- [ ] モック応答時間の確認（100ms以下）
- [ ] メモリリーク確認: 大量テスト実行での安定性

#### **Refactoring リファクタリング**
- [ ] 重複コードの除去
- [ ] 一貫性のあるテストパターンへの統一
- [ ] テスト可読性の向上

**✅ 完了条件**: `tests/integration/api/stories.test.ts`で36/36件通過

---

### **施策3: カバレッジレポート修正** ⏱️ 1-2時間

#### **Pre-Work 準備作業**
- [ ] エラーログの詳細確認: `npm run test:coverage`
- [ ] sourcemapエラーの根本原因特定
- [ ] `.next`ディレクトリ構造の調査

#### **Implementation 実装作業**

**🔧 vitest.config.ts 修正**
```typescript
- [ ] coverage.exclude配列に以下を追加:
  - [ ] '.next/**/*'
  - [ ] '**/*.map'
  - [ ] '**/node_modules/**/*'
- [ ] しきい値を現実的な値に調整:
  - [ ] branches: 70% → 60%
  - [ ] functions: 80% → 75%
  - [ ] lines: 80% → 75%
  - [ ] statements: 80% → 75%
```

**🔧 除外パターン最適化**
- [ ] ビルドファイルの完全除外
- [ ] テストファイル自体の除外確認
- [ ] 設定ファイルの除外確認
- [ ] スクリプトファイルの除外確認

#### **Testing 検証作業**
- [ ] カバレッジ実行: `npm run test:coverage`
- [ ] HTMLレポート生成確認: `coverage/index.html`
- [ ] JSONレポート生成確認: `coverage/coverage.json`
- [ ] CI環境での実行確認

#### **Documentation ドキュメント更新**
- [ ] カバレッジ実行手順をREADMEに追加
- [ ] しきい値の根拠をドキュメント化
- [ ] 継続的改善プロセスの定義

**✅ 完了条件**: カバレッジレポートが正常生成され、HTMLで閲覧可能

---

## ⚡ **PHASE 2: 機能拡張**

### **施策4: API Client ネットワークエラー強化** ⏱️ 1-3時間

#### **Pre-Work 準備作業**
- [ ] 失敗テストの詳細確認: `API Client Tests > Retry Logic > should retry on network errors`
- [ ] 現在のfetchモック実装確認
- [ ] 期待されるエラーハンドリング仕様確認

#### **Implementation 実装作業**

**🔧 Fetchモック強化**
```typescript
- [ ] TypeError: Failed to fetch の適切なシミュレーション
- [ ] ネットワークタイムアウトエラーの実装
- [ ] 接続拒否エラー（ECONNREFUSED）の実装
- [ ] DNSエラーの実装
```

**🔧 リトライロジックテスト**
- [ ] 指数バックオフアルゴリズムの検証
- [ ] 最大リトライ回数（3回）の確認
- [ ] リトライ対象エラー（5xx, ネットワーク）の分類
- [ ] 非リトライエラー（4xx）の即座な失敗確認

**🔧 境界値テスト追加**
- [ ] 0msタイムアウトでの動作
- [ ] 極大レスポンス（10MB+）での動作
- [ ] 不正JSONレスポンスでの動作
- [ ] 空レスポンス（204 No Content）での動作

#### **Testing 検証作業**
- [ ] テスト実行: `npm run test:run tests/unit/lib/api-client.test.ts`
- [ ] 通過率確認: 54/54件すべて🟢にする
- [ ] 実際のネットワーク環境でのE2Eテスト
- [ ] パフォーマンス影響確認

**✅ 完了条件**: `tests/unit/lib/api-client.test.ts`で54/54件通過

---

### **施策5: フロントエンドコンポーネントテスト** ⏱️ 8-12時間

#### **Pre-Work 準備作業**
- [ ] 対象コンポーネントの優先度設定と合意
- [ ] Testing Libraryのベストプラクティス調査
- [ ] 既存コンポーネント構造の把握

#### **Setup セットアップ作業**

**🏗️ テスト環境準備**
- [ ] `tests/components/`ディレクトリ作成
- [ ] 共通テストヘルパー`tests/helpers/component-helpers.ts`作成
- [ ] Context Provider モック実装
- [ ] Next.js Router モック設定

#### **Implementation 実装作業**

**🔧 VideoPlayer コンポーネントテスト**
```typescript
// tests/components/video/video-player.test.tsx
- [ ] 基本レンダリングテスト: 動画要素の存在確認
- [ ] Props受け渡しテスト: src, poster, controls等
- [ ] 動画再生/停止機能テスト: play(), pause()メソッド
- [ ] エラー状態表示テスト: 無効なURL、ネットワークエラー
- [ ] レスポンシブ動作テスト: 画面サイズ変更
- [ ] アクセシビリティテスト: ARIA属性、キーボード操作
```

**🔧 ScriptEditor コンポーネントテスト**
```typescript
// tests/components/editor/script-editor.test.tsx
- [ ] Monaco Editor レンダリングテスト
- [ ] JSON編集機能テスト: 有効/無効JSON入力
- [ ] バリデーションエラー表示テスト: 赤色ハイライト
- [ ] 保存機能テスト: Ctrl+S, 保存ボタン
- [ ] Undo/Redo機能テスト: Ctrl+Z, Ctrl+Y
- [ ] 自動補完機能テスト: JSON schema validation
```

**🔧 共通UIコンポーネントテスト**
```typescript
// tests/components/ui/ 以下
- [ ] Button: クリック、disabled状態、variant別スタイル
- [ ] Modal: 開閉、オーバーレイクリック、ESCキー
- [ ] Toast: 表示/非表示、自動消去、複数表示
- [ ] Spinner: アニメーション、サイズvariant
```

#### **Testing 検証作業**
- [ ] 各コンポーネントテスト実行
- [ ] 統合テスト: コンポーネント間連携
- [ ] ビジュアルリグレッションテスト検討
- [ ] アクセシビリティ基準準拠確認

**✅ 完了条件**: 主要5コンポーネントのテスト実装完了（各20+テストケース）

---

### **施策6: 共通テストヘルパー整備** ⏱️ 4-6時間

#### **Analysis 分析作業**
- [ ] 既存テストコードの重複パターン特定
- [ ] 共通化可能な処理の洗い出し（10+パターン）
- [ ] ヘルパー関数の優先順位設定

#### **Setup セットアップ作業**

**🏗️ ディレクトリ構造**
```
tests/
├── helpers/          # ヘルパー関数
├── fixtures/         # テストデータ
├── mocks/           # モック関数
└── utils/           # 既存のセットアップ
```

#### **Implementation 実装作業**

**🔧 データファクトリ実装**
```typescript
// tests/helpers/factories.ts
- [ ] createMockStory(overrides?: Partial<Story>): Story
- [ ] createMockUser(overrides?: Partial<User>): User  
- [ ] createMockVideo(overrides?: Partial<Video>): Video
- [ ] createMockWorkspace(overrides?: Partial<Workspace>): Workspace
- [ ] createMockApiResponse<T>(data: T, status?: number): MockResponse
```

**🔧 アサーション関数実装**
```typescript
// tests/helpers/assertions.ts
- [ ] expectValidStoryResponse(response: Response, story: Story): void
- [ ] expectErrorResponse(response: Response, errorType: ErrorType): void
- [ ] expectAuthenticatedRequest(mockAuth: MockAuth): void
- [ ] expectValidationError(response: Response, field: string): void
- [ ] expectPaginatedResponse<T>(response: Response, expectedCount: number): void
```

**🔧 リクエストヘルパー実装**
```typescript
// tests/helpers/requests.ts
- [ ] createMockRequest(options: RequestOptions): NextRequest
- [ ] createAuthenticatedRequest(uid: string, options?: RequestOptions): NextRequest
- [ ] createMockContext(params: Record<string, string>): Context
- [ ] createMockSearchParams(params: Record<string, string>): URLSearchParams
```

#### **Migration 移行作業**
- [ ] unit テストでのヘルパー関数適用（10+ファイル）
- [ ] integration テストでのヘルパー関数適用（5+ファイル）
- [ ] 重複コードの削除（100+行削減目標）
- [ ] 一貫性確保のためのコードレビュー

#### **Testing 検証作業**
- [ ] ヘルパー関数単体テスト
- [ ] 既存テストの動作確認
- [ ] パフォーマンス影響測定
- [ ] 保守性向上の定量評価

**✅ 完了条件**: 既存テストの30%以上でヘルパー関数活用、コード重複30%削減

---

## 🎯 **PHASE 3: 自動化・監視**

### **施策7: E2Eテスト基盤導入** ⏱️ 12-16時間

#### **Research & Setup 調査・セットアップ**
- [ ] Playwright vs Cypress 機能比較表作成
- [ ] Playwright選定理由の文書化
- [ ] `npm install -D @playwright/test`実行
- [ ] `npx playwright install`でブラウザインストール

#### **Configuration 設定作業**

**🏗️ 基本設定**
```typescript
// playwright.config.ts
- [ ] baseURL設定（localhost:3000）
- [ ] ブラウザ設定（Chrome, Firefox, Safari）
- [ ] タイムアウト設定（30秒）
- [ ] 並列実行設定（workers: 3）
- [ ] レポート設定（HTML, JSON）
```

**🏗️ テスト環境分離**
```
tests/e2e/
├── fixtures/        # テストデータ
├── pages/          # Page Object Model
├── tests/          # テストケース
└── utils/          # E2E専用ユーティリティ
```

#### **Implementation 実装作業**

**🔧 Page Object Model実装**
```typescript
// tests/e2e/pages/
- [ ] LoginPage.ts: ログイン関連操作
- [ ] StoryCreationPage.ts: 物語作成操作
- [ ] DashboardPage.ts: ダッシュボード操作  
- [ ] VideoViewerPage.ts: 動画視聴操作
```

**🔧 基本ジャーニーテスト**
```typescript
// tests/e2e/tests/
- [ ] auth.spec.ts: ユーザー登録・ログイン・ログアウト
- [ ] story-creation.spec.ts: 物語作成フルフロー
- [ ] video-generation.spec.ts: 動画生成とダウンロード
- [ ] responsive.spec.ts: モバイル・タブレット対応
- [ ] accessibility.spec.ts: キーボードナビゲーション
```

**🔧 エラーケーステスト**
```typescript
- [ ] 無効な入力での適切なエラー表示
- [ ] ネットワーク障害時のリトライ機能
- [ ] セッション期限切れでのリダイレクト
- [ ] APIエラー時のユーザーフレンドリーなメッセージ
```

#### **CI Integration CI統合**
- [ ] GitHub Actionsワークフローに追加
- [ ] 本番環境での週次実行設定
- [ ] 失敗時のスクリーンショット保存
- [ ] Slack通知設定

**✅ 完了条件**: 5つの主要ジャーニーのE2Eテスト実装完了

---

### **施策8: CI/CDパイプライン強化** ⏱️ 6-10時間

#### **Current State Analysis 現状分析**
- [ ] 既存`.github/workflows/`ファイル確認
- [ ] 実行時間測定とボトルネック特定
- [ ] 失敗パターン分析（過去30日）

#### **Optimization 最適化実装**

**🔧 並列テスト実行**
```yaml
# .github/workflows/test.yml
- [ ] matrix strategyでNode.js版並列実行
- [ ] unit/integration/e2eテストの並列実行
- [ ] キャッシュ活用でnode_modules高速復元
```

**🔧 条件付き実行**
```yaml
- [ ] changedファイルベースの実行制御
- [ ] PRラベルベースのテスト選択
- [ ] リリースブランチでの全テスト必須実行
```

**🔧 品質ゲート**
```yaml  
- [ ] テストカバレッジ75%以上を必須化
- [ ] ESLintエラー0件を必須化
- [ ] TypeScript型エラー0件を必須化
- [ ] セキュリティ監査通過を必須化
```

#### **Monitoring & Notification 監視・通知**

**🔧 Slack統合**
```typescript
- [ ] テスト失敗時の即座通知
- [ ] カバレッジ低下アラート
- [ ] デプロイ成功/失敗通知
- [ ] 週次品質サマリレポート
```

**🔧 ダッシュボード**
- [ ] GitHub Actions実行履歴の可視化
- [ ] テスト実行時間トレンド
- [ ] 成功率の推移グラフ
- [ ] ボトルネック分析レポート

#### **Deployment Automation デプロイ自動化**
- [ ] ステージング環境への自動デプロイ
- [ ] E2Eテスト成功後の本番デプロイ
- [ ] Blue-Greenデプロイメント検討
- [ ] 自動ロールバック機能

**✅ 完了条件**: 完全自動化されたCI/CDで手動作業0

---

### **施策9: パフォーマンステスト導入** ⏱️ 8-12時間

#### **Tool Selection & Setup ツール選定・セットアップ**
- [ ] k6 vs JMeter vs Artillery 比較検討
- [ ] k6インストール: `npm install -g k6`
- [ ] Google Cloud Load Testing環境準備
- [ ] Grafanaダッシュボード設定

#### **Test Scenario Design シナリオ設計**

**🎯 負荷パターン定義**
```javascript
- [ ] 基本負荷: 10ユーザー/秒 継続30分
- [ ] ピーク負荷: 100ユーザー/秒 継続10分  
- [ ] ストレス負荷: 500ユーザー/秒 継続5分
- [ ] スパイク負荷: 1000ユーザー瞬間アクセス
```

#### **Implementation 実装作業**

**🔧 k6テストスクリプト**
```javascript
// performance/api-load-test.js
- [ ] GET /api/stories エンドポイント負荷テスト
- [ ] POST /api/stories 作成処理負荷テスト
- [ ] 動画生成API の非同期処理負荷テスト
- [ ] 認証APIの負荷テスト
```

**🔧 Cloud Run特性テスト**
```javascript
- [ ] コールドスタート時間測定（初回リクエスト）
- [ ] スケールアウト特性確認（0→10インスタンス）
- [ ] メモリ使用率監視（2GB制限）
- [ ] CPU使用率監視（1vCPU制限）
```

#### **Monitoring 監視設定**
- [ ] Google Cloud Monitoring統合
- [ ] アラートポリシー設定（応答時間>5秒）
- [ ] 費用監視アラート（$10/日超過）
- [ ] SLA監視（99.9%稼働率）

#### **Regular Execution 定期実行**
- [ ] 週次負荷テストの自動実行
- [ ] 月次パフォーマンスレポート生成
- [ ] 改善提案の自動生成機能
- [ ] ベンチマーク結果のトレンド分析

**✅ 完了条件**: パフォーマンス監視体制確立、週次レポート自動生成

---

### **施策10: セキュリティテスト強化** ⏱️ 10-15時間

#### **Security Assessment セキュリティ評価**
- [ ] OWASP Top 10 現状対策確認
- [ ] JWT実装のセキュリティレビュー
- [ ] Supabase RLS（Row Level Security）設定確認
- [ ] API認可設定の網羅的チェック

#### **Tool Integration ツール統合**

**🔧 OWASP ZAP設定**
```yaml
- [ ] CI pipelineでの自動スキャン設定
- [ ] ベースライン設定と False Positive除外
- [ ] 脆弱性重要度別のアラート設定
- [ ] スキャン結果のSlack通知
```

#### **Implementation 実装作業**

**🔧 認証・認可テスト**
```typescript
// tests/security/auth.test.ts
- [ ] JWT改ざん検出テスト
- [ ] 有効期限切れトークン拒否テスト
- [ ] 権限昇格攻撃防止テスト
- [ ] セッション固定攻撃防止テスト
```

**🔧 インジェクション攻撃テスト**
```typescript
// tests/security/injection.test.ts
- [ ] SQLインジェクション対策確認
- [ ] NoSQLインジェクション対策確認
- [ ] XSS脆弱性テスト（Stored/Reflected）
- [ ] CSRF攻撃防止トークン確認
```

**🔧 データ保護テスト**
```typescript
// tests/security/data-protection.test.ts  
- [ ] 個人情報の適切なマスキング確認
- [ ] ログ出力での機密情報露出チェック
- [ ] HTTPS強制リダイレクト確認
- [ ] API応答での機密情報露出チェック
```

#### **Compliance 準拠性確認**
- [ ] GDPR準拠性チェック（個人データ処理）
- [ ] 日本個人情報保護法準拠性確認
- [ ] セキュリティヘッダー設定確認
- [ ] Content Security Policy設定

#### **Incident Response インシデント対応**
- [ ] セキュリティインシデント対応手順書作成
- [ ] 脆弱性発見時のエスカレーション手順
- [ ] セキュリティパッチ適用プロセス
- [ ] 定期的セキュリティ監査計画

**✅ 完了条件**: セキュリティテスト自動化、月次セキュリティレポート

---

## 📊 **進捗管理セクション**

### **Weekly Progress Tracking 週次進捗追跡**

#### **Week 1 Milestone**
```
🎯 目標: 基盤安定化
- [ ] uid.test.ts: __ / 63 件通過 ____%
- [ ] stories.test.ts: __ / 36 件通過 ____%  
- [ ] カバレッジレポート: [ 🟢 正常 | 🔴 エラー ]
総合評価: [ 🟢 予定通り | 🟡 若干遅れ | 🔴 大幅遅れ ]
```

#### **Week 2 Milestone**
```
🎯 目標: 機能拡張
- [ ] api-client.test.ts: __ / 54 件通過 ____%
- [ ] コンポーネントテスト: __ / 5 件実装 ____%
- [ ] ヘルパー関数活用: __ / __ ファイル ____%
総合評価: [ 🟢 予定通り | 🟡 若干遅れ | 🔴 大幅遅れ ]
```

#### **Week 3-4 Milestone**
```
🎯 目標: 自動化・監視
- [ ] E2Eテスト: __ / 5 ジャーニー ____%
- [ ] CI/CD: [ 🟢 完全自動化 | 🟡 部分自動化 | 🔴 手動 ]
- [ ] パフォーマンス監視: [ 🟢 構築完了 | 🔴 未構築 ]
- [ ] セキュリティテスト: [ 🟢 自動化完了 | 🔴 手動 ]
総合評価: [ 🟢 予定通り | 🟡 若干遅れ | 🔴 大幅遅れ ]
```

### **Quality Metrics Dashboard 品質メトリクス**

#### **Test Coverage Progress**
```
🎯 目標: 60% → 85%
現在: ____%
Week 1: ____%  
Week 2: ____%
Week 3: ____%
Week 4: ____%
```

#### **Test Execution Metrics**
```
🎯 CI/CD実行時間: 50%短縮目標
現在: ___ 分
Week 1: ___ 分
Week 2: ___ 分  
Week 3: ___ 分
Week 4: ___ 分
```

#### **Bug Detection Rate**
```
🎯 バグ検出率: 70%向上目標
現在: 発見バグ数 ___件
Week 1: 発見バグ数 ___件
Week 2: 発見バグ数 ___件
Week 3: 発見バグ数 ___件  
Week 4: 発見バグ数 ___件
```

### **Risk Management リスク管理**

#### **Technical Risks 技術的リスク**
```
🚨 高リスク
- [ ] 外部API依存による不安定性
- [ ] Cloud Run コールドスタート問題
- [ ] Supabaseクエリ複雑性

⚠️  中リスク  
- [ ] テスト実行時間の長時間化
- [ ] CI/CD環境でのリソース制限
- [ ] ブラウザ互換性問題

✅ 低リスク
- [ ] ライブラリバージョン競合
- [ ] 設定ファイル管理
```

#### **Resource Risks リソースリスク**
```
👥 人的リソース
- [ ] 技術習得に必要な学習時間
- [ ] 他プロジェクトとの兼務影響
- [ ] 専門知識不足領域の特定

💰 予算リスク
- [ ] Cloud環境の従量課金
- [ ] 追加ツール・ライセンス費用
- [ ] 想定以上の工数発生
```

### **Communication Plan コミュニケーション計画**

#### **Daily Standups 日次確認**
```
⏰ 毎日 9:00 AM (5分)
- [ ] 昨日の完了項目
- [ ] 今日の予定項目
- [ ] ブロッカー・課題
```

#### **Weekly Reviews 週次レビュー**
```
⏰ 毎週金曜 14:00 (30分)
- [ ] マイルストーン達成状況
- [ ] 品質メトリクス確認
- [ ] 次週の優先度調整
```

#### **Stakeholder Updates ステークホルダー報告**
```
⏰ 隔週水曜 15:00 (15分)
- [ ] 進捗サマリ
- [ ] リスク・課題エスカレーション
- [ ] 必要な意思決定事項
```

---

## 📞 **サポート・エスカレーション**

### **Technical Support 技術サポート**
```
🔧 Level 1: セルフサービス
- [ ] 社内ドキュメント・FAQ参照
- [ ] GitHub Issues/Discussion確認
- [ ] Stack Overflow検索

🔧 Level 2: チーム内サポート
- [ ] 開発チームメンバーへの相談
- [ ] ペアプログラミング実施
- [ ] 技術レビュー依頼

🔧 Level 3: 外部サポート
- [ ] ベンダーサポート問い合わせ
- [ ] コミュニティフォーラム投稿
- [ ] 外部コンサルタント依頼
```

### **Project Escalation プロジェクトエスカレーション**
```
⚠️  リソース不足
→ プロジェクトマネージャーへ即座報告

⚠️  技術的難易度超過  
→ 技術責任者との緊急会議

⚠️  スケジュール遅延リスク
→ ステークホルダーとの調整会議
```

---

*最終更新: 2024年12月*  
*実行責任者: [記入してください]*  
*承認者: [記入してください]*