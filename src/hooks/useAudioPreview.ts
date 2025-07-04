import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface AudioFile {
  beatIndex: number;
  fileName: string;
  url: string;
  speakerId: string | null;
  text: string;
}

interface AudioPreviewData {
  audioFiles: AudioFile[];
  generatedAt: string;
  audioCount: number;
}

interface UseAudioPreviewOptions {
  storyId: string;
}

export function useAudioPreview({ storyId }: UseAudioPreviewOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const supabase = createClient();

  // Get UID on mount
  useEffect(() => {
    const loadUid = async () => {
      try {
        const { getOrCreateUid } = await import('@/lib/uid');
        const currentUid = await getOrCreateUid();
        setUid(currentUid);
      } catch (err) {
        console.error('Failed to get UID:', err);
      }
    };
    loadUid();
  }, []);

  // Fetch video data with audio preview
  const { data: video, error: fetchError, mutate } = useSWR(
    storyId && uid ? `audio-preview-${storyId}-${uid}` : null,
    async () => {
      try {
        console.log(`📡 Fetching audio preview for story: ${storyId}, uid: ${uid}`);
        
        // まずaudio_preview_dataがあるvideoを探す（UIDに関係なく）
        const { data: videosWithAudio, error: audioError } = await supabase
          .from('videos')
          .select('*')
          .eq('story_id', storyId)
          .not('audio_preview_data', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!audioError && videosWithAudio && videosWithAudio.length > 0) {
          console.log('Found video with audio preview data (any UID):', {
            videoId: videosWithAudio[0].id,
            uid: videosWithAudio[0].uid,
            hasAudioData: !!videosWithAudio[0].audio_preview_data
          });
          return videosWithAudio[0];
        }

        // audio_preview_dataがない場合は最新のvideoを取得（現在のUIDで）
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('story_id', storyId)
          .eq('uid', uid!)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.log('Audio preview query error:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // videosレコードが存在しない場合は正常なケースとして扱う
          if (error.code === 'PGRST116') {
            console.log('No video record found - this is normal for new stories');
            return null;
          }
          
          // その他のエラーも一旦nullを返して処理を継続
          return null;
        }
        
        console.log('Audio preview data fetched:', data ? 'found' : 'not found');
        if (data?.audio_preview_data) {
          console.log('Audio preview data content:', data.audio_preview_data);
        }
        return data;
      } catch (err) {
        console.error('Unexpected error in audio preview fetcher:', err);
        // エラーが発生してもnullを返してアプリケーションを継続する
        return null;
      }
    },
    {
      // エラーが発生してもリトライしない
      shouldRetryOnError: false,
      // エラーハンドリングをカスタマイズ
      onError: (err) => {
        console.error('SWR error in useAudioPreview:', err);
      }
    }
  );

  // Subscribe to realtime updates
  useEffect(() => {
    if (!storyId || !video?.id) return;

    const channel = supabase
      .channel(`audio-preview-${video.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'videos',
          filter: `id=eq.${video.id}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Audio preview update:', payload);
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storyId, video?.id, supabase, mutate]);

  const generateAudioPreview = useCallback(async () => {
    if (!storyId) {
      setError('Story ID is required');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Get current UID to send in headers
      const currentUid = uid || await import('@/lib/uid').then(m => m.getOrCreateUid());
      
      const response = await fetch(`/api/stories/${storyId}/audio-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': currentUid,
        },
      });

      console.log('Audio preview API response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate audio preview';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('API error details:', errorData);
        } catch (e) {
          // レスポンスがJSONでない場合
          const errorText = await response.text();
          console.error('API error text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Audio preview generation started:', result);

      // Re-fetch data
      mutate();
    } catch (err) {
      console.error('Audio preview error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, [storyId, mutate, uid]);

  const refreshStatus = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    status: video?.preview_status || null,
    isLoading: !fetchError && !video && !!storyId,
    isGenerating: isGenerating || video?.preview_status === 'processing',
    error: error || (fetchError ? (typeof fetchError === 'object' && 'message' in fetchError ? fetchError.message : 'Unknown error') : null),
    audioPreviewData: video?.audio_preview_data as AudioPreviewData | null,
    generateAudioPreview,
    refreshStatus,
  };
}