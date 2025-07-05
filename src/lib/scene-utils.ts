import { Scene, SceneListState } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// MulmoBeat型定義（schemas.tsのMulmoBeatSchemaと互換）
interface MulmoBeat {
  speaker?: string;
  text?: string;
  id?: string;
  description?: string;
  image?: any;
  imagePrompt?: string;
  duration?: number;
  captionParams?: {
    lang: string;
    styles?: string[];
  };
}

/**
 * MulmoscriptのbeatsをSceneリストに変換
 * @param beats MulmoBeatの配列
 * @param acts 幕情報（オプショナル）
 * @returns SceneListState
 */
export function convertBeatsToScenes(
  beats: MulmoBeat[],
  acts?: { id: string; title: string; description?: string; scenes: string[] }[]
): SceneListState {
  const scenes: Scene[] = beats.map((beat, index) => ({
    id: beat.id || generateSceneId(),
    speaker: beat.speaker || 'Presenter',
    text: beat.text || '',
    description: beat.description,
    imagePrompt: beat.imagePrompt,
    image: beat.image,
    duration: beat.duration,
    captionParams: beat.captionParams,
    order: index,
  }));

  // 幕情報がない場合は自動的に5幕構成を生成
  const defaultActs = acts || generateDefaultActs(scenes.length);
  
  // シーンIDと幕の関連付け
  const scenesWithActs = scenes.map((scene) => {
    const act = defaultActs.find(a => a.scenes?.includes(scene.id));
    return {
      ...scene,
      actId: act?.id,
    };
  });

  return {
    scenes: scenesWithActs as any,
    acts: defaultActs.map(act => ({
      id: act.id,
      title: act.title,
      description: act.description,
      sceneIds: act.scenes || [],
    })),
    totalScenes: scenes.length,
    isValid: validateSceneList({ scenes: scenesWithActs as any, acts: defaultActs, totalScenes: scenes.length, isValid: true } as any),
    validationErrors: [],
  };
}

/**
 * SceneリストをMulmoscriptのbeatsに変換
 * @param sceneList SceneListState
 * @returns MulmoBeatの配列
 */
export function convertScenesToBeats(sceneList: SceneListState): MulmoBeat[] {
  return sceneList.scenes
    .sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0))
    .map(scene => {
      const sceneAny = scene as any;
      return {
        id: sceneAny.id,
        speaker: sceneAny.speaker,
        text: sceneAny.text || sceneAny.content,
        description: sceneAny.description,
        imagePrompt: sceneAny.imagePrompt,
        image: sceneAny.image,
        duration: sceneAny.duration,
        captionParams: sceneAny.captionParams,
      };
    });
}

/**
 * 新しいシーンIDを生成
 * @returns UUID文字列
 */
export function generateSceneId(): string {
  return uuidv4();
}

/**
 * SceneListStateのバリデーション
 * @param sceneList SceneListState
 * @returns バリデーション結果とエラーメッセージ
 */
export function validateSceneList(sceneList: SceneListState): boolean {
  const errors: string[] = [];
  
  // シーン数のチェック
  if (sceneList.scenes.length === 0) {
    errors.push('シーンが1つも存在しません');
  }
  
  if (sceneList.scenes.length > 20) {
    errors.push('シーン数は20以下にしてください');
  }
  
  // 各シーンのバリデーション
  sceneList.scenes.forEach((scene, index) => {
    const sceneAny = scene as any;
    if (!sceneAny.id) {
      errors.push(`シーン${index + 1}にIDがありません`);
    }
    
    if (!sceneAny.speaker) {
      errors.push(`シーン${index + 1}に話者が設定されていません`);
    }
    
    if (!sceneAny.text || sceneAny.text.trim() === '') {
      errors.push(`シーン${index + 1}のテキストが空です`);
    }
    
    // 画像設定のバリデーション
    if (sceneAny.image) {
      if (sceneAny.image.type === 'image' && !sceneAny.image.source) {
        errors.push(`シーン${index + 1}の画像ソースが設定されていません`);
      }
      
      if (sceneAny.image.type === 'textSlide' && !sceneAny.image.slide) {
        errors.push(`シーン${index + 1}のスライド情報が設定されていません`);
      }
    }
  });
  
  // 幕情報のバリデーション
  if (sceneList.acts && sceneList.acts.length > 0) {
    const allSceneIds = new Set(sceneList.scenes.map(s => s.id));
    
    sceneList.acts.forEach((act, index) => {
      if (!act.id) {
        errors.push(`第${index + 1}幕にIDがありません`);
      }
      
      if (!act.title) {
        errors.push(`第${index + 1}幕にタイトルがありません`);
      }
      
      // 幕に含まれるシーンIDの検証
      act.sceneIds.forEach(sceneId => {
        if (!allSceneIds.has(sceneId)) {
          errors.push(`第${index + 1}幕に存在しないシーンID: ${sceneId}`);
        }
      });
    });
    
    // すべてのシーンがいずれかの幕に属しているかチェック
    const assignedSceneIds = new Set(sceneList.acts.flatMap(act => act.sceneIds));
    sceneList.scenes.forEach(scene => {
      if (!assignedSceneIds.has(scene.id)) {
        errors.push(`シーン「${scene.id}」がどの幕にも属していません`);
      }
    });
  }
  
  // エラーがあれば、sceneListにセット
  if (errors.length > 0) {
    sceneList.validationErrors = errors;
    return false;
  }
  
  return true;
}

/**
 * デフォルトの5幕構成を生成
 * @param totalScenes 総シーン数
 * @returns 幕情報の配列
 */
function generateDefaultActs(totalScenes: number): { id: string; title: string; description?: string; scenes: string[] }[] {
  const acts = [
    { id: 'act-1', title: '第一幕：発端', description: '物語の始まり' },
    { id: 'act-2', title: '第二幕：展開', description: '物語の展開' },
    { id: 'act-3', title: '第三幕：転機', description: '物語の転機' },
    { id: 'act-4', title: '第四幕：結末への道', description: '結末への道' },
    { id: 'act-5', title: '第五幕：大団円', description: '物語の終わり' },
  ];
  
  // シーンを均等に幕に分配
  const scenesPerAct = Math.ceil(totalScenes / 5);
  let sceneIndex = 0;
  
  return acts.map((act, actIndex) => {
    const sceneCount = actIndex === 4 
      ? totalScenes - sceneIndex // 最後の幕は残りすべて
      : Math.min(scenesPerAct, totalScenes - sceneIndex);
    
    const scenes: string[] = [];
    for (let i = 0; i < sceneCount; i++) {
      scenes.push(`scene-${sceneIndex + i}`);
    }
    sceneIndex += sceneCount;
    
    return {
      ...act,
      scenes,
    };
  });
}

/**
 * シーンを別の幕に移動
 * @param sceneList 現在のSceneListState
 * @param sceneId 移動するシーンのID
 * @param targetActId 移動先の幕ID
 * @param position 挿入位置（省略時は末尾）
 * @returns 更新されたSceneListState
 */
export function moveSceneToAct(
  sceneList: SceneListState,
  sceneId: string,
  targetActId: string,
  position?: number
): SceneListState {
  const updatedActs = sceneList.acts.map(act => {
    if (act.id === targetActId) {
      // 移動先の幕
      const newSceneIds = [...act.sceneIds];
      if (!newSceneIds.includes(sceneId)) {
        if (position !== undefined && position >= 0 && position <= newSceneIds.length) {
          newSceneIds.splice(position, 0, sceneId);
        } else {
          newSceneIds.push(sceneId);
        }
      }
      return { ...act, sceneIds: newSceneIds };
    } else {
      // 他の幕からシーンを削除
      return {
        ...act,
        sceneIds: act.sceneIds.filter(id => id !== sceneId),
      };
    }
  });
  
  // シーンの幕IDを更新
  const updatedScenes = sceneList.scenes.map(scene => 
    scene.id === sceneId 
      ? { ...scene, actId: targetActId }
      : scene
  );
  
  return {
    ...sceneList,
    scenes: updatedScenes,
    acts: updatedActs,
  };
}

/**
 * シーンの並び順を変更
 * @param scenes シーンの配列
 * @param fromIndex 移動元のインデックス
 * @param toIndex 移動先のインデックス
 * @returns 並び替えられたシーンの配列
 */
export function reorderScenes(scenes: Scene[], fromIndex: number, toIndex: number): Scene[] {
  const result = [...scenes];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  
  // order値を更新
  return result.map((scene, index) => ({
    ...scene,
    order: index,
  }));
}