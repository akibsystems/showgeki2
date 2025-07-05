# ScriptDirector 実装詳細ドキュメント

## 概要

ScriptDirectorは、MulmoScript形式の台本を視覚的に編集するためのReactコンポーネントです。JSON編集の代替として、直感的なUIで台本の各要素を編集できます。

## コンポーネント構造

```
ScriptDirector/
├── index.tsx                 # メインコンポーネント
├── hooks/
│   ├── useScriptDirector.ts  # 状態管理
│   ├── useSpeakerManager.ts  # スピーカー管理
│   ├── useBeatsManager.ts    # シーン管理
│   └── useImageManager.ts    # 画像設定管理
├── components/
│   ├── TitleEditor.tsx       # タイトル編集
│   ├── ImageSettings.tsx     # 画像設定
│   ├── SpeechSettings.tsx    # 音声設定
│   ├── BeatsEditor.tsx       # シーン編集
│   ├── SpeakerModal.tsx      # スピーカー編集モーダル
│   └── ImageModal.tsx        # 画像参照モーダル
└── ScriptDirector.module.css # スタイリング
```

## 主要なカスタムフック

### 1. useScriptDirector

**責務**: メインの状態管理とタブ切り替え

```typescript
interface UseScriptDirectorReturn {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  script: MulmoScript;
  updateScript: (updates: Partial<MulmoScript>) => void;
  hasChanges: boolean;
  resetChanges: () => void;
}

export const useScriptDirector = (
  initialScript: MulmoScript,
  onChange: (script: MulmoScript) => void
): UseScriptDirectorReturn => {
  const [activeTab, setActiveTab] = useState<TabType>('title');
  const [script, setScript] = useState(initialScript);
  const [originalScript] = useState(initialScript);
  
  const updateScript = useCallback((updates: Partial<MulmoScript>) => {
    const newScript = { ...script, ...updates };
    setScript(newScript);
    onChange(newScript);
  }, [script, onChange]);
  
  const hasChanges = useMemo(() => 
    JSON.stringify(script) !== JSON.stringify(originalScript),
    [script, originalScript]
  );
  
  return {
    activeTab,
    setActiveTab,
    script,
    updateScript,
    hasChanges,
    resetChanges: () => setScript(originalScript)
  };
};
```

### 2. useSpeakerManager

**責務**: スピーカーの追加・編集・削除

```typescript
interface Speaker {
  voiceId: string;
  displayName: {
    ja: string;
    en: string;
  };
}

export const useSpeakerManager = (
  speakers: Record<string, Speaker>,
  onUpdate: (speakers: Record<string, Speaker>) => void
) => {
  const addSpeaker = (name: string, speaker: Speaker) => {
    const updated = { ...speakers, [name]: speaker };
    onUpdate(updated);
  };
  
  const updateSpeaker = (oldName: string, newName: string, speaker: Speaker) => {
    const updated = { ...speakers };
    if (oldName !== newName) {
      delete updated[oldName];
    }
    updated[newName] = speaker;
    onUpdate(updated);
  };
  
  const removeSpeaker = (name: string) => {
    const updated = { ...speakers };
    delete updated[name];
    onUpdate(updated);
  };
  
  return { addSpeaker, updateSpeaker, removeSpeaker };
};
```

### 3. useBeatsManager

**責務**: シーン（Beat）の管理

```typescript
interface Beat {
  speaker: string;
  text: string;
  image?: ImageSource;
}

export const useBeatsManager = (
  beats: Beat[],
  onUpdate: (beats: Beat[]) => void
) => {
  const addBeat = (beat: Beat) => {
    onUpdate([...beats, beat]);
  };
  
  const updateBeat = (index: number, updates: Partial<Beat>) => {
    const updated = [...beats];
    updated[index] = { ...updated[index], ...updates };
    onUpdate(updated);
  };
  
  const removeBeat = (index: number) => {
    onUpdate(beats.filter((_, i) => i !== index));
  };
  
  const reorderBeats = (fromIndex: number, toIndex: number) => {
    const updated = [...beats];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    onUpdate(updated);
  };
  
  return { addBeat, updateBeat, removeBeat, reorderBeats };
};
```

## UIコンポーネント実装

### 1. タブナビゲーション

```typescript
const TabNavigation: React.FC<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'title', label: 'タイトル', icon: <TitleIcon /> },
    { id: 'image', label: '画像設定', icon: <ImageIcon /> },
    { id: 'speech', label: 'スピーカー', icon: <SpeakerIcon /> },
    { id: 'beats', label: 'シーン', icon: <SceneIcon /> },
  ];
  
  return (
    <div className={styles.tabNav}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={cn(styles.tab, {
            [styles.active]: activeTab === tab.id
          })}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
```

### 2. タイトル編集

```typescript
const TitleEditor: React.FC<{
  title: string;
  onChange: (title: string) => void;
}> = ({ title, onChange }) => {
  const maxLength = 100;
  const remaining = maxLength - title.length;
  
  return (
    <div className={styles.titleEditor}>
      <label htmlFor="title">タイトル</label>
      <input
        id="title"
        type="text"
        value={title}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder="動画のタイトルを入力"
      />
      <div className={styles.charCount}>
        残り{remaining}文字
      </div>
    </div>
  );
};
```

### 3. スピーカー管理

```typescript
const SpeechSettings: React.FC<{
  speakers: Record<string, Speaker>;
  onUpdate: (speakers: Record<string, Speaker>) => void;
}> = ({ speakers, onUpdate }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  
  const voiceOptions = [
    { id: 'alloy', label: 'Alloy (中性的)' },
    { id: 'echo', label: 'Echo (男性的)' },
    { id: 'fable', label: 'Fable (英国風)' },
    { id: 'nova', label: 'Nova (女性的)' },
    { id: 'onyx', label: 'Onyx (低音男性)' },
    { id: 'shimmer', label: 'Shimmer (女性的)' },
  ];
  
  return (
    <div className={styles.speechSettings}>
      <div className={styles.header}>
        <h3>スピーカー設定</h3>
        <button onClick={() => setModalOpen(true)}>
          スピーカーを追加
        </button>
      </div>
      
      <div className={styles.speakerList}>
        {Object.entries(speakers).map(([name, speaker]) => (
          <SpeakerCard
            key={name}
            name={name}
            speaker={speaker}
            onEdit={() => {
              setEditingSpeaker(name);
              setModalOpen(true);
            }}
            onDelete={() => removeSpeaker(name)}
          />
        ))}
      </div>
      
      {modalOpen && (
        <SpeakerModal
          speaker={editingSpeaker ? speakers[editingSpeaker] : null}
          speakerName={editingSpeaker}
          existingNames={Object.keys(speakers)}
          voiceOptions={voiceOptions}
          onSave={(name, speaker) => {
            if (editingSpeaker) {
              updateSpeaker(editingSpeaker, name, speaker);
            } else {
              addSpeaker(name, speaker);
            }
            setModalOpen(false);
            setEditingSpeaker(null);
          }}
          onClose={() => {
            setModalOpen(false);
            setEditingSpeaker(null);
          }}
        />
      )}
    </div>
  );
};
```

### 4. シーン編集

```typescript
const BeatsEditor: React.FC<{
  beats: Beat[];
  speakers: string[];
  onUpdate: (beats: Beat[]) => void;
}> = ({ beats, speakers, onUpdate }) => {
  return (
    <div className={styles.beatsEditor}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="beats">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {beats.map((beat, index) => (
                <Draggable key={index} draggableId={`beat-${index}`} index={index}>
                  {(provided, snapshot) => (
                    <BeatCard
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      beat={beat}
                      index={index}
                      speakers={speakers}
                      isDragging={snapshot.isDragging}
                      onUpdate={(updates) => updateBeat(index, updates)}
                      onDelete={() => removeBeat(index)}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      <button className={styles.addBeat} onClick={addNewBeat}>
        新しいシーンを追加
      </button>
    </div>
  );
};
```

## 状態の永続化

### 1. 自動保存

```typescript
// 変更検知と自動保存
useEffect(() => {
  if (!hasChanges) return;
  
  const saveTimer = setTimeout(() => {
    saveToBackend(script);
  }, AUTO_SAVE_DELAY);
  
  return () => clearTimeout(saveTimer);
}, [script, hasChanges]);
```

### 2. 変更の破棄

```typescript
const handleDiscardChanges = () => {
  if (confirm('変更を破棄してもよろしいですか？')) {
    resetChanges();
  }
};
```

## バリデーション

### 1. 入力検証

```typescript
const validateScript = (script: MulmoScript): ValidationResult => {
  const errors: string[] = [];
  
  // タイトル検証
  if (!script.title || script.title.trim() === '') {
    errors.push('タイトルは必須です');
  }
  
  // スピーカー検証
  if (Object.keys(script.speechParams.speakers).length === 0) {
    errors.push('少なくとも1つのスピーカーが必要です');
  }
  
  // シーン検証
  if (script.beats.length === 0) {
    errors.push('少なくとも1つのシーンが必要です');
  }
  
  // 各シーンのスピーカーが存在するか確認
  script.beats.forEach((beat, index) => {
    if (!script.speechParams.speakers[beat.speaker]) {
      errors.push(`シーン${index + 1}のスピーカー「${beat.speaker}」が未定義です`);
    }
  });
  
  return { isValid: errors.length === 0, errors };
};
```

## レスポンシブデザイン

### 1. モバイル対応

```css
/* ScriptDirector.module.css */
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* タブレット以下 */
@media (max-width: 768px) {
  .tabNav {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .tab {
    flex: 0 0 auto;
    min-width: 80px;
  }
  
  .beatCard {
    padding: 12px;
  }
}

/* スマートフォン */
@media (max-width: 480px) {
  .tab span {
    display: none; /* アイコンのみ表示 */
  }
  
  .modal {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
}
```

## パフォーマンス最適化

### 1. メモ化

```typescript
// 重い計算のメモ化
const speakerOptions = useMemo(() => 
  Object.keys(speakers).map(name => ({
    value: name,
    label: `${name} (${speakers[name].displayName.ja})`
  })),
  [speakers]
);

// コンポーネントのメモ化
const BeatCard = memo(({ beat, onUpdate, onDelete }) => {
  // レンダリング最適化
});
```

### 2. 仮想スクロール

```typescript
// 多数のシーンに対応
import { VariableSizeList } from 'react-window';

const VirtualizedBeats = ({ beats, height }) => (
  <VariableSizeList
    height={height}
    itemCount={beats.length}
    itemSize={getItemSize}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <BeatCard beat={beats[index]} index={index} />
      </div>
    )}
  </VariableSizeList>
);
```

## 今後の改善案

1. **プレビュー機能**
   - リアルタイムでの動画プレビュー
   - 音声のテスト再生

2. **テンプレート機能**
   - よく使うシーン構成の保存
   - テンプレートからの新規作成

3. **AI支援機能**
   - シーンの自動提案
   - 対話の改善提案

4. **共同編集**
   - リアルタイムコラボレーション
   - 変更履歴の可視化