# ScriptDirector V2 実装計画

## 概要
ScriptDirectorを段階的なワークフローベースのシステムにアップデートし、より詳細な制御と編集機能を提供します。

## ワークフローの概要

### ステップ1: ストーリー入力
- 主ストーリー
- ドラマチック転換点
- 未来イメージ
- 学び
- 全体場数設定
→ **AI実行**: キャラクタと幕場構成の初期SCREENPLAY脚本案生成

### ステップ2: 劇的シーン一覧
- 幕と場の構成編集
- シーン順序の変更

### ステップ3: 登場人物・キャラクタ一覧
- キャラクタ情報編集
- 顔画像アップロード機能（特別モード）
→ **AI実行**: シーンごとSCRIPT台本と画像案生成

### ステップ4: 台詞と画像編集
- 各シーンの台詞編集
- シーンごとの画像編集
- CM等追加画像挿入

### ステップ5: 音声・BGM設定
- 音声設定と編集
- BGM選択（シーンごと）
- 音声・音楽アップロード（特別モード）
- 字幕設定
→ **AI実行**: 音付き全体動画生成

## 技術設計

### データモデル拡張

#### 1. stories テーブルの拡張
```typescript
interface StoryExtended {
  // 既存フィールド
  id: string;
  title: string;
  text_raw: string;
  script_json: any;
  
  // 新規フィールド
  story_elements: {
    main_story: string;
    dramatic_turning_point: string;
    future_image: string;
    learnings: string;
    total_scenes: number;
  };
  
  workflow_state: {
    current_step: 1 | 2 | 3 | 4 | 5;
    completed_steps: number[];
    ai_generations: {
      screenplay?: any;
      scene_scripts?: any;
      final_video?: any;
    };
    metadata?: WorkflowMetadata; // 拡張データはここに格納
  };
  
  custom_assets: {
    character_images: { [characterId: string]: string };
    additional_images: { scene_id: string; url: string; type: 'cm' | 'custom' }[];
    custom_audio: { [sceneId: string]: string };
    custom_bgm: { [sceneId: string]: string };
  };
}
```

#### 2. ワークフロー拡張データ
```typescript
// MulmoScriptは外部依存のため拡張せず、別途管理
interface WorkflowMetadata {
  // 幕・場の構成（UI表示用）
  acts: {
    id: string;
    name: string;
    scenes: {
      id: string;
      name: string;
      beatIndices: number[]; // MulmoScriptのbeats配列のインデックス
    }[];
  }[];
  
  // BGM設定（動画生成時に別途処理）
  bgmSettings: {
    [beatIndex: number]: {
      bgmId: string;
      volume: number;
      fadeIn?: number;
      fadeOut?: number;
    };
  };
  
  // 字幕設定（MulmoScriptのcaptionParamsに変換）
  subtitleSettings: {
    enabled: boolean;
    language: 'ja' | 'en';
    style?: any;
  };
}

// 動画生成時の変換関数
interface ScriptConverter {
  // ワークフローデータから標準MulmoScriptに変換
  toMulmoScript(story: StoryExtended): MulmoScript;
  
  // BGM情報を別途処理用に抽出
  extractBGMInstructions(metadata: WorkflowMetadata): BGMInstruction[];
}
```

### UI/UXデザイン

#### レスポンシブデザイン戦略

##### モバイルファーストアプローチ
- **基本設計**: 320px幅から最適化
- **プログレッシブエンハンスメント**: 画面サイズに応じて機能を追加
- **タッチ優先**: 最小タッチターゲット44×44px
- **親指ゾーン最適化**: 重要操作を画面下部に配置

##### ブレークポイント設計
```css
/* モバイル（基本）: 320px - 767px */
/* タブレット: 768px - 1023px */
/* デスクトップ: 1024px - 1439px */
/* ワイドスクリーン: 1440px+ */
```

##### デバイス別最適化
- **モバイル**: シングルカラム、垂直スクロール、スワイプ操作
- **タブレット**: 2カラムレイアウト、タッチ+ペン対応
- **デスクトップ**: マルチカラム、キーボードショートカット、ドラッグ&ドロップ

#### ステップナビゲーション
- **モバイル**: 下部固定タブバー、スワイプで切り替え
- **タブレット**: サイドバー折りたたみ式
- **デスクトップ**: 上部進捗バー + サイドバー常時表示
- **アニメーション**: デバイス性能に応じて調整（prefers-reduced-motion対応）

#### 各ステップのレスポンシブUI

##### 1. ストーリー入力
**モバイル**:
- フルスクリーン入力モード
- ステップ式フォーム（1項目ずつ表示）
- 音声入力オプション
- フローティングアクションボタン

**デスクトップ**:
- 2カラムレイアウト（入力 + プレビュー）
- リアルタイムプレビュー
- キーボードショートカット（Ctrl+Enter で次へ）
- 入力補助サイドパネル

##### 2. シーン一覧
**モバイル**:
- 縦スクロールリスト
- 長押しでドラッグ開始
- スワイプで削除
- 折りたたみ可能なシーン詳細

**デスクトップ**:
- グリッド/リスト切り替え可能
- ドラッグ&ドロップで並び替え
- 複数選択・一括操作
- サイドパネルでクイック編集

##### 3. キャラクタ一覧
**モバイル**:
- 2列グリッド表示
- タップで詳細モーダル
- カメラ直接起動で画像追加
- ピンチズームでプレビュー

**デスクトップ**:
- 4-6列グリッド（画面幅に応じて）
- ホバーで詳細表示
- ドラッグ&ドロップで画像追加
- インライン編集

##### 4. 台詞・画像編集
**モバイル**:
- タブ切り替え（台詞/画像）
- 縦スクロールで全シーン表示
- インライン編集
- フローティングツールバー

**デスクトップ**:
- 分割画面（リサイズ可能）
- 同期スクロール
- マルチモーダル編集
- コンテキストメニュー

##### 5. 音声・BGM設定
**モバイル**:
- 簡易タイムライン表示
- 縦向きリスト形式
- プリセット中心のUI
- ジェスチャーで音量調整

**デスクトップ**:
- フルタイムラインエディタ
- マルチトラック表示
- 波形表示
- 詳細なエフェクト設定

#### クロスデバイス機能

##### デバイス間の連続性
- **クラウド同期**: リアルタイムで作業状態を同期
- **デバイス切り替え通知**: 別デバイスでの編集を検知
- **レスポンシブプレビュー**: 各デバイスでの表示確認

##### アダプティブインターフェース
- **入力方法の自動検出**: タッチ/マウス/ペン/キーボード
- **コンテキスト適応UI**: 使用状況に応じてUI要素を調整
- **パフォーマンス適応**: デバイス性能に応じて機能を調整

##### オフライン対応
- **ローカルストレージ活用**: 作業内容の自動保存
- **Service Worker実装**: オフライン時も基本編集可能
- **同期キュー**: オンライン復帰時に自動同期

### API設計

#### 新規エンドポイント
```typescript
// ステップ1: 初期脚本生成
POST /api/stories/[id]/generate-screenplay
Body: { story_elements }
Response: { screenplay, characters, acts }

// ステップ3: シーン詳細生成
POST /api/stories/[id]/generate-scene-details
Body: { screenplay, characters }
Response: { scene_scripts, image_prompts }

// アセットアップロード
POST /api/stories/[id]/upload-asset
Body: FormData { file, type, metadata }
Response: { url, assetId }

// BGMライブラリ
GET /api/bgm/library
Response: { bgmList }
```

### コンポーネント構造

```
ScriptDirectorV2/
├── index.tsx                     # メインコンテナ
├── components/
│   ├── StepNavigation.tsx       # ステップナビゲーション
│   ├── steps/
│   │   ├── Step1StoryInput.tsx  # ストーリー入力
│   │   ├── Step2SceneList.tsx   # シーン一覧
│   │   ├── Step3Characters.tsx  # キャラクタ一覧
│   │   ├── Step4Dialogue.tsx    # 台詞・画像編集
│   │   └── Step5AudioBGM.tsx    # 音声・BGM設定
│   ├── editors/
│   │   ├── CharacterEditor.tsx  # キャラクタ編集モーダル
│   │   ├── SceneEditor.tsx      # シーン編集モーダル
│   │   ├── DialogueEditor.tsx   # 台詞編集
│   │   ├── ImageEditor.tsx      # 画像編集
│   │   └── AudioTimeline.tsx    # 音声タイムライン
│   ├── common/
│   │   ├── AssetUploader.tsx    # アセットアップローダー
│   │   ├── BGMSelector.tsx      # BGM選択
│   │   ├── AIGenerationStatus.tsx # AI生成状態表示
│   │   └── ResponsiveContainer.tsx # レスポンシブコンテナ
│   └── responsive/
│       ├── MobileNavigation.tsx  # モバイル用ナビゲーション
│       ├── TabletSidebar.tsx     # タブレット用サイドバー
│       ├── DesktopLayout.tsx     # デスクトップレイアウト
│       ├── TouchGestures.tsx     # タッチジェスチャー処理
│       └── DeviceDetector.tsx    # デバイス検出
├── hooks/
│   ├── useWorkflowState.ts      # ワークフロー状態管理
│   ├── useAssetManager.ts       # アセット管理
│   ├── useAIGeneration.ts       # AI生成処理
│   ├── useBGMLibrary.ts         # BGMライブラリ
│   ├── useResponsive.ts         # レスポンシブ状態管理
│   ├── useDeviceCapabilities.ts # デバイス機能検出
│   └── useOfflineSync.ts        # オフライン同期
├── styles/
│   ├── breakpoints.css          # ブレークポイント定義
│   ├── mobile.module.css        # モバイル専用スタイル
│   ├── tablet.module.css        # タブレット専用スタイル
│   └── desktop.module.css       # デスクトップ専用スタイル
├── utils/
│   ├── responsive.ts            # レスポンシブユーティリティ
│   ├── touch.ts                 # タッチ操作ユーティリティ
│   └── performance.ts           # パフォーマンス最適化
└── types/
    ├── workflow.types.ts         # 型定義
    └── responsive.types.ts       # レスポンシブ関連型定義
```

## レスポンシブ実装アプローチ

### 技術スタック
- **CSS**: CSS Modules + Tailwind CSS（カスタムブレークポイント）
- **状態管理**: React Context（デバイス状態）+ Zustand（オフライン対応）
- **ジェスチャー**: react-use-gesture
- **デバイス検出**: react-device-detect + カスタムフック
- **PWA**: next-pwa（オフライン対応）

### レスポンシブ設計原則
1. **コンテンツ優先**: 重要な情報を最初に表示
2. **プログレッシブディスクロージャー**: 段階的に詳細を表示
3. **コンテキスト保持**: デバイス間で作業状態を維持
4. **適応的複雑性**: デバイスに応じて機能を調整

### パフォーマンス戦略
- **コード分割**: デバイス別のコンポーネント遅延読み込み
- **画像最適化**: srcset + 画像フォーマット自動選択
- **キャッシュ戦略**: Service Worker + SWR
- **バンドル最適化**: デバイス別のバンドル生成

## 実装の優先順位

### Phase 1: 基盤構築（1-2週間）
1. データモデル拡張（マイグレーション）
2. ワークフロー状態管理の実装
3. レスポンシブ基盤の構築
   - ブレークポイントシステム
   - デバイス検出フック
   - レスポンシブコンテナ

### Phase 2: コア機能（2-3週間）
1. ステップ1（ストーリー入力）実装
   - モバイル/デスクトップレイアウト
   - 音声入力対応
2. ステップ2（シーン一覧）実装
   - タッチジェスチャー対応
   - レスポンシブグリッド
3. ステップ3（キャラクタ一覧）実装
   - 適応的グリッドレイアウト
   - カメラ統合（モバイル）
4. AI生成APIの実装

### Phase 3: 高度な編集機能（2-3週間）
1. ステップ4（台詞・画像編集）実装
   - レスポンシブ分割画面
   - タッチ最適化エディタ
2. ステップ5（音声・BGM設定）実装
   - 適応的タイムライン
   - モバイル簡易モード
3. アセットアップロード機能
   - ドラッグ&ドロップ（デスクトップ）
   - カメラ/ギャラリー統合（モバイル）

### Phase 4: 統合とテスト（1-2週間）
1. 既存システムとの統合
2. クロスデバイステスト
   - 実機テスト（iOS/Android）
   - ブラウザ互換性テスト
3. パフォーマンス最適化
   - レスポンシブ画像最適化
   - 遅延読み込み実装
4. PWA実装
   - Service Worker設定
   - オフライン機能実装

## リスクと対策

### 技術的リスク
1. **データ移行の複雑性**
   - 対策: 後方互換性を保ちながら段階的に移行

2. **AI生成の段階化による処理時間増加**
   - 対策: 各段階の結果をキャッシュ、並行処理

3. **大容量ファイルアップロード**
   - 対策: チャンクアップロード、プログレッシブ処理

4. **MulmoScript互換性の維持**
   - リスク: 外部依存のmulmocast-cliとの互換性破壊
   - 対策: 
     - MulmoScript形式は変更せず、拡張データは別管理
     - 動画生成時に標準形式に変換
     - BGMや特殊効果は別プロセスで処理

### UXリスク
1. **ワークフローの複雑化**
   - 対策: スキップ機能、デフォルト値の提供

2. **既存ユーザーへの影響**
   - 対策: クラシックモードの維持オプション

## 成功指標

1. **機能完成度**
   - 全5ステップの実装完了
   - AI生成の各段階での成功率 > 95%
   - 全デバイスでの機能動作保証

2. **ユーザビリティ**
   - 各ステップの完了時間 < 5分
   - エラー率 < 5%
   - モバイルでのタスク完了率 > 90%
   - タッチ操作の精度 > 95%

3. **パフォーマンス**
   - ステップ間の遷移 < 1秒
   - AI生成レスポンス < 30秒
   - モバイルでの初回ロード < 3秒
   - タブレット/デスクトップでの初回ロード < 2秒

4. **レスポンシブ品質**
   - 全ブレークポイントでのレイアウト崩れゼロ
   - デバイス切り替え時のデータ保持率 100%
   - オフライン時の基本機能動作率 > 80%
   - アクセシビリティスコア > 95

## 次のステップ

1. このプランのレビューと承認
2. データベースマイグレーションの作成
3. UIモックアップの作成
4. Phase 1の実装開始