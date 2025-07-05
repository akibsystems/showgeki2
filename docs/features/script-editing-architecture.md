# 台本編集画面 アーキテクチャドキュメント

## 概要

showgeki2の台本編集画面は、ストーリーから生成されたMulmoScript形式の台本を編集するための統合環境です。JSON形式の編集とビジュアルエディタ（ScriptDirector）の2つの編集方式を提供し、ユーザーが好みの方法で台本を編集できます。

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                   ストーリー編集ページ                        │
│                  /stories/[id]/page.tsx                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ タブ1:      │  │ タブ2:       │  │ タブ3:          │  │
│  │ ストーリー   │  │ 台本内容     │  │ シーン編集      │  │
│  │ (基本情報)   │  │ (JSON/Visual)│  │ (プレビュー)    │  │
│  └─────────────┘  └──────────────┘  └─────────────────┘  │
│                           │                                 │
│                    ┌──────┴──────┐                        │
│                    │             │                         │
│           ┌────────▼───┐ ┌──────▼──────┐                │
│           │ ScriptEditor│ │ScriptDirector│                │
│           │  (JSON編集) │ │(ビジュアル編集)│               │
│           └────────────┘ └──────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## 主要コンポーネント

### 1. ストーリー編集ページ (`/stories/[id]/page.tsx`)

**責務**: 
- ストーリー編集の統合環境を提供
- タブによる編集モードの切り替え
- データの取得と保存の管理

**主要な機能**:
- 3つのタブ（ストーリー、台本内容、シーン編集）
- 台本の生成・再生成
- 動画の生成リクエスト
- 編集内容の自動保存

### 2. ScriptEditor コンポーネント

**責務**: JSON形式での台本編集

**機能**:
- Monaco Editorを使用したJSON編集
- シンタックスハイライト
- バリデーション
- フォーマット機能

**実装**:
```typescript
interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onError?: (error: Error) => void;
}
```

### 3. ScriptDirector コンポーネント

**責務**: ビジュアル形式での台本編集

**機能**:
- タイトル編集
- 画像設定（スタイル、顔参照）
- スピーカー管理
- シーン（Beat）編集

**詳細**: [ScriptDirector実装詳細](./script-director-implementation.md)を参照

## データフロー

### 1. 初期データ読み込み

```
ユーザーアクセス
    ↓
stories/[id] APIを呼び出し
    ↓
script_jsonフィールドを取得
    ↓
編集モードに応じて表示
```

### 2. 編集と保存

```
ユーザー編集
    ↓
onChange イベント
    ↓
ローカルstate更新
    ↓
デバウンス処理（500ms）
    ↓
API経由でSupabaseに保存
```

### 3. 台本生成フロー

```
「台本を作成」ボタン
    ↓
/api/stories/[id]/generate-script
    ↓
OpenAI API (GPT-4)
    ↓
MulmoScript形式に変換
    ↓
script_jsonフィールドを更新
    ↓
UIに反映
```

## 状態管理

### 1. SWRによるデータ管理

```typescript
const { data: story, mutate } = useSWR(
  `/api/stories/${id}`,
  fetcher,
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  }
);
```

### 2. ローカル状態管理

```typescript
// 編集中のスクリプト
const [localScript, setLocalScript] = useState(story?.script_json);

// 保存状態
const [isSaving, setIsSaving] = useState(false);

// エラー状態
const [error, setError] = useState<Error | null>(null);
```

## 編集モードの切り替え

### 1. JSON編集モード

- 上級ユーザー向け
- 完全な制御が可能
- バリデーションエラーの即座のフィードバック

### 2. ビジュアル編集モード（ScriptDirector）

- 初心者向け
- 直感的なUI
- プレビュー機能付き
- 入力制限による安全性

## エラーハンドリング

### 1. バリデーションエラー

```typescript
try {
  const parsed = JSON.parse(scriptJson);
  validateMulmoScript(parsed);
} catch (error) {
  showError('無効な台本形式です');
}
```

### 2. API エラー

```typescript
catch (error) {
  if (error.status === 429) {
    showError('リクエストが多すぎます');
  } else {
    showError('保存に失敗しました');
  }
}
```

## パフォーマンス最適化

### 1. デバウンス処理

```typescript
const debouncedSave = useMemo(
  () => debounce(saveScript, 500),
  []
);
```

### 2. 最適化されたレンダリング

```typescript
const ScriptEditor = memo(({ value, onChange }) => {
  // Monaco Editorの遅延ロード
  const [editor, setEditor] = useState(null);
  
  useEffect(() => {
    import('@monaco-editor/react').then((monaco) => {
      setEditor(monaco.default);
    });
  }, []);
});
```

## セキュリティ考慮事項

### 1. 入力検証

- XSS対策: DOMPurifyによるサニタイゼーション
- SQLインジェクション対策: Supabaseのプリペアドステートメント
- 最大サイズ制限: 100KB

### 2. 認証・認可

- すべての編集操作にuid確認
- Row Level Securityによるアクセス制御

## 今後の拡張予定

1. **リアルタイムコラボレーション**
   - Supabase Realtimeを使用した共同編集

2. **バージョン管理**
   - 編集履歴の保存と復元

3. **AIアシスタント**
   - シーン提案機能
   - 対話改善提案

4. **プレビュー機能の強化**
   - 部分的な動画プレビュー
   - 音声のみのプレビュー