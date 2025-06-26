# Showgeki2 単体テスト実装チェックリスト

## 概要

このチェックリストはshowgeki2プロジェクトの単体テスト実装を段階的に進めるためのガイドです。優先度順に整理されており、基盤機能から順次実装することで効率的にテストカバレッジを向上させます。

## 実装フェーズと優先度

**凡例:**
- 🔴 **Critical**: 他の機能をブロックする重要なテスト
- 🟡 **High**: 主要機能のテスト
- 🟢 **Medium**: 機能強化・UX改善のテスト
- 🔵 **Low**: 最適化・将来的な拡張のテスト

**推定工数**: S(1-2h), M(0.5-1d), L(1-2d), XL(2-3d)

---

## Phase 1: 基盤機能テスト 🏗️

### 1.1 Zod スキーマバリデーション

#### ✅ schemas.test.ts
- **ファイル**: `tests/unit/lib/schemas.test.ts`
- **優先度**: 🔴 Critical
- **工数**: M
- **依存**: なし

**テスト項目:**
- [ ] **UidSchema**
  - [ ] 有効なUUID形式の検証
  - [ ] 無効なUUID形式の拒否
  - [ ] null/undefinedの処理
  - [ ] 空文字列の処理
  
- [ ] **WorkspaceSchema**
  - [ ] 完全なワークスペースオブジェクトの検証
  - [ ] 必須フィールドの欠落検出
  - [ ] name フィールドの長さ制限
  - [ ] 不正な型の拒否

- [ ] **StorySchema**
  - [ ] 完全なストーリーオブジェクトの検証
  - [ ] status enum の検証 ('draft', 'script_generated', 'processing', 'completed', 'error')
  - [ ] title/text_raw の文字数制限
  - [ ] script_json のオプショナル処理
  - [ ] created_at/updated_at の日時形式

- [ ] **VideoSchema**
  - [ ] 完全な動画オブジェクトの検証
  - [ ] status enum の検証 ('queued', 'processing', 'completed', 'failed')
  - [ ] duration_sec の正数制限
  - [ ] size_mb の正数制限
  - [ ] url のURL形式検証

- [ ] **MulmoscriptSchema**
  - [ ] scenes 配列の検証
  - [ ] scene 要素の必須フィールド
  - [ ] metadata の完全性
  - [ ] 不正なJSON構造の拒否

**実装例:**
```typescript
// tests/unit/lib/schemas.test.ts
import { describe, it, expect } from 'vitest'
import { UidSchema, StorySchema, VideoSchema } from '@/lib/schemas'

describe('UidSchema', () => {
  it('validates correct UUID', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'
    expect(UidSchema.parse(validUuid)).toBe(validUuid)
  })

  it('rejects invalid UUID format', () => {
    expect(() => UidSchema.parse('invalid-uuid')).toThrow()
    expect(() => UidSchema.parse('123')).toThrow()
    expect(() => UidSchema.parse('')).toThrow()
  })
})
```

### 1.2 UID管理機能

#### ✅ uid.test.ts
- **ファイル**: `tests/unit/lib/uid.test.ts`
- **優先度**: 🔴 Critical
- **工数**: S
- **依存**: なし

**テスト項目:**
- [ ] **getOrCreateUid()**
  - [ ] 新規UID生成 (localStorage空の場合)
  - [ ] 既存UID取得 (localStorage にデータがある場合)
  - [ ] UUID形式の検証
  - [ ] localStorage への保存確認
  - [ ] SSR 環境での動作 (window undefined)

- [ ] **clearUid()**
  - [ ] localStorage からの削除確認
  - [ ] SSR 環境での安全な動作

- [ ] **isValidUid()**
  - [ ] 有効なUID判定
  - [ ] 無効なUID判定
  - [ ] null/undefined の処理

**実装例:**
```typescript
// tests/unit/lib/uid.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getOrCreateUid, clearUid, isValidUid } from '@/lib/uid'

// localStorage モック
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('UID Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrCreateUid', () => {
    it('creates new UID when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const uid = getOrCreateUid()
      
      expect(uid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('showgeki_uid', uid)
    })

    it('returns existing UID from localStorage', () => {
      const existingUid = '123e4567-e89b-12d3-a456-426614174000'
      mockLocalStorage.getItem.mockReturnValue(existingUid)
      
      const uid = getOrCreateUid()
      
      expect(uid).toBe(existingUid)
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })
  })
})
```

### 1.3 認証機能

#### ✅ auth.test.ts
- **ファイル**: `tests/unit/lib/auth.test.ts`
- **優先度**: 🔴 Critical
- **工数**: M
- **依存**: uid.ts

**テスト項目:**
- [ ] **extractUid()**
  - [ ] ヘッダーからUID抽出
  - [ ] クエリパラメータからUID抽出
  - [ ] UID不存在時のエラー
  - [ ] 無効UID形式のエラー
  - [ ] 優先順位 (header > query)

- [ ] **validateUid()**
  - [ ] 有効UIDの検証通過
  - [ ] 無効UIDの検証失敗
  - [ ] エラーメッセージの確認

- [ ] **withAuth() ミドルウェア**
  - [ ] 認証成功時の処理継続
  - [ ] 認証失敗時のエラーレスポンス
  - [ ] AuthContext の正確な設定

**実装例:**
```typescript
// tests/unit/lib/auth.test.ts
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { extractUid, validateUid } from '@/lib/auth'

describe('Auth Module', () => {
  describe('extractUid', () => {
    it('extracts UID from header', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: { 'x-uid': '123e4567-e89b-12d3-a456-426614174000' }
      })
      
      const uid = extractUid(request)
      expect(uid).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('throws error when UID is missing', () => {
      const request = new NextRequest('http://localhost/test')
      
      expect(() => extractUid(request)).toThrow('UID is required')
    })
  })
})
```

---

## Phase 2: コア機能テスト ⚙️

### 2.1 API クライアント

#### ✅ api-client.test.ts
- **ファイル**: `tests/unit/lib/api-client.test.ts`
- **優先度**: 🟡 High
- **工数**: L
- **依存**: uid.ts, schemas.ts

**テスト項目:**
- [ ] **ApiClient クラス基本機能**
  - [ ] インスタンス化
  - [ ] ベースURL設定
  - [ ] ヘッダー自動設定

- [ ] **request() メソッド**
  - [ ] GET リクエスト
  - [ ] POST リクエスト
  - [ ] PUT リクエスト
  - [ ] DELETE リクエスト
  - [ ] 自動UID付与
  - [ ] エラーハンドリング
  - [ ] レスポンス JSON パース

- [ ] **ワークスペース API**
  - [ ] getWorkspaces()
  - [ ] createWorkspace()
  - [ ] updateWorkspace()
  - [ ] deleteWorkspace()

- [ ] **ストーリー API**
  - [ ] getStories()
  - [ ] createStory()
  - [ ] updateStory()
  - [ ] deleteStory()
  - [ ] generateScript()

- [ ] **動画 API**
  - [ ] getVideos()
  - [ ] getVideoStatus()
  - [ ] generateVideo()

**実装例:**
```typescript
// tests/unit/lib/api-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/lib/api-client'

// UID管理モック
vi.mock('@/lib/uid', () => ({
  getOrCreateUid: vi.fn(() => 'test-uid-123'),
}))

describe('API Client', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  describe('getWorkspaces', () => {
    it('fetches workspaces with correct headers', async () => {
      const mockResponse = { success: true, data: [] }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await apiClient.getWorkspaces()

      expect(fetch).toHaveBeenCalledWith('/api/workspaces', {
        headers: {
          'Content-Type': 'application/json',
          'x-uid': 'test-uid-123',
        },
      })
    })
  })
})
```

### 2.2 基本UIコンポーネント

#### ✅ button.test.tsx
- **ファイル**: `tests/unit/components/ui/button.test.tsx`
- **優先度**: 🟡 High
- **工数**: S
- **依存**: なし

**テスト項目:**
- [ ] **レンダリング**
  - [ ] テキスト表示
  - [ ] children プロパティ
  - [ ] className 適用

- [ ] **バリアント**
  - [ ] primary スタイル
  - [ ] secondary スタイル
  - [ ] danger スタイル
  - [ ] デフォルトスタイル

- [ ] **状態**
  - [ ] disabled 状態
  - [ ] loading 状態
  - [ ] アクティブ状態

- [ ] **イベント**
  - [ ] onClick ハンドラー
  - [ ] クリック時のコールバック実行
  - [ ] disabled 時のクリック無効

**実装例:**
```typescript
// tests/unit/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

#### ✅ modal.test.tsx
- **ファイル**: `tests/unit/components/ui/modal.test.tsx`
- **優先度**: 🟡 High
- **工数**: M
- **依存**: なし

**テスト項目:**
- [ ] **表示制御**
  - [ ] isOpen プロパティでの表示/非表示
  - [ ] onClose コールバック
  - [ ] ESC キーでのクローズ
  - [ ] オーバーレイクリックでのクローズ

- [ ] **コンテンツ**
  - [ ] title プロパティ表示
  - [ ] children 内容表示
  - [ ] フッターボタン

- [ ] **アクセシビリティ**
  - [ ] フォーカス管理
  - [ ] ARIA 属性
  - [ ] キーボードナビゲーション

#### ✅ toast.test.tsx
- **ファイル**: `tests/unit/components/ui/toast.test.tsx`
- **優先度**: 🟡 High  
- **工数**: M
- **依存**: ToastContext

**テスト項目:**
- [ ] **通知タイプ**
  - [ ] success 通知
  - [ ] error 通知
  - [ ] warning 通知
  - [ ] info 通知

- [ ] **表示制御**
  - [ ] 自動消失タイマー
  - [ ] 手動クローズ
  - [ ] 複数通知の管理

---

## Phase 3: 特殊機能テスト 🎯

### 3.1 エディター機能

#### ✅ monaco-editor.test.tsx
- **ファイル**: `tests/unit/components/editor/monaco-editor.test.tsx`
- **優先度**: 🟢 Medium
- **工数**: L
- **依存**: Monaco Editor

**テスト項目:**
- [ ] **基本機能**
  - [ ] エディター初期化
  - [ ] value プロパティ設定
  - [ ] onChange コールバック
  - [ ] 言語設定 (JSON)

- [ ] **バリデーション**
  - [ ] JSON 構文エラー表示
  - [ ] リアルタイム検証
  - [ ] エラーマーカー表示

- [ ] **操作機能**
  - [ ] フォーマット機能
  - [ ] リサイズ対応
  - [ ] テーマ設定

**実装例:**
```typescript
// tests/unit/components/editor/monaco-editor.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MonacoEditor } from '@/components/editor/monaco-editor'

// Monaco Editor モック
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ value, onChange }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )),
}))

describe('Monaco Editor Component', () => {
  it('renders with initial value', () => {
    const initialValue = '{"test": "value"}'
    render(<MonacoEditor value={initialValue} />)
    
    expect(screen.getByDisplayValue(initialValue)).toBeInTheDocument()
  })
})
```

#### ✅ script-editor.test.tsx
- **ファイル**: `tests/unit/components/editor/script-editor.test.tsx`
- **優先度**: 🟢 Medium
- **工数**: L
- **依存**: MonacoEditor

**テスト項目:**
- [ ] **モード切替**
  - [ ] Visual モード表示
  - [ ] Code モード表示
  - [ ] モード間の切替

- [ ] **Visual モード**
  - [ ] シーン一覧表示
  - [ ] シーン追加/削除
  - [ ] シーン編集
  - [ ] メタデータ編集

- [ ] **Code モード**
  - [ ] Monaco Editor 統合
  - [ ] JSON 同期
  - [ ] バリデーション

### 3.2 動画機能

#### ✅ video-player.test.tsx
- **ファイル**: `tests/unit/components/video/video-player.test.tsx`
- **優先度**: 🟢 Medium
- **工数**: L
- **依存**: なし

**テスト項目:**
- [ ] **基本再生機能**
  - [ ] 動画読み込み
  - [ ] 再生/停止
  - [ ] シーク操作
  - [ ] 音量制御

- [ ] **UI コントロール**
  - [ ] カスタムコントロール表示
  - [ ] プログレスバー
  - [ ] 時間表示
  - [ ] フルスクリーン

- [ ] **エラーハンドリング**
  - [ ] 動画読み込みエラー
  - [ ] ネットワークエラー
  - [ ] フォーマット未対応

**実装例:**
```typescript
// tests/unit/components/video/video-player.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { VideoPlayer } from '@/components/video/video-player'

describe('Video Player Component', () => {
  it('renders video element with correct src', () => {
    const videoUrl = 'https://example.com/video.mp4'
    render(<VideoPlayer src={videoUrl} />)
    
    const video = screen.getByTestId('video-element')
    expect(video).toHaveAttribute('src', videoUrl)
  })

  it('plays video when play button is clicked', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer src="test.mp4" />)
    
    const playButton = screen.getByTestId('play-button')
    await user.click(playButton)
    
    // Video play状態の検証
    const video = screen.getByTestId('video-element')
    expect(video).toHaveProperty('paused', false)
  })
})
```

#### ✅ video-thumbnail.test.tsx
- **ファイル**: `tests/unit/components/video/video-thumbnail.test.tsx`
- **優先度**: 🟢 Medium
- **工数**: M
- **依存**: Canvas API

**テスト項目:**
- [ ] **サムネイル生成**
  - [ ] Canvas API 使用
  - [ ] 動画フレーム取得
  - [ ] 画像変換
  - [ ] キャッシュ機能

- [ ] **エラーハンドリング**
  - [ ] 動画読み込み失敗
  - [ ] Canvas 未対応環境
  - [ ] フォールバック画像

---

## Phase 4: API Routes テスト 🌐

### 4.1 ワークスペース API

#### ✅ workspaces.api.test.ts
- **ファイル**: `tests/unit/api/workspaces.test.ts`
- **優先度**: 🟡 High
- **工数**: L
- **依存**: auth.ts, schemas.ts

**テスト項目:**
- [ ] **GET /api/workspaces**
  - [ ] 認証済みユーザーのワークスペース一覧
  - [ ] 空のワークスペースリスト
  - [ ] 認証エラー処理
  - [ ] データベースエラー処理

- [ ] **POST /api/workspaces**
  - [ ] 新規ワークスペース作成
  - [ ] バリデーションエラー
  - [ ] 重複名エラー
  - [ ] 作成成功レスポンス

### 4.2 ストーリー API

#### ✅ stories.api.test.ts
- **ファイル**: `tests/unit/api/stories.test.ts`
- **優先度**: 🟡 High
- **工数**: XL
- **依存**: auth.ts, schemas.ts

**テスト項目:**
- [ ] **GET /api/stories**
  - [ ] ストーリー一覧取得
  - [ ] ページネーション
  - [ ] フィルタリング
  - [ ] ソート機能

- [ ] **POST /api/stories**
  - [ ] 新規ストーリー作成
  - [ ] 必須フィールド検証
  - [ ] ワークスペース存在確認

- [ ] **PUT /api/stories/[id]**
  - [ ] ストーリー更新
  - [ ] 権限チェック
  - [ ] 楽観的ロック

- [ ] **DELETE /api/stories/[id]**
  - [ ] ストーリー削除
  - [ ] 関連データ削除
  - [ ] 権限チェック

### 4.3 動画生成 API

#### ✅ generate-video.api.test.ts
- **ファイル**: `tests/unit/api/generate-video.test.ts`
- **優先度**: 🟡 High
- **工数**: L
- **依存**: auth.ts, webhook機能

**テスト項目:**
- [ ] **POST /api/stories/[id]/generate-video**
  - [ ] 動画生成開始
  - [ ] 重複リクエスト処理
  - [ ] webhook呼び出し
  - [ ] エラーハンドリング

---

## Phase 5: 状態管理テスト 🔄

### 5.1 Context テスト

#### ✅ app-context.test.tsx
- **ファイル**: `tests/unit/contexts/app-context.test.tsx`
- **優先度**: 🔵 Low
- **工数**: M
- **依存**: uid.ts

**テスト項目:**
- [ ] **AppProvider**
  - [ ] 初期状態設定
  - [ ] UID管理
  - [ ] ワークスペース状態
  - [ ] 状態更新機能

### 5.2 カスタムフック

#### ✅ use-stories.test.ts
- **ファイル**: `tests/unit/hooks/use-stories.test.ts`
- **優先度**: 🔵 Low
- **工数**: M
- **依存**: SWR, api-client.ts

**テスト項目:**
- [ ] **useStories フック**
  - [ ] データフェッチング
  - [ ] キャッシュ管理
  - [ ] エラーハンドリング
  - [ ] 再取得機能

---

## 実装順序と依存関係

### 推奨実装順序

1. **Phase 1** → **Phase 2.1** → **Phase 2.2** 
2. **Phase 3** → **Phase 4**
3. **Phase 5**

### 依存関係マップ

```
schemas.test.ts (基盤)
    ↓
uid.test.ts → auth.test.ts → api-client.test.ts
    ↓              ↓              ↓
button.test.tsx   API Routes    Context Tests
    ↓
Editor/Video Components
```

## 実装メトリクス目標

| メトリクス | 目標値 |
|-----------|-------|
| **テストカバレッジ** | 80%以上 |
| **ブランチカバレッジ** | 70%以上 |
| **テスト実行時間** | 30秒以内 |
| **テスト成功率** | 95%以上 |

## 完了チェック

### Phase 1 完了条件
- [ ] schemas.test.ts 実装完了
- [ ] uid.test.ts 実装完了  
- [ ] auth.test.ts 実装完了
- [ ] 全テスト通過
- [ ] カバレッジ 80% 達成

### Phase 2 完了条件
- [ ] api-client.test.ts 実装完了
- [ ] UI コンポーネント テスト完了
- [ ] 全テスト通過
- [ ] カバレッジ維持

### 最終完了条件
- [ ] 全フェーズのテスト実装完了
- [ ] CI/CD パイプライン統合
- [ ] ドキュメント更新
- [ ] チーム内レビュー完了

---

このチェックリストに従って実装することで、showgeki2プロジェクトの品質を段階的かつ確実に向上させることができます。