/**
 * ScriptDirector V2 Workflow API Client
 */

interface ScreenplayResponse {
  success: boolean;
  screenplay: {
    acts: Array<{
      id: string;
      title: string;
      description: string;
      scenes: Array<{
        id: string;
        title: string;
        description: string;
      }>;
    }>;
    characters: Array<{
      id: string;
      name: string;
      description: string;
      personality: string;
      role: string;
    }>;
  };
}

interface SceneScriptsResponse {
  success: boolean;
  sceneScripts: {
    scenes: Array<{
      sceneId: string;
      actId: string;
      title: string;
      speaker: string;
      dialogue: string;
      imagePrompt: string;
      narration?: string;
      duration?: number;
    }>;
  };
}

interface FinalVideoResponse {
  success: boolean;
  video: {
    id: string;
    story_id: string;
    status: string;
  };
  mulmoscript: any;
}

/**
 * ステップ1完了時：初期脚本案を生成
 */
export async function generateScreenplay(
  storyId: string,
  uid: string
): Promise<ScreenplayResponse> {
  const response = await fetch(`/api/stories/${storyId}/workflow/generate-screenplay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-UID': uid,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate screenplay');
  }

  return response.json();
}

/**
 * ステップ3完了時：シーンごとの脚本と画像案を生成
 */
export async function generateSceneScripts(
  storyId: string,
  uid: string,
  characters: Array<{
    id: string;
    name: string;
    voiceId: string;
  }>
): Promise<SceneScriptsResponse> {
  const response = await fetch(`/api/stories/${storyId}/workflow/generate-scene-scripts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-UID': uid,
    },
    body: JSON.stringify({ characters }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate scene scripts');
  }

  return response.json();
}

/**
 * ステップ5完了時：最終動画を生成
 */
export async function generateFinalVideo(
  storyId: string,
  uid: string,
  videoConfig: {
    scenes: any[];
    characters: any[];
    audioSettings: any;
    bgmSettings: any;
    subtitleSettings: any;
  }
): Promise<FinalVideoResponse> {
  const response = await fetch(`/api/stories/${storyId}/workflow/generate-final-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-UID': uid,
    },
    body: JSON.stringify(videoConfig),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate video');
  }

  return response.json();
}

/**
 * 動画生成ステータスを確認
 */
export async function getVideoStatus(
  videoId: string,
  uid: string
): Promise<{
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  url?: string;
  error_msg?: string;
}> {
  const response = await fetch(`/api/videos/${videoId}/status`, {
    method: 'GET',
    headers: {
      'X-User-UID': uid,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get video status');
  }

  return response.json();
}

/**
 * 画像を再生成
 */
export async function regenerateSceneImage(
  storyId: string,
  sceneId: string,
  imagePrompt: string,
  uid: string
): Promise<{ imageUrl: string }> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * カスタムアセットをアップロード
 */
export async function uploadCustomAsset(
  file: File,
  assetType: 'character_image' | 'additional_image' | 'custom_audio' | 'custom_bgm',
  uid: string
): Promise<{ assetId: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('assetType', assetType);

  // TODO: 実装（既存のupload-face-referenceエンドポイントを参考に）
  throw new Error('Not implemented');
}