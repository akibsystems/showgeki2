# フラットシーン構造 技術仕様書

## 1. データ型定義

### Scene型（新規）

```typescript
// シーンの基本型
interface Scene {
  id: string;              // UUID or nanoid
  order: number;           // 表示順序（1から開始）
  title: string;           // シーンタイトル
  description?: string;    // シーンの説明（オプション）
  
  // 将来の拡張用
  location?: string;       // 場所
  timeOfDay?: string;      // 時間帯
  mood?: string;           // 雰囲気
  duration?: number;       // 推定時間（秒）
}

// シーンリストの管理型
interface SceneListState {
  scenes: Scene[];
  totalScenes: number;
  maxScenes: number;       // 20
  minScenes: number;       // 1
}
```

### WorkflowState.metadataの更新

```typescript
interface WorkflowMetadata {
  // 既存のフィールド...
  
  // シーン管理（新規）
  sceneList?: {
    scenes: Scene[];
    lastModified: string;  // ISO date string
    aiGenerated: boolean;  // AI生成されたかどうか
  };
  
  // 幕構造は削除
  // acts?: Act[]; // 削除
}
```

## 2. Hooks設計

### useSceneManager Hook

```typescript
interface UseSceneManagerReturn {
  scenes: Scene[];
  totalScenes: number;
  
  // CRUD操作
  addScene: () => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  deleteScene: (id: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  
  // バリデーション
  canAddScene: boolean;
  canDeleteScene: boolean;
  
  // ユーティリティ
  generateSceneTitle: (index: number) => string;
  validateScenes: () => boolean;
}

export function useSceneManager(
  initialScenes?: Scene[],
  totalScenes?: number
): UseSceneManagerReturn {
  // 実装...
}
```

## 3. MulmoScriptとの統合

### シーンからBeatへの変換

```typescript
/**
 * UIのシーンをMulmoScriptのbeat形式に変換
 * MulmoScriptは既にフラット構造（beat）を使用
 */
function convertScenesToBeats(scenes: Scene[]): MulmoBeat[] {
  return scenes.map((scene, index) => ({
    beat: scene.order || index + 1,
    title: scene.title,
    description: scene.description,
    // 他のMulmoScriptフィールド（画像、音声など）は別途追加
  }));
}

/**
 * MulmoScriptのbeatからUIのシーンに変換
 */
function convertBeatsToScenes(beats: MulmoBeat[]): Scene[] {
  return beats.map((beat, index) => ({
    id: generateId(),
    order: beat.beat || index + 1,
    title: beat.title || `シーン${index + 1}`,
    description: beat.description,
  }));
}
```

### データ構造の一致

```typescript
// UI上のシーン構造
interface Scene {
  id: string;
  order: number;    // = MulmoScript.beat
  title: string;    // = MulmoScript.title
  description?: string;
}

// MulmoScriptのbeat構造
interface MulmoBeat {
  beat: number;
  title: string;
  description?: string;
  // 追加フィールド（画像、音声など）
}
```

## 4. API更新

### ストーリー更新エンドポイント

```typescript
// PATCH /api/stories/:id
interface UpdateStoryRequest {
  // 既存フィールド...
  
  // workflow_stateの更新
  workflow_state?: {
    metadata?: {
      sceneList?: {
        scenes: Scene[];
        lastModified: string;
        aiGenerated: boolean;
      };
    };
  };
}
```

### AI生成エンドポイント

```typescript
// POST /api/workflow/generate-screenplay
interface GenerateScreenplayRequest {
  story_id: string;
  uid: string;
  
  // シーン情報を含める
  scenes?: {
    count: number;
    titles?: string[];  // ユーザーが設定したタイトル
  };
}
```

## 5. コンポーネント設計

### SceneListStep更新

```typescript
interface SceneListStepProps {
  className?: string;
}

export function SceneListStep({ className }: SceneListStepProps) {
  const { state, updateWorkflowMetadata } = useWorkflow();
  const {
    scenes,
    addScene,
    updateScene,
    deleteScene,
    reorderScenes,
    canAddScene,
    canDeleteScene,
  } = useSceneManager(
    state.workflowMetadata?.sceneList?.scenes,
    state.storyElements?.total_scenes
  );
  
  // ドラッグ&ドロップ、編集UI実装
}
```

### SceneCard コンポーネント

```typescript
interface SceneCardProps {
  scene: Scene;
  index: number;
  onUpdate: (updates: Partial<Scene>) => void;
  onDelete: () => void;
  isDragging?: boolean;
  canDelete: boolean;
}

export function SceneCard({
  scene,
  index,
  onUpdate,
  onDelete,
  isDragging,
  canDelete,
}: SceneCardProps) {
  // カード UI実装
}
```

## 6. 移行計画

### 既存データの扱い

```typescript
/**
 * 既存のMulmoScriptデータは既にbeat形式のため、
 * 移行は必要なく、UIの表示を調整するだけ
 */
function loadExistingBeats(scriptJson: MulmoScript): Scene[] {
  if (!scriptJson.beats) return [];
  
  return scriptJson.beats.map((beat, index) => ({
    id: generateId(),
    order: beat.beat || index + 1,
    title: beat.title || `シーン${index + 1}`,
    description: beat.description,
  }));
}
```

## 7. テスト計画

### ユニットテスト

- Scene CRUD操作のテスト
- MulmoScript変換ロジックのテスト
- バリデーションロジックのテスト

### 統合テスト

- ワークフロー全体でのシーン管理
- AI生成との連携
- データ永続化

### E2Eテスト

- シーンの追加・編集・削除フロー
- ドラッグ&ドロップによる並び替え
- 最大・最小シーン数の制限

## 8. パフォーマンス考慮事項

- 最大20シーンでのレンダリング性能
- ドラッグ&ドロップのスムーズさ
- 自動保存の頻度とタイミング

## 9. アクセシビリティ

- キーボードナビゲーション対応
- スクリーンリーダー対応
- タッチターゲットサイズ（44px以上）