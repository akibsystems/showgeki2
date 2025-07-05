'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useWorkflow } from '@/contexts/workflow-context';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';

interface SceneAudioSettings {
  sceneId: string;
  title: string;
  speaker: string;
  voiceId: string;
  speechRate: number;
  pitch: number;
  bgmId: string;
  bgmVolume: number;
  fadeIn: number;
  fadeOut: number;
}

interface BGMOption {
  id: string;
  name: string;
  category: string;
  mood: string;
  tempo: string;
  previewUrl?: string;
}

interface AudioBGMSettingsStepProps {
  className?: string;
  enableSpecialMode?: boolean; // カスタム音声・BGMアップロード機能
}

// デフォルトBGMオプション
const DEFAULT_BGM_OPTIONS: BGMOption[] = [
  { id: 'bgm_epic', name: 'Epic Journey', category: '壮大', mood: '感動的', tempo: '中速' },
  { id: 'bgm_emotional', name: 'Emotional Piano', category: 'ピアノ', mood: '感動的', tempo: '遅い' },
  { id: 'bgm_dramatic', name: 'Dramatic Strings', category: 'オーケストラ', mood: 'ドラマチック', tempo: '中速' },
  { id: 'bgm_hopeful', name: 'Hopeful Dawn', category: 'アンビエント', mood: '希望的', tempo: '遅い' },
  { id: 'bgm_tense', name: 'Rising Tension', category: 'シネマティック', mood: '緊張感', tempo: '速い' },
  { id: 'bgm_peaceful', name: 'Peaceful Moment', category: 'アコースティック', mood: '穏やか', tempo: '遅い' },
  { id: 'bgm_triumph', name: 'Triumphant Victory', category: 'オーケストラ', mood: '勝利', tempo: '速い' },
  { id: 'bgm_none', name: 'BGMなし', category: 'その他', mood: '-', tempo: '-' },
];

/**
 * ワークフローステップ5: 音声・BGM設定
 * 音声の詳細設定とBGMの選択
 */
export function AudioBGMSettingsStep({ className, enableSpecialMode = false }: AudioBGMSettingsStepProps) {
  const { state, updateCustomAssets } = useWorkflow();
  const { isMobile, isTabletUp } = useResponsive();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  
  // mulmoscriptから初期データを取得
  const getInitialSceneSettings = (): SceneAudioSettings[] => {
    const mulmoscript = state.story?.script_json;
    // Extract scenes from acts or fallback to empty array
    const workflowScenes = state.workflowMetadata?.acts?.flatMap(act => act.scenes) || [];
    
    if (mulmoscript?.beats && mulmoscript.beats.length > 0) {
      // speakersから音声設定を取得
      const speakers = mulmoscript.speechParams?.speakers || {};
      
      return mulmoscript.beats.map((beat: any, index: number) => {
        const workflowScene = workflowScenes[index];
        const speakerVoice = speakers[beat.speaker]?.voiceId || 'nova';
        
        // シーンの雰囲気に基づいてBGMを自動選択
        let bgmId = 'bgm_emotional'; // デフォルト
        if (index === 0) bgmId = 'bgm_hopeful'; // 最初のシーン
        else if (index === mulmoscript.beats.length - 1) bgmId = 'bgm_triumph'; // 最後のシーン
        else if (beat.text?.includes('困難') || beat.text?.includes('試練')) bgmId = 'bgm_tense';
        else if (beat.text?.includes('平和') || beat.text?.includes('穏やか')) bgmId = 'bgm_peaceful';
        
        return {
          sceneId: beat.id || `scene${index + 1}`,
          title: beat.description || `シーン ${index + 1}`,
          speaker: beat.speaker || 'ナレーター',
          voiceId: speakerVoice,
          speechRate: 1.0,
          pitch: 1.0,
          bgmId: bgmId,
          bgmVolume: 0.3,
          fadeIn: index === 0 ? 2 : 1,
          fadeOut: index === mulmoscript.beats.length - 1 ? 2 : 1,
        };
      });
    }
    
    // デフォルトのシーン設定
    return [
      {
        sceneId: 'scene1',
        title: 'プロローグ',
        speaker: '主人公',
        voiceId: 'nova',
        speechRate: 1.0,
        pitch: 1.0,
        bgmId: 'bgm_hopeful',
        bgmVolume: 0.3,
        fadeIn: 2,
        fadeOut: 1,
      },
      {
        sceneId: 'scene2',
        title: '日常の風景',
        speaker: '主人公',
        voiceId: 'nova',
        speechRate: 1.0,
        pitch: 1.0,
        bgmId: 'bgm_peaceful',
        bgmVolume: 0.2,
        fadeIn: 1,
        fadeOut: 1,
      },
      {
        sceneId: 'scene3',
        title: '試練の始まり',
        speaker: '主人公',
        voiceId: 'nova',
        speechRate: 0.95,
        pitch: 0.95,
        bgmId: 'bgm_tense',
        bgmVolume: 0.4,
        fadeIn: 0.5,
        fadeOut: 0.5,
      },
    ];
  };
  
  const [sceneSettings, setSceneSettings] = useState<SceneAudioSettings[]>(getInitialSceneSettings());

  const [selectedScene, setSelectedScene] = useState<string>(sceneSettings[0]?.sceneId || '');
  const [globalSettings, setGlobalSettings] = useState({
    enableSubtitles: true,
    subtitleLanguage: 'ja',
    audioVolume: 1.0,
    masterBGMVolume: 0.5,
  });
  const [customBGMs, setCustomBGMs] = useState<Array<{
    id: string;
    name: string;
    file: File;
    url: string;
  }>>([]);

  const selectedSceneData = sceneSettings.find(s => s.sceneId === selectedScene);

  // シーン設定の更新
  const updateSceneSettings = useCallback((sceneId: string, updates: Partial<SceneAudioSettings>) => {
    setSceneSettings(prev => prev.map(scene => 
      scene.sceneId === sceneId ? { ...scene, ...updates } : scene
    ));
  }, []);

  // カスタム音声のアップロード
  const handleAudioUpload = useCallback((file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('音声ファイルを選択してください');
      return;
    }

    // TODO: カスタム音声のアップロード処理
    console.log('Uploading custom audio:', file.name);
  }, []);

  // カスタムBGMのアップロード
  const handleBGMUpload = useCallback((file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('音声ファイルを選択してください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newBGM = {
        id: `custom_bgm_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        file,
        url: e.target?.result as string,
      };
      setCustomBGMs(prev => [...prev, newBGM]);
    };
    reader.readAsDataURL(file);
  }, []);

  // 音声プレビュー
  const previewVoice = useCallback((sceneId: string) => {
    // TODO: 音声プレビューの実装
    console.log('Preview voice for scene:', sceneId);
  }, []);

  // BGMプレビュー
  const previewBGM = useCallback((bgmId: string) => {
    // TODO: BGMプレビューの実装
    console.log('Preview BGM:', bgmId);
  }, []);


  // シーン音声設定エディター
  const renderSceneAudioEditor = () => {
    if (!selectedSceneData) return null;

    return (
      <div className="space-y-6">
        {/* シーンヘッダー */}
        <div className="border-b border-gray-700 pb-4">
          <h3 className="text-lg font-semibold">{selectedSceneData.title}</h3>
          <p className="text-sm text-gray-400 mt-1">話者: {selectedSceneData.speaker}</p>
        </div>

        {/* 音声設定 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">音声設定</h4>
            <button
              onClick={() => previewVoice(selectedSceneData.sceneId)}
              className="text-xs text-shakespeare-purple hover:text-shakespeare-purple/80"
            >
              プレビュー
            </button>
          </div>

          {/* 話速 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">話速</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={selectedSceneData.speechRate}
                onChange={(e) => updateSceneSettings(selectedSceneData.sceneId, { speechRate: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-mono min-w-[3rem] text-right">
                {selectedSceneData.speechRate.toFixed(2)}x
              </span>
            </div>
          </div>

          {/* ピッチ */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">ピッチ</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={selectedSceneData.pitch}
                onChange={(e) => updateSceneSettings(selectedSceneData.sceneId, { pitch: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-mono min-w-[3rem] text-right">
                {selectedSceneData.pitch.toFixed(2)}
              </span>
            </div>
          </div>

          {/* カスタム音声アップロード（特別モード） */}
          {enableSpecialMode && (
            <div className="mt-4">
              <button
                onClick={() => audioInputRef.current?.click()}
                className="w-full p-3 border-2 border-dashed border-gray-700 rounded-lg text-sm text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-all"
              >
                カスタム音声をアップロード
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAudioUpload(file);
                }}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* BGM設定 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">BGM設定</h4>
            <button
              onClick={() => previewBGM(selectedSceneData.bgmId)}
              className="text-xs text-shakespeare-purple hover:text-shakespeare-purple/80"
            >
              プレビュー
            </button>
          </div>

          {/* BGM選択 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">BGM選択</label>
            <select
              value={selectedSceneData.bgmId}
              onChange={(e) => updateSceneSettings(selectedSceneData.sceneId, { bgmId: e.target.value })}
              className="input-responsive"
            >
              <optgroup label="デフォルトBGM">
                {DEFAULT_BGM_OPTIONS.map(bgm => (
                  <option key={bgm.id} value={bgm.id}>
                    {bgm.name} - {bgm.mood}
                  </option>
                ))}
              </optgroup>
              {customBGMs.length > 0 && (
                <optgroup label="カスタムBGM">
                  {customBGMs.map(bgm => (
                    <option key={bgm.id} value={bgm.id}>
                      {bgm.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* BGM音量 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">BGM音量</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={selectedSceneData.bgmVolume}
                onChange={(e) => updateSceneSettings(selectedSceneData.sceneId, { bgmVolume: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-mono min-w-[3rem] text-right">
                {Math.round(selectedSceneData.bgmVolume * 100)}%
              </span>
            </div>
          </div>

          {/* フェード設定 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-400">フェードイン（秒）</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={selectedSceneData.fadeIn}
                onChange={(e) => updateSceneSettings(selectedSceneData.sceneId, { fadeIn: parseFloat(e.target.value) })}
                className="input-responsive"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400">フェードアウト（秒）</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={selectedSceneData.fadeOut}
                onChange={(e) => updateSceneSettings(selectedSceneData.sceneId, { fadeOut: parseFloat(e.target.value) })}
                className="input-responsive"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center mb-8">
        <h2 className="text-responsive-2xl font-bold mb-2">音声・BGM設定</h2>
        <p className="text-gray-400">
          最終的な音響効果を調整します
        </p>
      </div>

      {/* グローバル設定 */}
      <div className="card-responsive mb-6">
        <h3 className="text-sm font-medium mb-4">全体設定</h3>
        <div className="space-y-4">
          {/* 字幕設定 */}
          <div className="flex items-center justify-between">
            <label className="text-sm">字幕を表示</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={globalSettings.enableSubtitles}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, enableSubtitles: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-shakespeare-purple"></div>
            </label>
          </div>

          {globalSettings.enableSubtitles && (
            <div className="space-y-2 pl-4">
              <label className="text-xs text-gray-400">字幕言語</label>
              <select
                value={globalSettings.subtitleLanguage}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, subtitleLanguage: e.target.value }))}
                className="input-responsive"
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </div>
          )}

          {/* マスター音量 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">音声マスター音量</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={globalSettings.audioVolume}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, audioVolume: parseFloat(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-sm font-mono min-w-[3rem] text-right">
                {Math.round(globalSettings.audioVolume * 100)}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400">BGMマスター音量</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={globalSettings.masterBGMVolume}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, masterBGMVolume: parseFloat(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-sm font-mono min-w-[3rem] text-right">
                {Math.round(globalSettings.masterBGMVolume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* カスタムBGMアップロード（特別モード） */}
      {enableSpecialMode && (
        <div className="card-responsive mb-6">
          <h3 className="text-sm font-medium mb-4">カスタムBGM</h3>
          <div className="space-y-4">
            <button
              onClick={() => bgmInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-gray-700 rounded-lg text-sm text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-all"
            >
              BGMファイルをアップロード
            </button>
            <input
              ref={bgmInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBGMUpload(file);
              }}
              className="hidden"
            />
            
            {customBGMs.length > 0 && (
              <div className="space-y-2">
                {customBGMs.map(bgm => (
                  <div key={bgm.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                    <span className="text-sm">{bgm.name}</span>
                    <button
                      onClick={() => setCustomBGMs(prev => prev.filter(b => b.id !== bgm.id))}
                      className="text-red-500 hover:text-red-400 text-sm"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* シーン別設定 */}
      <div className={cn(
        'grid gap-6',
        isTabletUp ? 'grid-cols-3' : 'grid-cols-1'
      )}>
        {/* シーンリスト */}
        <div className={cn(
          isTabletUp ? 'col-span-1' : 'col-span-1'
        )}>
          <h3 className="text-sm font-medium mb-4">シーン一覧</h3>
          <div className="space-y-2">
            {sceneSettings.map((scene, index) => (
              <button
                key={scene.sceneId}
                onClick={() => setSelectedScene(scene.sceneId)}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-all',
                  selectedScene === scene.sceneId
                    ? 'bg-shakespeare-purple/20 ring-1 ring-shakespeare-purple'
                    : 'bg-gray-800/50 hover:bg-gray-800/70'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      場{index + 1}: {scene.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      BGM: {DEFAULT_BGM_OPTIONS.find(b => b.id === scene.bgmId)?.name || 'カスタム'}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 詳細設定 */}
        <div className={cn(
          isTabletUp ? 'col-span-2' : 'col-span-1'
        )}>
          <div className="card-responsive">
            {renderSceneAudioEditor()}
          </div>
        </div>
      </div>

    </div>
  );
}