'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui';
import { useToast } from '@/contexts';
import type { Step1Json, Step2Json } from '@/types/workflow';
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
    <div ref={setNodeRef} style={style} {...attributes} className="bg-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-4">
        <div 
          {...listeners} 
          className="cursor-move p-1 hover:bg-gray-600 rounded flex-shrink-0"
          title="ドラッグして並び替え"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
        <span className="text-sm text-gray-400 flex-shrink-0">
          第{scene.sceneNumber}場
        </span>
        <input
          type="text"
          value={scene.sceneTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="場のタイトル"
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
  initialData?: Step2Json;
  previousStepData?: Step1Json;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (canProceed: boolean) => void;
}

export default function Step2ScenePreview({
  workflowId,
  initialData,
  previousStepData,
  onNext,
  onBack,
  onUpdate,
}: Step2ScenePreviewProps) {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // デバッグ: データの内容を確認
  console.log('[Step2ScenePreview] initialData:', initialData);
  console.log('[Step2ScenePreview] previousStepData:', previousStepData);
  
  // フォームの状態管理
  const [title, setTitle] = useState(initialData?.userInput?.title || '');
  const [acts, setActs] = useState(
    initialData?.userInput?.acts || previousStepData?.generatedContent?.acts || []
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'act' | 'scene' | null>(null);
  
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

  // initialDataまたはpreviousStepDataが変更されたときにフォームデータを更新
  useEffect(() => {
    if (initialData?.userInput) {
      console.log('[Step2ScenePreview] Updating form with initialData.userInput');
      setTitle(initialData.userInput.title || '');
      setActs(initialData.userInput.acts || []);
    } else if (previousStepData?.generatedContent?.acts) {
      console.log('[Step2ScenePreview] Updating form with previousStepData.generatedContent');
      setTitle(previousStepData.generatedContent.suggestedTitle || '');
      setActs(previousStepData.generatedContent.acts || []);
    }
  }, [initialData, previousStepData]);

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
    act.scenes.splice(sceneIndex, 1);
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
    
    // ドラッグタイプを判定
    if (active.id.toString().startsWith('act-')) {
      setActiveDragType('act');
    } else if (active.id.toString().startsWith('scene-')) {
      setActiveDragType('scene');
    }
  };
  
  // ドラッグ終了
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      setActiveDragType(null);
      return;
    }
    
    if (activeDragType === 'act') {
      // 幕の並び替え
      const activeIndex = acts.findIndex(act => `act-${act.actNumber}` === active.id);
      const overIndex = acts.findIndex(act => `act-${act.actNumber}` === over.id);
      
      if (activeIndex !== -1 && overIndex !== -1) {
        const newActs = arrayMove(acts, activeIndex, overIndex);
        // 幕番号を再割り当て
        newActs.forEach((act, index) => {
          act.actNumber = index + 1;
        });
        setActs(newActs);
      }
    } else if (activeDragType === 'scene') {
      // 場の並び替え（同じ幕内）
      const [activeActIndex, activeSceneIndex] = active.id.toString().replace('scene-', '').split('-').map(Number);
      const [overActIndex, overSceneIndex] = over.id.toString().replace('scene-', '').split('-').map(Number);
      
      if (activeActIndex === overActIndex) {
        const newActs = [...acts];
        const act = newActs[activeActIndex];
        const reorderedScenes = arrayMove(act.scenes, activeSceneIndex, overSceneIndex);
        // 場番号を再割り当て
        reorderedScenes.forEach((scene, index) => {
          scene.sceneNumber = index + 1;
        });
        act.scenes = reorderedScenes;
        setActs(newActs);
      }
    }
    
    setActiveId(null);
    setActiveDragType(null);
  };

  // 親コンポーネントから「次へ」ボタンがクリックされたときの処理
  useEffect(() => {
    // TODO: 保存処理の実装
  }, []);

  // データ保存と次へ
  const handleSave = async () => {
    if (!title.trim()) {
      error('タイトルを入力してください');
      return;
    }

    // 場のない幕をフィルタリング
    const filteredActs = acts.filter(act => act.scenes.length > 0);
    
    // すべての幕が場を持たない場合の警告
    if (filteredActs.length === 0) {
      error('最低1つの場面を作成してください');
      return;
    }
    
    // 幕番号を再割り当て
    filteredActs.forEach((act, index) => {
      act.actNumber = index + 1;
    });

    setIsLoading(true);
    try {
      const step2Data: Step2Json = {
        userInput: {
          title,
          acts: filteredActs, // フィルタリングされた幕を保存
        },
        generatedContent: {
          detailedCharacters: [],
          suggestedImageStyle: {
            preset: 'anime',
            description: '',
          },
        },
      };

      const response = await fetch(`/api/workflow/${workflowId}/step/2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: step2Data }),
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      success('幕場構成を保存しました');
      onNext();
    } catch (err) {
      console.error('Failed to save step 2:', err);
      error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">幕場構成の確認</h2>
        <p className="text-gray-400">
          生成された5幕構成を確認し、必要に応じて編集してください
        </p>
      </div>

      {/* タイトル入力 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <label className="block text-sm font-medium mb-2">
            作品タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 未来への挑戦 〜夢を追う若者の物語〜"
            className="w-full text-lg px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      {/* 幕場構成 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          <SortableContext
            items={acts.map(act => `act-${act.actNumber}`)}
            strategy={verticalListSortingStrategy}
          >
            {acts.map((act, actIndex) => (
              <SortableAct
                key={`act-${act.actNumber}`}
                act={act}
                actIndex={actIndex}
                onDeleteAct={handleDeleteAct}
                isLoading={isLoading}
              >
                {/* 幕タイトル */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    幕のタイトル
                  </label>
                  <input
                    type="text"
                    value={act.actTitle}
                    onChange={(e) => handleActTitleChange(actIndex, e.target.value)}
                    placeholder="幕のタイトル"
                    className="w-full font-medium px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                {/* 場の一覧 */}
                <div className="space-y-4">
                  {act.scenes.length > 0 ? (
                    <>
                      <SortableContext
                        items={act.scenes.map((_, sceneIndex) => `scene-${actIndex}-${sceneIndex}`)}
                        strategy={verticalListSortingStrategy}
                      >
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
                      </SortableContext>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600">
                      <p className="text-sm mb-2">この幕には場がありません</p>
                      <p className="text-xs">（保存時に空の幕は自動的に削除されます）</p>
                    </div>
                  )}
                  
                  {/* 場を追加ボタン */}
                  <button
                    onClick={() => handleAddScene(actIndex)}
                    className="w-full py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors"
                    disabled={isLoading}
                  >
                    + 場を追加
                  </button>
                </div>
              </SortableAct>
            ))}
          </SortableContext>
          
          {/* 幕を追加ボタン */}
          <button
            onClick={handleAddAct}
            className="w-full py-3 bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:bg-gray-600 hover:border-gray-500 hover:text-gray-300 transition-colors"
            disabled={isLoading}
          >
            + 幕を追加
          </button>
        </div>
        
        {/* ドラッグ中のオーバーレイ */}
        <DragOverlay>
          {activeId && activeDragType === 'act' && (
            <div className="opacity-80">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="text-sm font-medium text-gray-400">
                    幕を移動中...
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {activeId && activeDragType === 'scene' && (
            <div className="bg-gray-700 rounded-lg p-4 opacity-80">
              <div className="text-sm text-gray-400">
                場を移動中...
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* ヒント */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-blue-400 mb-2">💡 ヒント</h3>
          <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
            <li>各幕は起承転結の流れに沿って構成されています</li>
            <li>タイトルや概要は後で変更することも可能です</li>
            <li>シェイクスピア風の壮大なストーリー展開を意識しています</li>
          </ul>
        </CardContent>
      </Card>

    </div>
  );
}