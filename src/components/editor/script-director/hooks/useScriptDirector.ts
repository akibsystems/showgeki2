import { useState, useCallback } from 'react';
import type { Mulmoscript } from '@/lib/schemas';
import type { ScriptDirectorState, ValidationErrors } from '../types';

const initialState: ScriptDirectorState = {
  // UI状態
  activeTab: 'beats', // デフォルトは台本編集
  editingBeat: null,
  draggedBeat: null,
  
  // モーダル状態
  showImageModal: false,
  showSpeakerModal: false,
  editingImage: null,
  editingSpeaker: null,
  
  // フォーム状態
  imageForm: {
    name: '',
    sourceType: 'file',
    file: null,
    url: '',
    preview: null,
  },
  speakerForm: {
    id: '',
    voiceId: 'shimmer',
    displayName: {
      ja: '',
      en: '',
    },
  },
  
  // バリデーション
  errors: {},
};

export function useScriptDirector(
  initialScript: Mulmoscript,
  onChange: (script: Mulmoscript) => void
) {
  const [script, setScript] = useState<Mulmoscript>(initialScript);
  const [state, setState] = useState<ScriptDirectorState>(initialState);

  // スクリプト更新のヘルパー関数
  const updateScript = useCallback((newScript: Mulmoscript) => {
    setScript(newScript);
    onChange(newScript);
  }, [onChange]);

  // タイトル更新
  const updateTitle = useCallback((title: string) => {
    const newScript = { ...script, title };
    updateScript(newScript);
  }, [script, updateScript]);

  // タブ切り替え（モバイル用）
  const setActiveTab = useCallback((tab: 'image' | 'speech' | 'beats') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // エラー設定
  const setError = useCallback((field: string, error: string | undefined) => {
    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: error,
      },
    }));
  }, []);

  // エラークリア
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {},
    }));
  }, []);

  // タイトルバリデーション
  const validateTitle = useCallback((title: string): string | undefined => {
    if (!title.trim()) {
      return 'タイトルを入力してください';
    }
    if (title.length > 100) {
      return 'タイトルは100文字以内で入力してください';
    }
    return undefined;
  }, []);

  return {
    // 状態
    script,
    state,
    
    // アクション
    updateTitle,
    setActiveTab,
    setError,
    clearErrors,
    validateTitle,
    
    // 内部状態管理
    setState,
    updateScript,
  };
}