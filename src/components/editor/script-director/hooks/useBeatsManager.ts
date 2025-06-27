import { useCallback } from 'react';
import type { MulmoBeat } from '@/lib/schemas';

interface BeatsManagerProps {
  beats: MulmoBeat[];
  onUpdate: (beats: MulmoBeat[]) => void;
}

export function useBeatsManager({ beats, onUpdate }: BeatsManagerProps) {
  // 新しいビートを追加
  const addBeat = useCallback((position?: number) => {
    const newBeat: MulmoBeat = {
      speaker: '',
      text: '',
      imagePrompt: '',
    };

    const newBeats = [...beats];
    if (position !== undefined && position >= 0 && position <= beats.length) {
      newBeats.splice(position, 0, newBeat);
    } else {
      newBeats.push(newBeat);
    }

    onUpdate(newBeats);
    return newBeats.length - 1; // 新しいビートのインデックスを返す
  }, [beats, onUpdate]);

  // ビートを更新
  const updateBeat = useCallback((index: number, updatedBeat: MulmoBeat) => {
    if (index < 0 || index >= beats.length) {
      throw new Error(`無効なビートインデックス: ${index}`);
    }

    const newBeats = [...beats];
    newBeats[index] = { ...updatedBeat };
    onUpdate(newBeats);
  }, [beats, onUpdate]);

  // ビートを削除
  const deleteBeat = useCallback((index: number) => {
    if (index < 0 || index >= beats.length) {
      throw new Error(`無効なビートインデックス: ${index}`);
    }

    const newBeats = beats.filter((_, i) => i !== index);
    onUpdate(newBeats);
  }, [beats, onUpdate]);

  // ビートを移動
  const moveBeat = useCallback((index: number, direction: 'up' | 'down') => {
    if (index < 0 || index >= beats.length) {
      throw new Error(`無効なビートインデックス: ${index}`);
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= beats.length) {
      return; // 移動できない場合は何もしない
    }

    const newBeats = [...beats];
    [newBeats[index], newBeats[newIndex]] = [newBeats[newIndex], newBeats[index]];
    onUpdate(newBeats);
  }, [beats, onUpdate]);

  // ビートを並び替え（ドラッグ&ドロップ用）
  const reorderBeats = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= beats.length || toIndex < 0 || toIndex >= beats.length) {
      throw new Error(`無効なビートインデックス: ${fromIndex} -> ${toIndex}`);
    }

    if (fromIndex === toIndex) {
      return;
    }

    const newBeats = [...beats];
    const [movedBeat] = newBeats.splice(fromIndex, 1);
    newBeats.splice(toIndex, 0, movedBeat);
    onUpdate(newBeats);
  }, [beats, onUpdate]);

  // デフォルトビートを作成（5幕構成）
  const createDefaultBeats = useCallback(() => {
    const defaultBeats: MulmoBeat[] = [
      {
        speaker: 'Narrator',
        text: '昔々、ある場所で物語が始まりました...',
        imagePrompt: '物語の始まりを感じさせる美しい風景',
      },
      {
        speaker: 'Character',
        text: 'これは私の夢への第一歩です...',
        imagePrompt: '希望に満ちた主人公の表情',
      },
      {
        speaker: 'Narrator',
        text: 'しかし、道のりは決して平坦ではありませんでした...',
        imagePrompt: '困難を示唆する場面',
      },
      {
        speaker: 'WiseCharacter',
        text: '真の勇気とは、恐れを感じながらも前に進むことです...',
        imagePrompt: '知恵と勇気を象徴する場面',
      },
      {
        speaker: 'Narrator',
        text: 'そして物語は新たな始まりへと続いていくのでした...',
        imagePrompt: '希望に満ちた未来への展望',
      },
    ];

    onUpdate(defaultBeats);
    return defaultBeats;
  }, [onUpdate]);

  // ビート数を取得
  const getBeatCount = useCallback(() => {
    return beats.length;
  }, [beats]);

  // 特定のビートを取得
  const getBeat = useCallback((index: number) => {
    if (index < 0 || index >= beats.length) {
      return null;
    }
    return beats[index];
  }, [beats]);

  // すべてのビートをクリア
  const clearAllBeats = useCallback(() => {
    onUpdate([]);
  }, [onUpdate]);

  // ビートの検証
  const validateBeat = useCallback((beat: MulmoBeat): string[] => {
    const errors: string[] = [];

    if (!beat.speaker?.trim()) {
      errors.push('話者を選択してください');
    }

    if (!beat.text?.trim()) {
      errors.push('台詞を入力してください');
    } else if (beat.text.length > 1000) {
      errors.push('台詞は1000文字以内で入力してください');
    }

    if (beat.imagePrompt && beat.imagePrompt.length > 1000) {
      errors.push('画像の指示は1000文字以内で入力してください');
    }

    return errors;
  }, []);

  // 全ビートの検証
  const validateAllBeats = useCallback((): Record<number, string[]> => {
    const allErrors: Record<number, string[]> = {};

    beats.forEach((beat, index) => {
      const errors = validateBeat(beat);
      if (errors.length > 0) {
        allErrors[index] = errors;
      }
    });

    return allErrors;
  }, [beats, validateBeat]);

  // ビートの統計情報を取得
  const getBeatStats = useCallback(() => {
    const totalCharacters = beats.reduce((sum, beat) => sum + (beat.text?.length || 0), 0);
    const averageLength = beats.length > 0 ? Math.round(totalCharacters / beats.length) : 0;
    const speakers = new Set(beats.map(beat => beat.speaker).filter(Boolean));

    return {
      count: beats.length,
      totalCharacters,
      averageLength,
      uniqueSpeakers: speakers.size,
      speakerList: Array.from(speakers),
    };
  }, [beats]);

  return {
    // アクション
    addBeat,
    updateBeat,
    deleteBeat,
    moveBeat,
    reorderBeats,
    createDefaultBeats,
    clearAllBeats,
    
    // ユーティリティ
    getBeatCount,
    getBeat,
    validateBeat,
    validateAllBeats,
    getBeatStats,
    
    // 状態
    beats,
  };
}