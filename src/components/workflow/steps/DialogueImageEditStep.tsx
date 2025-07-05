'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useWorkflow } from '@/contexts/workflow-context';
import { useApp } from '@/contexts/app-context';
import { cn } from '@/lib/utils';
import { BeatsEditor } from '@/components/editor/script-director/components/BeatsEditor';
import { useBeatsManager } from '@/components/editor/script-director/hooks/useBeatsManager';
import type { MulmoBeat, MulmoSpeakerDataSchema } from '@/lib/schemas';
import type { VoiceId } from '@/components/editor/script-director/types';
import type { PreviewData } from '@/types/preview';
import { z } from 'zod';
import '@/components/editor/script-director/styles/ScriptDirector.module.css';

// schemasに合わせた型定義
type Speaker = z.infer<typeof MulmoSpeakerDataSchema> & {
  voiceId: VoiceId;
};

interface DialogueImageEditStepProps {
  className?: string;
  enableSpecialMode?: boolean; // カスタム画像アップロード機能
}

/**
 * ワークフローステップ4: 台詞と画像編集
 * 各シーンの台詞と画像を詳細に編集
 */
export function DialogueImageEditStep({ className, enableSpecialMode = false }: DialogueImageEditStepProps) {
  const { state, updateCustomAssets, markAsUnsaved } = useWorkflow();
  const { state: appState } = useApp();
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewStatus, setPreviewStatus] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isAudioPreviewLoading, setIsAudioPreviewLoading] = useState<boolean>(false);
  const [audioPreviewStatus, setAudioPreviewStatus] = useState<string | null>(null);
  const [hasAudioPreview, setHasAudioPreview] = useState<boolean>(false);
  const [audioPreviewData, setAudioPreviewData] = useState<any>(null);

  // mulmoscriptから初期データを取得
  const getInitialBeats = useCallback((): MulmoBeat[] => {
    const mulmoscript = state.story?.script_json;
    if (mulmoscript?.beats && mulmoscript.beats.length > 0) {
      return mulmoscript.beats as MulmoBeat[];
    }
    return [];
  }, [state.story]);

  const getInitialSpeakers = useCallback((): Record<string, Speaker> => {
    const mulmoscript = state.story?.script_json;
    if (mulmoscript?.speechParams?.speakers) {
      return mulmoscript.speechParams.speakers as Record<string, Speaker>;
    }
    return {};
  }, [state.story]);

  const [beats, setBeats] = useState<MulmoBeat[]>(getInitialBeats());
  const [speakers, setSpeakers] = useState<Record<string, Speaker>>(getInitialSpeakers());
  const [faceReferences, setFaceReferences] = useState<Record<string, any>>({});

  // BeatsManagerフックを使用
  const beatsManager = useBeatsManager({
    beats,
    onUpdate: (newBeats) => {
      setBeats(newBeats);
      markAsUnsaved();
      
      // mulmoscriptに反映
      if (state.story?.script_json) {
        const updatedScript = {
          ...state.story.script_json,
          beats: newBeats
        };
        
        // TODO: ここでstateに保存する処理を追加
      }
    }
  });

  // 初期化
  useEffect(() => {
    const initialBeats = getInitialBeats();
    const initialSpeakers = getInitialSpeakers();
    setBeats(initialBeats);
    setSpeakers(initialSpeakers);
  }, [getInitialBeats, getInitialSpeakers]);

  // プレビューデータを取得する関数
  const fetchPreviewData = useCallback(async () => {
    if (!state.story?.id || !appState.uid) return;

    try {
      // 画像プレビューデータを取得
      const videoResponse = await fetch(`/api/videos?story_id=${state.story.id}`, {
        headers: {
          'X-User-UID': appState.uid,
        },
      });

      if (videoResponse.ok) {
        const videoResult = await videoResponse.json();
        console.log('Video API response:', videoResult);
        
        // レスポンス構造を修正: data.videos[0] を使用
        const video = videoResult.data?.videos?.[0];
        
        if (video?.preview_data) {
          console.log('Found existing preview data:', video.preview_data);
          setPreviewData(video.preview_data);
          setPreviewStatus(video.preview_status || 'completed');
        }

        if (video?.audio_preview_data) {
          console.log('Found existing audio preview data:', video.audio_preview_data);
          setAudioPreviewData(video.audio_preview_data);
          setHasAudioPreview(true);
          setAudioPreviewStatus(video.audio_preview_status || 'completed');
        }
      }
    } catch (error) {
      console.error('Failed to fetch existing previews:', error);
    }
  }, [state.story?.id, appState.uid]);

  // 既存のプレビューデータを取得
  useEffect(() => {
    fetchPreviewData();
  }, [fetchPreviewData]);

  // プレビュー生成
  const handleGeneratePreview = useCallback(async () => {
    if (!state.story?.id || !appState.uid) return;
    
    setIsPreviewLoading(true);
    setPreviewStatus('processing');
    
    try {
      const response = await fetch(`/api/stories/${state.story.id}/preview-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': appState.uid,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPreviewStatus('completed');
          // プレビューデータを再取得
          setTimeout(() => {
            fetchPreviewData();
          }, 1000); // 1秒後に再取得
        }
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      setPreviewStatus('failed');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [state.story?.id, appState.uid, fetchPreviewData]);

  // 音声プレビュー生成
  const handleGenerateAudioPreview = useCallback(async () => {
    if (!state.story?.id || !appState.uid) return;
    
    setIsAudioPreviewLoading(true);
    setAudioPreviewStatus('processing');
    
    try {
      const response = await fetch(`/api/stories/${state.story.id}/audio-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': appState.uid,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAudioPreviewStatus('completed');
          // プレビューデータを再取得
          setTimeout(() => {
            fetchPreviewData();
          }, 1000); // 1秒後に再取得
        }
      }
    } catch (error) {
      console.error('Audio preview generation error:', error);
      setAudioPreviewStatus('failed');
    } finally {
      setIsAudioPreviewLoading(false);
    }
  }, [state.story?.id, appState.uid, fetchPreviewData]);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center mb-8">
        <h2 className="text-responsive-2xl font-bold mb-2">台詞と画像の編集</h2>
        <p className="text-gray-400">
          各シーンの台詞と画像を細かく調整できます
        </p>
      </div>

      {/* BeatsEditorを直接使用 */}
      <BeatsEditor
        beats={beats}
        speakers={speakers}
        faceReferences={faceReferences}
        previewData={previewData}
        previewStatus={previewStatus}
        isPreviewLoading={isPreviewLoading}
        onGeneratePreview={handleGeneratePreview}
        onGenerateAudioPreview={handleGenerateAudioPreview}
        isAudioPreviewLoading={isAudioPreviewLoading}
        audioPreviewStatus={audioPreviewStatus}
        storyId={state.story?.id}
        hasAudioPreview={hasAudioPreview}
        audioPreviewData={audioPreviewData}
        onUpdateBeat={beatsManager.updateBeat}
        onAddBeat={beatsManager.addBeat}
        onDeleteBeat={beatsManager.deleteBeat}
        onMoveBeat={beatsManager.moveBeat}
        isReadOnly={false}
      />
    </div>
  );
}