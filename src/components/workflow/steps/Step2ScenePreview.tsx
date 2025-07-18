'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import { useAuth } from '@/hooks/useAuth';
import type { Step2Input, Step2Output } from '@/types/workflow';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ドラッグ可能な幕コンポーネント
function SortableAct({
  act,
  actIndex,
  children,
  onDeleteAct,
  isLoading
}: {
  act: any;
  actIndex: number;
  children: React.ReactNode;
  onDeleteAct: (index: number) => void;
  isLoading: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `act-${act.actNumber}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                {...listeners}
                className="cursor-move p-1 hover:bg-gray-700 rounded"
                title="ドラッグして並び替え"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-400">第{act.actNumber}幕</span>
            </div>
            <button
              onClick={() => onDeleteAct(actIndex)}
              className="text-red-500 hover:text-red-400 p-1"
              disabled={isLoading}
              title="幕を削除"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

// ドラッグ可能な場コンポーネント
function SortableScene({
  scene,
  actIndex,
  sceneIndex,
  onTitleChange,
  onSummaryChange,
  onDeleteScene,
  isLoading
}: {
  scene: any;
  actIndex: number;
  sceneIndex: number;
  onTitleChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onDeleteScene: () => void;
  isLoading: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `scene-${actIndex}-${sceneIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-gray-700 p-4 rounded-md space-y-2"
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          className="cursor-move p-1 hover:bg-gray-600 rounded flex-shrink-0 mt-1"
          title="ドラッグして並び替え"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
        <span className="text-xs font-medium text-gray-400 flex-shrink-0 mt-2">第{scene.sceneNumber}場</span>
        <input
          type="text"
          value={scene.sceneTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="場のタイトル"
          className="flex-1 px-3 py-1 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          onClick={onDeleteScene}
          className="text-red-500 hover:text-red-400 p-1 flex-shrink-0"
          disabled={isLoading}
          title="場を削除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <textarea
        value={scene.summary}
        onChange={(e) => onSummaryChange(e.target.value)}
        placeholder="場の概要"
        rows={2}
        className="w-full text-sm px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        disabled={isLoading}
      />
    </div>
  );
}

interface Step2ScenePreviewProps {
  workflowId: string;
  initialData?: {
    stepInput: Step2Input;
    stepOutput?: Step2Output;
  };
  onNext: () => void;
  onBack: () => void;
  onUpdate: (canProceed: boolean) => void;
}

export default function Step2ScenePreview({
  workflowId,
  initialData,
  onNext,
  onBack,
  onUpdate,
}: Step2ScenePreviewProps) {
  const { success, error } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // デバッグ: データの内容を確認
  console.log('[Step2ScenePreview] initialData:', initialData);

  // 前回のinitialDataを追跡（データの変更を検出するため）
  const prevInitialDataRef = useRef<typeof initialData>(undefined);

  // フォームの状態管理
  const [title, setTitle] = useState(() => {
    // stepOutputのtitleが存在する場合（空文字列も含む）はそれを使用
    if (initialData?.stepOutput?.userInput?.title !== undefined && 
        initialData?.stepOutput?.userInput?.title !== null) {
      return initialData.stepOutput.userInput.title;
    }
    // それ以外はstepInputのsuggestedTitleを使用
    return initialData?.stepInput?.suggestedTitle || '';
  });
  const [acts, setActs] = useState(
    initialData?.stepOutput?.userInput?.acts ||
    initialData?.stepInput?.acts ||
    []
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'act' | 'scene' | null>(null);
  
  // 選択されたキーワードの管理
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(() => {
    // 既存の選択状態を復元
    const savedKeywords = initialData?.stepOutput?.userInput?.selectedKeywords;
    if (savedKeywords && Array.isArray(savedKeywords)) {
      return new Set(savedKeywords.map(k => k.term));
    }
    // デフォルトで重要度7.0以上を選択
    const importantKeywords = initialData?.stepInput?.keywords?.filter(k => k.importance >= 7.0) || [];
    return new Set(importantKeywords.map(k => k.term));
  });

  // ドラッグ＆ドロップのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // initialDataが変更されたときにフォームデータを更新
  useEffect(() => {
    // 前回のデータと比較して、実際に変更があった場合のみ更新
    const hasDataChanged = prevInitialDataRef.current?.stepOutput !== initialData?.stepOutput ||
                          prevInitialDataRef.current?.stepInput !== initialData?.stepInput;
    
    if (hasDataChanged && initialData) {
      console.log('[Step2ScenePreview] Initial data changed, updating form');
      
      if (initialData?.stepOutput?.userInput) {
        console.log('[Step2ScenePreview] Using stepOutput.userInput');
        console.log('[Step2ScenePreview] Title from stepOutput:', initialData.stepOutput.userInput.title);
        // titleがundefinedまたはnullの場合のみデフォルト値を使用
        if (initialData.stepOutput.userInput.title !== undefined && initialData.stepOutput.userInput.title !== null) {
          setTitle(initialData.stepOutput.userInput.title);
        }
        setActs(initialData.stepOutput.userInput.acts || []);
        // 選択されたキーワードを復元
        if (initialData.stepOutput.userInput.selectedKeywords) {
          setSelectedKeywords(new Set(initialData.stepOutput.userInput.selectedKeywords.map(k => k.term)));
        }
      } else if (initialData?.stepInput) {
        console.log('[Step2ScenePreview] Using stepInput');
        setTitle(initialData.stepInput.suggestedTitle || '');
        setActs(initialData.stepInput.acts || []);
        // デフォルトで重要度7.0以上を選択
        const importantKeywords = initialData.stepInput.keywords?.filter(k => k.importance >= 7.0) || [];
        setSelectedKeywords(new Set(importantKeywords.map(k => k.term)));
      }
      
      // 現在のデータを記録
      prevInitialDataRef.current = initialData;
    }
  }, [initialData]);

  // タイトルの有効性をチェック
  useEffect(() => {
    onUpdate(title.trim().length > 0);
  }, [title, onUpdate]);

  // 幕のタイトル変更
  const handleActTitleChange = (actIndex: number, newTitle: string) => {
    const newActs = [...acts];
    newActs[actIndex] = { ...newActs[actIndex], actTitle: newTitle };
    setActs(newActs);
  };

  // 場のタイトル変更
  const handleSceneTitleChange = (actIndex: number, sceneIndex: number, newTitle: string) => {
    const newActs = [...acts];
    newActs[actIndex].scenes[sceneIndex] = {
      ...newActs[actIndex].scenes[sceneIndex],
      sceneTitle: newTitle,
    };
    setActs(newActs);
  };

  // 場のサマリー変更
  const handleSceneSummaryChange = (actIndex: number, sceneIndex: number, newSummary: string) => {
    const newActs = [...acts];
    newActs[actIndex].scenes[sceneIndex] = {
      ...newActs[actIndex].scenes[sceneIndex],
      summary: newSummary,
    };
    setActs(newActs);
  };

  // 幕を追加
  const handleAddAct = () => {
    const newAct = {
      actNumber: acts.length + 1,
      actTitle: `第${acts.length + 1}幕`,
      scenes: [], // 場がない状態で開始
    };
    setActs([...acts, newAct]);
  };

  // 幕を削除
  const handleDeleteAct = (actIndex: number) => {
    if (acts.length <= 1) {
      error('最低1つの幕が必要です');
      return;
    }
    const newActs = acts.filter((_, index) => index !== actIndex);
    // 幕番号を再割り当て
    newActs.forEach((act, index) => {
      act.actNumber = index + 1;
    });
    setActs(newActs);
  };

  // 場を追加
  const handleAddScene = (actIndex: number) => {
    const newActs = [...acts];
    const act = newActs[actIndex];
    const newScene = {
      sceneNumber: act.scenes.length + 1,
      sceneTitle: '新しい場',
      summary: '',
    };
    act.scenes.push(newScene);
    setActs(newActs);
  };

  // 場を削除
  const handleDeleteScene = (actIndex: number, sceneIndex: number) => {
    const newActs = [...acts];
    const act = newActs[actIndex];
    act.scenes = act.scenes.filter((_, index) => index !== sceneIndex);
    // 場番号を再割り当て
    act.scenes.forEach((scene, index) => {
      scene.sceneNumber = index + 1;
    });
    setActs(newActs);
  };

  // ドラッグ開始
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    if (active.id.toString().startsWith('act-')) {
      setActiveDragType('act');
    } else if (active.id.toString().startsWith('scene-')) {
      setActiveDragType('scene');
    }
  };

  // ドラッグ終了
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveDragType(null);
      return;
    }

    if (activeDragType === 'act') {
      const activeIndex = acts.findIndex(act => `act-${act.actNumber}` === active.id);
      const overIndex = acts.findIndex(act => `act-${act.actNumber}` === over.id);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        const newActs = arrayMove(acts, activeIndex, overIndex);
        // 幕番号を再割り当て
        newActs.forEach((act, index) => {
          act.actNumber = index + 1;
        });
        setActs(newActs);
      }
    } else if (activeDragType === 'scene') {
      // シーンのドラッグ処理
      const activeIdParts = active.id.toString().split('-');
      const overIdParts = over.id.toString().split('-');

      if (activeIdParts[0] === 'scene' && overIdParts[0] === 'scene') {
        const activeActIndex = parseInt(activeIdParts[1], 10);
        const activeSceneIndex = parseInt(activeIdParts[2], 10);
        const overActIndex = parseInt(overIdParts[1], 10);
        const overSceneIndex = parseInt(overIdParts[2], 10);

        if (activeActIndex === overActIndex) {
          // 同じ幕内での移動
          const newActs = [...acts];
          const act = newActs[activeActIndex];
          act.scenes = arrayMove(act.scenes, activeSceneIndex, overSceneIndex);
          // 場番号を再割り当て
          act.scenes.forEach((scene, index) => {
            scene.sceneNumber = index + 1;
          });
          setActs(newActs);
        } else {
          // 異なる幕間での移動
          const newActs = [...acts];
          const sourceAct = newActs[activeActIndex];
          const targetAct = newActs[overActIndex];
          const [movedScene] = sourceAct.scenes.splice(activeSceneIndex, 1);
          targetAct.scenes.splice(overSceneIndex, 0, movedScene);

          // 場番号を再割り当て
          sourceAct.scenes.forEach((scene, index) => {
            scene.sceneNumber = index + 1;
          });
          targetAct.scenes.forEach((scene, index) => {
            scene.sceneNumber = index + 1;
          });

          setActs(newActs);
        }
      }
    }

    setActiveId(null);
    setActiveDragType(null);
  };

  // データが変更されているかチェック
  const hasDataChanged = () => {
    const savedData = initialData?.stepOutput?.userInput;
    if (!savedData) return true; // 保存データがない場合は変更ありとみなす
    
    // タイトルの比較
    if (title !== savedData.title) return true;
    
    // 幕場構成の比較
    const filteredActs = acts.filter(act => act.scenes.length > 0);
    const savedActs = savedData.acts || [];
    
    if (filteredActs.length !== savedActs.length) return true;
    
    for (let i = 0; i < filteredActs.length; i++) {
      const act = filteredActs[i];
      const savedAct = savedActs[i];
      
      if (!savedAct || act.actNumber !== savedAct.actNumber || act.actTitle !== savedAct.actTitle) {
        return true;
      }
      
      if (act.scenes.length !== savedAct.scenes.length) return true;
      
      for (let j = 0; j < act.scenes.length; j++) {
        const scene = act.scenes[j];
        const savedScene = savedAct.scenes[j];
        
        if (!savedScene || 
            scene.sceneNumber !== savedScene.sceneNumber || 
            scene.sceneTitle !== savedScene.sceneTitle || 
            scene.summary !== savedScene.summary) {
          return true;
        }
      }
    }
    
    // キーワード選択の比較
    const savedKeywords = savedData.selectedKeywords || [];
    const savedKeywordSet = new Set(Array.isArray(savedKeywords) ? savedKeywords.map(k => k.term) : []);
    
    if (selectedKeywords.size !== savedKeywordSet.size) return true;
    
    for (const term of selectedKeywords) {
      if (!savedKeywordSet.has(term)) return true;
    }
    
    return false;
  };

  // タイトルのみが変更されているかチェック
  const isTitleOnlyChanged = () => {
    const savedData = initialData?.stepOutput?.userInput;
    if (!savedData) return false; // 保存データがない場合はfalse
    
    // タイトルが変更されていない場合はfalse
    if (title === savedData.title) return false;
    
    // 幕場構成が変更されていないかチェック
    const filteredActs = acts.filter(act => act.scenes.length > 0);
    const savedActs = savedData.acts || [];
    
    if (filteredActs.length !== savedActs.length) return false;
    
    for (let i = 0; i < filteredActs.length; i++) {
      const act = filteredActs[i];
      const savedAct = savedActs[i];
      
      if (!savedAct || act.actNumber !== savedAct.actNumber || act.actTitle !== savedAct.actTitle) {
        return false;
      }
      
      if (act.scenes.length !== savedAct.scenes.length) return false;
      
      for (let j = 0; j < act.scenes.length; j++) {
        const scene = act.scenes[j];
        const savedScene = savedAct.scenes[j];
        
        if (!savedScene || 
            scene.sceneNumber !== savedScene.sceneNumber || 
            scene.sceneTitle !== savedScene.sceneTitle || 
            scene.summary !== savedScene.summary) {
          return false;
        }
      }
    }
    
    // キーワード選択が変更されていないかチェック
    const savedKeywords = savedData.selectedKeywords || [];
    const savedKeywordSet = new Set(Array.isArray(savedKeywords) ? savedKeywords.map(k => k.term) : []);
    
    // 選択数が異なる場合はfalse
    if (selectedKeywords.size !== savedKeywordSet.size) return false;
    
    // 選択内容が異なる場合はfalse
    for (const term of selectedKeywords) {
      if (!savedKeywordSet.has(term)) return false;
    }
    
    // タイトルだけが変更されている
    return true;
  };

  // 保存処理
  const handleSave = async () => {
    if (!title.trim() || !user) {
      error('タイトルを入力してください');
      return;
    }

    // データが変更されていない場合はスキップ
    if (!hasDataChanged()) {
      console.log('[Step2ScenePreview] No changes detected, skipping save');
      onNext();
      return;
    }

    setIsLoading(true);
    try {
      // 空の幕を除外
      const filteredActs = acts.filter(act => act.scenes.length > 0);

      if (filteredActs.length === 0) {
        error('少なくとも1つの場が必要です');
        return;
      }

      // 選択されたキーワードのみを抽出
      const allKeywords = initialData?.stepInput?.keywords || [];
      const selectedKeywordsList = allKeywords.filter(k => selectedKeywords.has(k.term));

      // workflow-design.mdの仕様に従い、Step2Outputを送信
      const step2Output: Step2Output = {
        userInput: {
          title: title.trim(),
          acts: filteredActs,
          selectedKeywords: selectedKeywordsList,
        },
      };

      // タイトルのみの変更の場合はフラグを追加
      const titleOnlyChange = isTitleOnlyChanged();
      
      const response = await fetch(`/api/workflow/${workflowId}/step/2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': user.id,
          'X-Title-Only-Change': titleOnlyChange ? 'true' : 'false',
        },
        body: JSON.stringify(step2Output),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Step 2 save failed:', response.status, errorData);
        throw new Error(`Failed to save: ${response.status} ${errorData}`);
      }

      onNext();
    } catch (err) {
      console.error('Failed to save step 2:', err);
      error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">幕場構成を確認</h2>
        <p className="text-gray-400">
          生成された構成を確認し、必要に応じて編集してください
        </p>
      </div>

      {/* タイトル編集 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <label className="block text-sm font-medium mb-2">
            作品タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="作品のタイトルを入力"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      {/* 幕場構成エディタ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">幕場構成</h3>
          <button
            onClick={handleAddAct}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
            disabled={isLoading}
          >
            幕を追加
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={acts.map(act => `act-${act.actNumber}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {acts.map((act, actIndex) => (
                <SortableAct
                  key={`act-${act.actNumber}`}
                  act={act}
                  actIndex={actIndex}
                  onDeleteAct={handleDeleteAct}
                  isLoading={isLoading}
                >
                  <input
                    type="text"
                    value={act.actTitle}
                    onChange={(e) => handleActTitleChange(actIndex, e.target.value)}
                    placeholder="幕のタイトル"
                    className="w-full mb-4 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isLoading}
                  />

                  <SortableContext
                    items={act.scenes.map((_, sceneIndex) => `scene-${actIndex}-${sceneIndex}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {act.scenes.map((scene, sceneIndex) => (
                        <SortableScene
                          key={`scene-${actIndex}-${sceneIndex}`}
                          scene={scene}
                          actIndex={actIndex}
                          sceneIndex={sceneIndex}
                          onTitleChange={(value) => handleSceneTitleChange(actIndex, sceneIndex, value)}
                          onSummaryChange={(value) => handleSceneSummaryChange(actIndex, sceneIndex, value)}
                          onDeleteScene={() => handleDeleteScene(actIndex, sceneIndex)}
                          isLoading={isLoading}
                        />
                      ))}
                    </div>
                  </SortableContext>

                  <button
                    onClick={() => handleAddScene(actIndex)}
                    className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
                    disabled={isLoading}
                  >
                    場を追加
                  </button>
                </SortableAct>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId && activeDragType === 'act' && (
              <div className="bg-gray-800 border border-purple-500 rounded-lg p-4 opacity-80">
                幕を移動中...
              </div>
            )}
            {activeId && activeDragType === 'scene' && (
              <div className="bg-gray-700 border border-purple-500 rounded-md p-2 opacity-80">
                場を移動中...
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* キーワード表示 */}
      {initialData?.stepInput?.keywords && initialData.stepInput.keywords.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                抽出されたキーワード（{selectedKeywords.size}/{initialData.stepInput.keywords.length}個選択）
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedKeywords(new Set(initialData.stepInput.keywords?.map(k => k.term) || []))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                  disabled={isLoading}
                >
                  すべて選択
                </button>
                <button
                  onClick={() => setSelectedKeywords(new Set())}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                  disabled={isLoading}
                >
                  すべて解除
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {initialData.stepInput.keywords.map((keyword, index) => {
                // スコアに基づいて色を計算
                const getScoreColor = (score: number) => {
                  if (score >= 9.0) return 'bg-red-600';
                  if (score >= 7.0) return 'bg-orange-600';
                  if (score >= 5.0) return 'bg-yellow-600';
                  if (score >= 3.0) return 'bg-blue-600';
                  return 'bg-gray-600';
                };
                
                const getScoreTextColor = (score: number) => {
                  if (score >= 5.0) return 'text-white';
                  return 'text-gray-200';
                };
                
                const isSelected = selectedKeywords.has(keyword.term);
                
                return (
                  <div 
                    key={index} 
                    className={`bg-gray-700 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => {
                      const newSet = new Set(selectedKeywords);
                      if (isSelected) {
                        newSet.delete(keyword.term);
                      } else {
                        newSet.add(keyword.term);
                      }
                      setSelectedKeywords(newSet);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // onClickで処理
                        className="mt-1 w-4 h-4 text-purple-600 bg-gray-700 border-gray-500 rounded focus:ring-purple-500"
                        disabled={isLoading}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-base font-medium text-white">{keyword.term}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(Number(keyword.importance))} ${getScoreTextColor(Number(keyword.importance))}`}>
                            {Number(keyword.importance).toFixed(1)}
                          </span>
                          <span className="px-2 py-1 bg-gray-600 rounded-full text-xs text-gray-200">
                            {keyword.category === 'person' ? '人物' :
                             keyword.category === 'organization' ? '組織' :
                             keyword.category === 'event' ? 'イベント' :
                             keyword.category === 'concept' ? '概念' :
                             keyword.category === 'location' ? '場所' : 'その他'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-2">{keyword.reason}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-600">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-600 rounded-full"></span>
                  9.0-10.0
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-orange-600 rounded-full"></span>
                  7.0-8.9
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-yellow-600 rounded-full"></span>
                  5.0-6.9
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                  3.0-4.9
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-gray-600 rounded-full"></span>
                  0.0-2.9
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* アクションボタン */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-3 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all"
        >
          ← 戻る
        </button>
        <button
          onClick={handleSave}
          disabled={!title.trim() || isLoading}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all
            ${title.trim() && !isLoading
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? '保存中...' : '次へ →'}
        </button>
      </div>
    </div>
  );
}