# 脚本コピー機能 実装プラン

## 概要
動画生成済みの脚本をコピーして、新たに動画生成に使用できるようにする機能を追加する。

## 現状分析

### 脚本一覧画面
- **ファイルパス**: `/src/app/stories/page.tsx`
- **URL**: `/stories`
- **データ取得**: `useStories()` フックを使用（SWRベース）

### 脚本のステータスフロー
```
draft → script_generated → processing → completed
                                    ↓ (エラー時)
                                   error
```

### 動画生成済みの判定
- `story.status === 'completed'` で判定
- 動画データは別テーブル（`videos`）で管理

## 実装方針

### 1. コピー機能の仕様
- **対象**: ステータスが `completed`（動画生成済み）の脚本のみ
- **コピー内容**:
  - `title` → `{元のタイトル} (コピー)`
  - `text_raw` → そのままコピー
  - `script_json` → そのままコピー
  - `beats` → そのままコピー
  - `status` → `script_generated`（新規として扱い、即座に動画生成可能）
- **コピー後の動作**: 新しい脚本の編集画面へ自動遷移

### 2. API設計

#### エンドポイント
```
POST /api/stories/[id]/copy
```

#### リクエスト
```typescript
{
  // 本文なし（認証ヘッダーのみ）
}
```

#### レスポンス
```typescript
{
  success: true,
  data: {
    story: Story // 新しく作成された脚本
  }
}
```

### 3. UI/UX設計

#### コピーボタンの配置
脚本カード内に「コピー」アイコンボタンを追加（編集画面へのリンクの隣）

```
[脚本カード]
┌─────────────────────────────┐
│ タイトル                     │
│ ステータス: 完了              │
│                             │
│ [詳細を見る] [📋 コピー]      │
└─────────────────────────────┘
```

#### コピー時の動作
1. コピーボタンクリック
2. 確認モーダル表示（オプション）
3. API呼び出し（ローディング表示）
4. 成功時：新しい脚本の編集画面へ遷移
5. エラー時：エラーメッセージ表示

### 4. 実装詳細

#### フロントエンド

##### 1. `useStories` フックの拡張
```typescript
// /src/hooks/useStories.ts
const copyStory = async (storyId: string) => {
  const response = await fetch(`/api/stories/${storyId}/copy`, {
    method: 'POST',
    headers: {
      'X-User-UID': uid,
    },
  });
  
  if (!response.ok) throw new Error('Failed to copy story');
  
  const result = await response.json();
  // SWRキャッシュを更新
  mutate();
  
  return result.data.story;
};
```

##### 2. 脚本カードコンポーネントの更新
```typescript
// StoryCard コンポーネントに追加
const handleCopy = async () => {
  setIsCopying(true);
  try {
    const newStory = await copyStory(story.id);
    router.push(`/stories/${newStory.id}?tab=content`);
  } catch (error) {
    showError('脚本のコピーに失敗しました');
  } finally {
    setIsCopying(false);
  }
};
```

#### バックエンド

##### 1. APIルートの実装
```typescript
// /src/app/api/stories/[id]/copy/route.ts
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: storyId } = await context.params;
  const auth = await getAuth(request);
  
  // 元の脚本を取得
  const originalStory = await getStory(storyId, auth.uid);
  
  // 新しい脚本を作成
  const newStory = {
    workspace_id: originalStory.workspace_id,
    uid: auth.uid,
    title: `${originalStory.title} (コピー)`,
    text_raw: originalStory.text_raw,
    script_json: originalStory.script_json,
    status: 'script_generated',
    beats: originalStory.beats,
  };
  
  const { data, error } = await supabase
    .from('stories')
    .insert(newStory)
    .select()
    .single();
  
  return NextResponse.json({ success: true, data: { story: data } });
}
```

### 5. テスト計画

#### 単体テスト
- [ ] APIエンドポイントのテスト
- [ ] フックのコピー機能テスト
- [ ] エラーハンドリングのテスト

#### 統合テスト
- [ ] 脚本コピーから編集画面遷移までのフロー
- [ ] 権限チェック（他ユーザーの脚本をコピーできないこと）
- [ ] SWRキャッシュの更新確認

#### E2Eテスト
- [ ] 完了済み脚本のコピー → 新規動画生成
- [ ] エラー時の表示確認

### 6. セキュリティ考慮事項

- ユーザーは自分の脚本のみコピー可能（uid確認）
- レート制限の実装（必要に応じて）
- 入力値のサニタイズ（タイトルの長さ制限など）

### 7. 今後の拡張可能性

- コピー時のオプション（タイトルのカスタマイズ、一部要素のみコピーなど）
- バッチコピー機能
- テンプレートとして保存する機能

## 実装順序

1. **APIエンドポイントの実装**（`/api/stories/[id]/copy`）
2. **`useStories` フックの拡張**（`copyStory` 関数の追加）
3. **脚本一覧画面のUI更新**（コピーボタンの追加）
4. **エラーハンドリングとローディング状態の実装**
5. **テストの作成と実行**

## 推定作業時間

- API実装: 1時間
- フロントエンド実装: 2時間
- テスト作成: 1時間
- **合計: 約4時間**