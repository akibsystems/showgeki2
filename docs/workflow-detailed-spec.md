# ワークフロー詳細仕様書

## 1. システム概要

### 1.1 目的
誰でも簡単にシェイクスピア風の動画を作成できるワークフローシステムを提供する。

### 1.2 技術スタック
- **フロントエンド**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Google Cloud Run
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **AI/ML**: OpenAI GPT-4.1, DALL-E, TTS
- **動画生成**: mulmocast-cli

## 2. データフロー

### 2.1 ワークフロー管理
```typescript
interface WorkflowState {
  id: string;
  currentStep: number;
  canProceed: boolean;
  canGoBack: boolean;
  completedSteps: number[];
}
```

### 2.2 状態管理
- StepNOutput（userInputを含む）は `workflows` テーブルの `stepX_out` カラムに保存
- StepNInput（表示用データ）は `workflows` テーブルの `stepX_in` カラムにキャッシュとして保存
- LLM生成データは `storyboards` テーブルの `stepX_generated` カラムに保存
- 関係性: `project`（1）→ `storyboard`（多）= `workflow`（1）
- セッションストレージを使用して一時的な編集状態を保持
- ステップ間の遷移時にAPIを通じてデータを永続化

## 3. API仕様

### 3.1 プロジェクト作成
```
POST /api/project/create
Headers: 
  - X-User-UID: string
Body:
  - name: string
  - description?: string
Response:
  - project_id: string
```

### 3.2 ストーリーボード作成
```
POST /api/storyboard/create
Headers: 
  - X-User-UID: string
Body:
  - project_id: string
  - title?: string
Response:
  - storyboard_id: string
  - workflow_id: string
  - redirect_url: string
```

### 3.3 ステップデータ保存
```
POST /api/workflow/[workflow_id]/step/[step_number]
Headers:
  - X-User-UID: string
Body:
  - data: StepXOutput.userInput
Response:
  - success: boolean
  - nextStepInput: StepX+1Input (次ステップ用の表示データ)
```
処理:
1. workflows.stepX_out に StepXOutput全体（userInputを含む）を保存
2. LLMで次ステップ用データを生成
3. storyboards.stepX_generated に生成データを保存
4. 次ステップの StepX+1Input を生成
5. workflows.stepX+1_in にキャッシュとして保存

### 3.4 ステップデータ取得
```
GET /api/workflow/[workflow_id]/step/[step_number]
Headers:
  - X-User-UID: string
Response:
  - stepInput: StepXInput (画面表示用データ)
  - stepOutput: StepXOutput | null (既存の入力データ)
  - canEdit: boolean
  - canProceed: boolean
```
処理:
1. workflows.stepX_in からキャッシュされた表示用データを取得
2. キャッシュが存在しない場合は storyboards から再生成してキャッシュ
3. workflows.stepX_out から既存のユーザー入力データを取得

### 3.5 MulmoScript生成
```
POST /api/workflow/[workflow_id]/generate-script
Headers:
  - X-User-UID: string
Response:
  - script: MulmoScript
  - videoId: string
```

## 4. 各ステップの詳細仕様

### 4.1 ステップ1: ストーリー入力

#### 画面要素
- **入力フィールド**
  - 主なストーリー（textarea, 必須, 最大2000文字）
  - 主な登場人物（textarea, 必須, 最大500文字）
  - ドラマチック転換点（textarea, 必須, 最大500文字）
  - 未来イメージ（textarea, 任意, 最大500文字）
  - 学び（textarea, 任意, 最大500文字）
- **設定項目**
  - シーン数（select, 1-20, デフォルト5）
  - スタイル（select, デフォルト「シェイクスピア風」）
  - 言語（select, ja/en, デフォルトja）

#### 処理フロー
1. ユーザーが入力を完了し「次へ」をクリック
2. バリデーション実行
3. APIに送信し、LLMで次ステップ用コンテンツを生成
4. 成功したらステップ2へ遷移

#### LLM生成内容
- 作品タイトル案
- 幕と場の構成案（シーン数に基づく）
- 登場人物の詳細情報

### 4.2 ステップ2: 初期幕場レビュー

#### 画面要素
- **タイトル編集**（input, 必須, 最大100文字）
- **幕場構成エディタ**
  - 幕の追加/削除/並び替え
  - 各幕のタイトル編集
  - 各場のタイトルと概要編集

#### 処理フロー
1. LLM生成案を初期表示
2. ユーザーが編集
3. 確認して次へ進む
4. LLMで登場人物の詳細情報を生成

### 4.3 ステップ3: キャラクタ&画風設定

#### 画面要素
- **キャラクター設定**
  - 名前、説明の編集
  - 顔参照画像のアップロード（任意）
- **画風設定**
  - プリセット選択（アニメ風、水彩画風、油絵風など）
  - カスタムプロンプト入力（任意）

#### 処理フロー
1. キャラクター情報を確認・編集
2. 画風を選択
3. LLMで各シーンの詳細な台本を生成

#### LLM生成内容
- 各シーンの詳細な台本（幕・場の情報を含む）
- 各シーンのタイトル
- セリフと話者の割り当て
- 画像生成用プロンプト
- 推定時間（オプション）

### 4.4 ステップ4: 台本＆静止画プレビュー

#### 画面要素（Storyboard形式）
- **幕表示**（読み取り専用）
  - 幕番号とタイトルをセクション区切りとして表示
  - 各幕の下に所属するシーンを配置
- **シーンカード**（縦に並べて表示）
  - シーン番号とタイトル
  - 所属する幕の情報（表示のみ）
  - 画像プレビュー/プロンプト編集
  - セリフと話者選択
  - シーンの追加/削除/並び替え

#### 特別機能
- CM用画像のアップロード
- シーンの複製
- プロンプトの一括編集
- 幕ごとの折りたたみ表示（モバイル向け）

### 4.5 ステップ5: 音声生成

#### 画面要素
- **話者設定**
  - 各キャラクターへの音声割り当て
  - OpenAI音声の試聴
- **読み上げテキスト編集**
  - 読み間違い修正
  - 音声再生成

#### 処理フロー
1. 音声を自動生成
2. 試聴して修正
3. 必要に応じて再生成

### 4.6 ステップ6: BGM & 字幕設定

#### 画面要素
- **BGM設定**
  - プリセットBGM選択
  - カスタムBGMアップロード
  - 音量調整
- **字幕設定**
  - 有効/無効切り替え
  - 言語選択
  - スタイル選択

### 4.7 ステップ7: 最終確認

#### 画面要素
- **作品情報**
  - タイトル最終編集
  - 説明文入力
  - タグ設定
- **プレビュー**
  - 全シーンのサムネイル表示
  - 推定動画時間
- **動画生成開始ボタン**

## 5. エラーハンドリング

### 5.1 一般的なエラー
- **ネットワークエラー**: 再試行ボタンを表示
- **認証エラー**: ログイン画面へリダイレクト
- **バリデーションエラー**: フィールドごとにエラーメッセージ表示

### 5.2 ワークフロー固有のエラー
- **ステップ遷移エラー**: 前のステップが未完了の場合
- **データ不整合**: ステップ1-3を編集した場合、後続ステップをリセット
- **生成エラー**: LLM/画像/音声生成失敗時は再試行オプション提供

## 6. パフォーマンス最適化

### 6.1 フロントエンド
- ステップ間の遷移でローディング表示
- 画像の遅延読み込み
- 大きなフォームは部分的に保存

### 6.2 バックエンド
- LLM呼び出しは非同期処理
- 生成済みコンテンツのキャッシュ
- 並列処理可能な部分は並列化

## 7. セキュリティ

### 7.1 認証・認可
- **データベースアクセス**: SERVICE_ROLE キーを使用（RLS不使用）
- **API認証**: 各APIエンドポイントでUID検証
- ワークフローの所有者確認
- Rate limiting実装

### 7.2 データ保護
- アップロード画像のウイルススキャン
- XSS対策（入力のサニタイズ）
- SQLインジェクション対策（パラメータ化クエリ）
- **セキュリティモデル**: データベースレベルではなく、アプリケーションレベルで認可制御

## 8. モバイル対応

### 8.1 レスポンシブデザイン
- タッチ操作に最適化
- 縦画面での使いやすさ重視
- スワイプでステップ間移動（オプション）

### 8.2 パフォーマンス
- 画像の最適化（WebP形式）
- 低速ネットワーク対応
- オフライン時の一時保存

## 9. 拡張性

### 9.1 将来の機能追加
- テンプレート機能
- 共同編集機能
- バージョン管理
- エクスポート/インポート機能

### 9.2 国際化対応
- 多言語対応の準備
- 日付・時刻のローカライズ
- 通貨表示（将来の有料化に備えて）