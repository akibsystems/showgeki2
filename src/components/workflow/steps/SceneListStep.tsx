'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWorkflow } from '@/contexts/workflow-context';
import { useResponsive } from '@/hooks/useResponsive';
import { useSceneManager } from '@/hooks/useSceneManager';
import { cn } from '@/lib/utils';
import type { Scene } from '@/types';
import { SceneListDragDrop } from './SceneListDragDrop';

interface SceneListStepProps {
  className?: string;
}

/**
 * ワークフローステップ2: シーン一覧
 * フラットなシーン構成を表示・編集
 */
export function SceneListStep({ className }: SceneListStepProps) {
  const { state, markAsUnsaved, updateWorkflowMetadata } = useWorkflow();
  const { isMobile, isDesktopUp } = useResponsive();
  
  // AI生成されたシーン分析結果から初期シーンを作成
  const getInitialScenes = useCallback((): Scene[] => {
    // workflowMetadataのsceneOverviewから取得（Step1で生成された結果）
    if (state.workflowMetadata?.sceneOverview) {
      console.log('Loading scenes from workflowMetadata.sceneOverview:', state.workflowMetadata.sceneOverview);
      return state.workflowMetadata.sceneOverview.map((scene: any, index: number) => ({
        id: scene.id || `scene-${index + 1}`,
        speaker: scene.speaker || '',
        text: scene.text || scene.content || '',
        description: scene.description || scene.title || `シーン${index + 1}`,
        imagePrompt: scene.imagePrompt,
        order: index,
      }));
    }
    
    // script_jsonのbeatsから取得（既存のmulmoscriptがある場合）
    if (state.story?.script_json?.beats) {
      return state.story.script_json.beats.map((beat: any, index: number) => ({
        id: beat.id || `scene-${index + 1}`,
        speaker: beat.speaker || '',
        text: beat.text || '',
        description: beat.description || '',
        imagePrompt: beat.imagePrompt,
        order: index,
      }));
    }
    
    // デフォルトのシーン構成
    const totalScenes = state.storyElements?.total_scenes || 5;
    return Array.from({ length: totalScenes }, (_, i) => ({
      id: `scene-${i + 1}`,
      speaker: '',
      text: '',
      description: `シーン${i + 1}の説明`,
      order: i,
    }));
  }, [state.story, state.storyElements, state.workflowMetadata]);

  const {
    scenes,
    addScene,
    updateScene,
    deleteScene,
    reorderScene,
    setScenes,
    totalScenes,
    isValid,
  } = useSceneManager(getInitialScenes());

  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [newSceneTitle, setNewSceneTitle] = useState('');

  // シーンの並び替え処理
  const handleReorderScenes = useCallback((reorderedItems: any[]) => {
    // 新しい順序でシーンを更新
    const newScenes = reorderedItems.map((item, index) => {
      const scene = scenes.find(s => s.id === item.id);
      if (!scene) {
        // Fallback scene object
        return {
          id: item.id,
          speaker: '',
          text: '',
          description: item.content || `シーン${index + 1}`,
          order: index
        } as Scene;
      }
      // Create a proper Scene object ensuring all required properties exist
      const sceneAsAny = scene as any;
      return {
        id: sceneAsAny.id,
        speaker: sceneAsAny.speaker || '',
        text: sceneAsAny.text || sceneAsAny.content || '',
        title: sceneAsAny.title,
        description: sceneAsAny.description,
        imagePrompt: sceneAsAny.imagePrompt,
        image: sceneAsAny.image,
        duration: sceneAsAny.duration,
        captionParams: sceneAsAny.captionParams,
        actId: sceneAsAny.actId,
        order: index,
        isTransition: sceneAsAny.isTransition
      };
    });
    
    setScenes(newScenes);
    markAsUnsaved();
  }, [scenes, setScenes, markAsUnsaved]);

  // シーンタイトル編集
  const handleSceneEdit = useCallback((sceneId: string, newTitle: string) => {
    if (newTitle.trim()) {
      updateScene(sceneId, { title: newTitle.trim() });
      markAsUnsaved();
    }
    setEditingSceneId(null);
  }, [updateScene, markAsUnsaved]);

  // シーン追加
  const handleAddScene = useCallback(() => {
    if (scenes.length >= 20) {
      alert('シーンは最大20個までです');
      return;
    }
    
    addScene({
      speaker: '',
      text: '',
      description: `新しいシーン`,
    });
    markAsUnsaved();
  }, [scenes.length, addScene, markAsUnsaved]);

  // シーン削除
  const handleDeleteScene = useCallback((sceneId: string) => {
    if (scenes.length <= 1) {
      alert('シーンは最低1個必要です');
      return;
    }
    
    if (confirm('このシーンを削除しますか？')) {
      deleteScene(sceneId);
      markAsUnsaved();
    }
  }, [scenes.length, deleteScene, markAsUnsaved]);


  // 変更を自動保存 - 初回レンダリング時は保存しない
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (state.story && scenes.length > 0) {
      // TODO: Store scene data in a proper format compatible with WorkflowMetadata
      // For now, we'll just mark as unsaved without updating metadata
      markAsUnsaved();
    }
  }, [scenes, state.story, updateWorkflowMetadata, markAsUnsaved]);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center mb-8">
        <h2 className="text-responsive-2xl font-bold mb-2">シーン構成</h2>
        <p className="text-gray-400">
          {isDesktopUp ? 'シーンをドラッグして順序を変更できます' : 'シーンの順序を変更できます'}
        </p>
      </div>

      {/* シーン一覧 */}
      <SceneListDragDrop
        items={scenes.map((scene, index) => ({
          id: scene.id,
          content: (
            <div className="flex items-center gap-4 flex-1">
              {/* シーン番号 */}
              <div className="flex-shrink-0 w-16">
                <div className="text-lg font-bold text-shakespeare-purple">
                  シーン{index + 1}
                </div>
              </div>
              
              {/* シーン内容 */}
              <div className="flex-1">
                {editingSceneId === scene.id ? (
                  <input
                    type="text"
                    defaultValue={(scene as any).title || (scene as any).description || (scene as any).content}
                    onBlur={(e) => handleSceneEdit(scene.id, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSceneEdit(scene.id, e.currentTarget.value);
                      }
                    }}
                    className="w-full bg-transparent border-b border-shakespeare-purple focus:outline-none text-lg"
                    autoFocus
                  />
                ) : (
                  <h3 
                    className="text-lg font-medium cursor-pointer hover:text-shakespeare-purple"
                    onClick={() => setEditingSceneId(scene.id)}
                  >
                    {(scene as any).title || (scene as any).description || (scene as any).content || '(タイトル未設定)'}
                  </h3>
                )}
                {scene.duration && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>時間: {scene.duration}秒</span>
                  </div>
                )}
              </div>
              
              {/* 削除ボタン */}
              <button
                type="button"
                onClick={() => handleDeleteScene(scene.id)}
                className="text-gray-500 hover:text-red-500 transition-colors"
                title="シーンを削除"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        }))}
        onReorder={handleReorderScenes}
        className="space-y-3"
      />
      
      {/* シーン追加ボタン */}
      {scenes.length < 20 && (
        <button
          type="button"
          onClick={handleAddScene}
          className={cn(
            'w-full p-4 border-2 border-dashed border-gray-700 rounded-lg mt-3',
            'text-gray-500 hover:text-gray-300 hover:border-gray-600',
            'transition-colors flex items-center justify-center gap-2'
          )}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>シーンを追加</span>
        </button>
      )}

      {/* 統計情報 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-800/30 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-shakespeare-gold">{scenes.length}</div>
          <div className="text-sm text-gray-400">シーン数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-shakespeare-emerald">
            {Math.ceil(scenes.length * 7.5)}秒
          </div>
          <div className="text-sm text-gray-400">予想時間</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-shakespeare-crimson">
            {state.storyElements?.total_scenes || scenes.length}/{20}
          </div>
          <div className="text-sm text-gray-400">最大シーン数</div>
        </div>
      </div>

    </div>
  );
}