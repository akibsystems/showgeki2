import { useCallback } from 'react';
import type { MulmoSpeakerDataSchema } from '@/lib/schemas';
import type { VoiceId } from '../types';
import { z } from 'zod';

// schemasに合わせた型定義
type Speaker = z.infer<typeof MulmoSpeakerDataSchema> & {
  voiceId: VoiceId; // より厳密な型に
};

interface SpeakerManagerProps {
  speakers: Record<string, Speaker>;
  onUpdate: (speakers: Record<string, Speaker>) => void;
}

export function useSpeakerManager({ speakers, onUpdate }: SpeakerManagerProps) {
  // 新しい話者を追加
  const addSpeaker = useCallback((
    speakerId: string,
    voiceId: VoiceId,
    displayName: { ja: string; en: string }
  ) => {
    if (speakers[speakerId]) {
      throw new Error(`話者ID "${speakerId}" は既に存在します`);
    }

    const newSpeakers = {
      ...speakers,
      [speakerId]: {
        voiceId,
        displayName,
      },
    };

    onUpdate(newSpeakers);
    return speakerId;
  }, [speakers, onUpdate]);

  // 話者を更新
  const updateSpeaker = useCallback((
    speakerId: string,
    updates: Partial<{ voiceId: VoiceId; displayName: { ja: string; en: string } }>
  ) => {
    if (!speakers[speakerId]) {
      throw new Error(`話者ID "${speakerId}" が見つかりません`);
    }

    const newSpeakers = {
      ...speakers,
      [speakerId]: {
        ...speakers[speakerId],
        ...updates,
      },
    };

    onUpdate(newSpeakers);
  }, [speakers, onUpdate]);

  // 話者を削除
  const deleteSpeaker = useCallback((speakerId: string) => {
    if (!speakers[speakerId]) {
      throw new Error(`話者ID "${speakerId}" が見つかりません`);
    }

    const newSpeakers = { ...speakers };
    delete newSpeakers[speakerId];
    onUpdate(newSpeakers);
  }, [speakers, onUpdate]);

  // 話者IDの重複チェック
  const isSpeakerIdExists = useCallback((speakerId: string) => {
    return !!speakers[speakerId];
  }, [speakers]);

  // 新しい話者IDを生成（重複回避）
  const generateSpeakerId = useCallback((baseName: string = 'Speaker') => {
    let counter = 1;
    let candidateId = baseName;

    while (speakers[candidateId]) {
      candidateId = `${baseName}${counter}`;
      counter++;
    }

    return candidateId;
  }, [speakers]);

  // デフォルト話者を作成
  const createDefaultSpeakers = useCallback(() => {
    const defaultSpeakers: Record<string, Speaker> = {
      Narrator: {
        voiceId: 'shimmer',
        displayName: {
          ja: '語り手',
          en: 'Narrator',
        },
      },
      Character: {
        voiceId: 'alloy',
        displayName: {
          ja: '主人公',
          en: 'Main Character',
        },
      },
      WiseCharacter: {
        voiceId: 'echo',
        displayName: {
          ja: '賢者',
          en: 'Wise Character',
        },
      },
    };

    onUpdate(defaultSpeakers);
    return defaultSpeakers;
  }, [onUpdate]);

  // 話者数を取得
  const getSpeakerCount = useCallback(() => {
    return Object.keys(speakers).length;
  }, [speakers]);

  // 話者IDリストを取得
  const getSpeakerIds = useCallback(() => {
    return Object.keys(speakers);
  }, [speakers]);

  // 話者情報を取得
  const getSpeaker = useCallback((speakerId: string) => {
    return speakers[speakerId] || null;
  }, [speakers]);

  // バリデーション
  const validateSpeakerData = useCallback((
    speakerId: string,
    voiceId: VoiceId,
    displayName: { ja: string; en: string }
  ): string[] => {
    const errors: string[] = [];

    // 話者IDバリデーション
    if (!speakerId.trim()) {
      errors.push('話者IDを入力してください');
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(speakerId)) {
      errors.push('話者IDは英数字とアンダースコアのみ使用可能で、英字で始まる必要があります');
    } else if (speakerId.length > 50) {
      errors.push('話者IDは50文字以内で入力してください');
    }

    // 表示名バリデーション
    if (!displayName.ja.trim()) {
      errors.push('日本語表示名を入力してください');
    } else if (displayName.ja.length > 100) {
      errors.push('日本語表示名は100文字以内で入力してください');
    }

    if (!displayName.en.trim()) {
      errors.push('英語表示名を入力してください');
    } else if (displayName.en.length > 100) {
      errors.push('英語表示名は100文字以内で入力してください');
    }

    return errors;
  }, []);

  return {
    // アクション
    addSpeaker,
    updateSpeaker,
    deleteSpeaker,
    createDefaultSpeakers,
    
    // ユーティリティ
    isSpeakerIdExists,
    generateSpeakerId,
    getSpeakerCount,
    getSpeakerIds,
    getSpeaker,
    validateSpeakerData,
    
    // 状態
    speakers,
  };
}