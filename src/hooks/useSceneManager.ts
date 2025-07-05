import { useReducer, useCallback, useMemo } from 'react';
import { Scene, SceneListState, SceneAction } from '@/types';
import { 
  generateSceneId, 
  validateSceneList, 
  moveSceneToAct,
  reorderScenes,
} from '@/lib/scene-utils';

// 初期状態
const initialState: SceneListState = {
  scenes: [],
  acts: [
    { id: 'act-1', title: '第一幕：発端', description: '物語の始まり', sceneIds: [] },
    { id: 'act-2', title: '第二幕：展開', description: '物語の展開', sceneIds: [] },
    { id: 'act-3', title: '第三幕：転機', description: '物語の転機', sceneIds: [] },
    { id: 'act-4', title: '第四幕：結末への道', description: '結末への道', sceneIds: [] },
    { id: 'act-5', title: '第五幕：大団円', description: '物語の終わり', sceneIds: [] },
  ],
  totalScenes: 0,
  isValid: true,
  validationErrors: [],
};

// リデューサー
function sceneReducer(state: SceneListState, action: SceneAction): SceneListState {
  switch (action.type) {
    case 'ADD_SCENE': {
      const newScene = {
        ...action.payload,
        id: action.payload.id || generateSceneId(),
        order: state.scenes.length,
      };
      
      const updatedScenes = [...state.scenes, newScene];
      
      // デフォルトで最後の幕に追加
      const lastAct = state.acts[state.acts.length - 1];
      const updatedActs = state.acts.map(act => 
        act.id === lastAct.id 
          ? { ...act, sceneIds: [...act.sceneIds, newScene.id] }
          : act
      );
      
      const newState = {
        ...state,
        scenes: updatedScenes,
        acts: updatedActs,
        totalScenes: updatedScenes.length,
      };
      
      const isValid = validateSceneList(newState);
      return { ...newState, isValid };
    }
    
    case 'UPDATE_SCENE': {
      const { id, updates } = action.payload;
      const updatedScenes = state.scenes.map(scene =>
        scene.id === id ? { ...scene, ...updates } : scene
      );
      
      const newState = {
        ...state,
        scenes: updatedScenes,
      };
      
      const isValid = validateSceneList(newState);
      return { ...newState, isValid };
    }
    
    case 'DELETE_SCENE': {
      const { id } = action.payload;
      const updatedScenes = state.scenes.filter(scene => scene.id !== id);
      
      // 幕からもシーンIDを削除
      const updatedActs = state.acts.map(act => ({
        ...act,
        sceneIds: act.sceneIds.filter(sceneId => sceneId !== id),
      }));
      
      // order値を再計算
      const reorderedScenes = updatedScenes.map((scene, index) => ({
        ...scene,
        order: index,
      }));
      
      const newState = {
        ...state,
        scenes: reorderedScenes,
        acts: updatedActs,
        totalScenes: reorderedScenes.length,
      };
      
      const isValid = validateSceneList(newState);
      return { ...newState, isValid };
    }
    
    case 'REORDER_SCENES': {
      const { fromIndex, toIndex } = action.payload;
      const reorderedScenes = reorderScenes(state.scenes as unknown as Scene[], fromIndex, toIndex);
      
      const newState = {
        ...state,
        scenes: reorderedScenes,
      };
      
      const isValid = validateSceneList(newState as unknown as SceneListState);
      return { ...newState, isValid } as unknown as SceneListState;
    }
    
    case 'MOVE_SCENE_TO_ACT': {
      const { sceneId, actId, position } = action.payload;
      return moveSceneToAct(state, sceneId, actId, position);
    }
    
    case 'SET_SCENES': {
      const scenes = action.payload.map((scene, index) => ({
        ...scene,
        order: index,
      }));
      
      // シーンを幕に自動配分
      const scenesPerAct = Math.ceil(scenes.length / 5);
      let sceneIndex = 0;
      
      const updatedActs = state.acts.map((act, actIndex) => {
        const isLastAct = actIndex === 4;
        const sceneCount = isLastAct 
          ? scenes.length - sceneIndex 
          : Math.min(scenesPerAct, scenes.length - sceneIndex);
        
        const sceneIds = scenes
          .slice(sceneIndex, sceneIndex + sceneCount)
          .map(scene => scene.id);
        
        sceneIndex += sceneCount;
        
        return { ...act, sceneIds };
      });
      
      // シーンに幕IDを設定
      const scenesWithActId = scenes.map(scene => {
        const act = updatedActs.find(a => a.sceneIds.includes(scene.id));
        return { ...scene, actId: act?.id };
      });
      
      const newState = {
        ...state,
        scenes: scenesWithActId,
        acts: updatedActs,
        totalScenes: scenes.length,
      };
      
      const isValid = validateSceneList(newState);
      return { ...newState, isValid };
    }
    
    case 'VALIDATE_SCENES': {
      const isValid = validateSceneList(state);
      return { ...state, isValid };
    }
    
    default:
      return state;
  }
}

// カスタムフック
export function useSceneManager(initialScenes?: Scene[]) {
  const [state, dispatch] = useReducer(sceneReducer, initialState, (initial) => {
    if (initialScenes && initialScenes.length > 0) {
      const newState = sceneReducer(initial, { 
        type: 'SET_SCENES', 
        payload: initialScenes as unknown as any 
      });
      return newState;
    }
    return initial;
  });
  
  // シーン追加
  const addScene = useCallback((scene: Omit<Scene, 'id' | 'order'>) => {
    dispatch({
      type: 'ADD_SCENE',
      payload: {
        ...scene,
        id: generateSceneId(),
      } as unknown as any,
    });
  }, []);
  
  // シーン更新
  const updateScene = useCallback((id: string, updates: Partial<Scene>) => {
    dispatch({
      type: 'UPDATE_SCENE',
      payload: { id, updates },
    });
  }, []);
  
  // シーン削除
  const deleteScene = useCallback((id: string) => {
    dispatch({
      type: 'DELETE_SCENE',
      payload: { id },
    });
  }, []);
  
  // シーン並び替え
  const reorderScene = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({
      type: 'REORDER_SCENES',
      payload: { fromIndex, toIndex },
    });
  }, []);
  
  // シーンを幕に移動
  const moveSceneToActById = useCallback((sceneId: string, actId: string, position?: number) => {
    dispatch({
      type: 'MOVE_SCENE_TO_ACT',
      payload: { sceneId, actId, position },
    });
  }, []);
  
  // シーン一括設定
  const setScenes = useCallback((scenes: Scene[]) => {
    dispatch({
      type: 'SET_SCENES',
      payload: scenes as unknown as any,
    });
  }, []);
  
  // バリデーション実行
  const validateScenes = useCallback(() => {
    dispatch({ type: 'VALIDATE_SCENES' });
  }, []);
  
  // 幕ごとのシーン取得
  const getScenesByAct = useCallback((actId: string) => {
    const act = state.acts.find(a => a.id === actId);
    if (!act) return [];
    
    return state.scenes
      .filter(scene => act.sceneIds.includes(scene.id))
      .sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0));
  }, [state.acts, state.scenes]);
  
  // シーンの総時間計算
  const totalDuration = useMemo(() => {
    return state.scenes.reduce((total, scene) => total + (scene.duration || 0), 0);
  }, [state.scenes]);
  
  // 話者リスト取得
  const speakers = useMemo(() => {
    const speakerSet = new Set(state.scenes.map(scene => (scene as any).speaker));
    return Array.from(speakerSet);
  }, [state.scenes]);
  
  return {
    // 状態
    state,
    scenes: state.scenes,
    acts: state.acts,
    totalScenes: state.totalScenes,
    isValid: state.isValid,
    validationErrors: state.validationErrors,
    
    // 計算値
    totalDuration,
    speakers,
    
    // アクション
    addScene,
    updateScene,
    deleteScene,
    reorderScene,
    moveSceneToActById,
    setScenes,
    validateScenes,
    getScenesByAct,
  };
}