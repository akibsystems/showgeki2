'use client';

import React, { useState, useEffect } from 'react';
import { MonacoEditor } from './monaco-editor';
import { Button, Card, CardContent, Spinner } from '@/components/ui';
import type { Mulmoscript } from '@/types';

// ================================================================
// Script Editor Component Types
// ================================================================

interface ScriptEditorProps {
  script: Mulmoscript | null;
  onChange: (script: Mulmoscript) => void;
  onSave?: (script: Mulmoscript) => Promise<void>;
  isReadOnly?: boolean;
  isLoading?: boolean;
  className?: string;
}

interface SceneEditorProps {
  scenes: any[];
  onChange: (scenes: any[]) => void;
  onAddScene: () => void;
  onRemoveScene: (index: number) => void;
}

// ================================================================
// Scene Visual Editor Component
// ================================================================

const SceneEditor: React.FC<SceneEditorProps> = ({
  scenes,
  onChange,
  onAddScene,
  onRemoveScene,
}) => {
  const updateScene = (index: number, field: string, value: any) => {
    const newScenes = [...scenes];
    newScenes[index] = { ...newScenes[index], [field]: value };
    onChange(newScenes);
  };

  const updateVoice = (index: number, field: string, value: string) => {
    const newScenes = [...scenes];
    newScenes[index] = {
      ...newScenes[index],
      voice: { ...newScenes[index].voice, [field]: value }
    };
    onChange(newScenes);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Scenes</h3>
        <Button variant="secondary" size="sm" onClick={onAddScene}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Scene
        </Button>
      </div>

      {scenes.map((scene, index) => (
        <Card key={scene.id || index} className="relative">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-medium text-gray-700">Scene {index + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveScene(index)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={scene.type || 'narration'}
                  onChange={(e) => updateScene(index, 'type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="narration">Narration</option>
                  <option value="dialogue">Dialogue</option>
                  <option value="action">Action</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={scene.duration || 3}
                  onChange={(e) => updateScene(index, 'duration', parseFloat(e.target.value) || 3)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={scene.content || ''}
                onChange={(e) => updateScene(index, 'content', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                placeholder="Enter scene content..."
              />
            </div>

            {scene.type === 'dialogue' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Character</label>
                  <input
                    type="text"
                    value={scene.voice?.character || ''}
                    onChange={(e) => updateVoice(index, 'character', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Character name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emotion</label>
                  <select
                    value={scene.voice?.emotion || 'neutral'}
                    onChange={(e) => updateVoice(index, 'emotion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="happy">Happy</option>
                    <option value="sad">Sad</option>
                    <option value="excited">Excited</option>
                    <option value="calm">Calm</option>
                    <option value="serious">Serious</option>
                  </select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {scenes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2M7 4h10l1 16H6L7 4zM10 6v8m4-8v8" />
          </svg>
          <p className="text-sm">No scenes yet</p>
          <p className="text-xs mt-1">Add your first scene to get started</p>
        </div>
      )}
    </div>
  );
};

// ================================================================
// Script Editor Component
// ================================================================

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  script,
  onChange,
  onSave,
  isReadOnly = false,
  isLoading = false,
  className = '',
}) => {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [jsonValue, setJsonValue] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize JSON value when script changes
  useEffect(() => {
    if (script) {
      setJsonValue(JSON.stringify(script, null, 2));
    }
  }, [script]);

  // Generate scene ID
  const generateSceneId = () => {
    return `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Create default scene
  const createDefaultScene = () => ({
    id: generateSceneId(),
    type: 'narration',
    content: '',
    duration: 3,
  });

  // Handle visual mode changes
  const handleVisualChange = (newScript: Partial<Mulmoscript>) => {
    if (script) {
      const updatedScript = { ...script, ...newScript };
      onChange(updatedScript);
    }
  };

  // Handle scene changes
  const handleScenesChange = (newScenes: any[]) => {
    if (script) {
      const totalDuration = newScenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);
      const updatedScript = {
        ...script,
        beats: newScenes
      };
      onChange(updatedScript);
    }
  };

  // Add new scene
  const handleAddScene = () => {
    if (script) {
      const newScenes = [...script.beats, createDefaultScene()];
      handleScenesChange(newScenes);
    }
  };

  // Remove scene
  const handleRemoveScene = (index: number) => {
    if (script) {
      const newScenes = script.beats.filter((_, i) => i !== index);
      handleScenesChange(newScenes);
    }
  };

  // Handle JSON code changes
  const handleJsonChange = (newValue: string) => {
    setJsonValue(newValue);
    try {
      const parsed = JSON.parse(newValue);
      onChange(parsed);
      setIsValidJson(true);
    } catch (error) {
      setIsValidJson(false);
    }
  };

  // Handle validation changes
  const handleValidationChange = (isValid: boolean) => {
    setIsValidJson(isValid);
  };

  // Save script
  const handleSave = async () => {
    if (!script || !onSave || !isValidJson) return;

    setIsSaving(true);
    try {
      await onSave(script);
    } catch (error) {
      console.error('Failed to save script:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !script) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading script...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`script-editor ${className}`}>
      {/* Editor Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Script Editor</h2>
          <p className="text-sm text-gray-600">Edit your video script content and timing</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('visual')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                mode === 'visual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Visual
            </button>
            <button
              onClick={() => setMode('code')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                mode === 'code'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Code
            </button>
          </div>

          {/* Save Button */}
          {onSave && !isReadOnly && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !isValidJson}
              className="min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Script'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Script Metadata */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={script.title}
                onChange={(e) => handleVisualChange({ title: e.target.value })}
                readOnly={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
              <select
                value={script.canvasSize?.width + 'x' + script.canvasSize?.height || '1280x720'}
                onChange={(e) => {
                  const [width, height] = e.target.value.split('x').map(Number);
                  handleVisualChange({
                    canvasSize: { width, height }
                  });
                }}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              >
                <option value="1920x1080">1920x1080 (Full HD)</option>
                <option value="1280x720">1280x720 (HD)</option>
                <option value="3840x2160">3840x2160 (4K)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">FPS</label>
              <select
                value="30"
                onChange={(e) => {
                  // FPS is not directly configurable in mulmocast format
                  console.log('FPS change not implemented for mulmocast format');
                }}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              >
                <option value={24}>24 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Total Duration:</span> {script.beats.reduce((sum, beat) => sum + (beat.duration || 0), 0).toFixed(1)}s
            <span className="ml-4 font-medium">Beats:</span> {script.beats.length}
          </div>
        </CardContent>
      </Card>

      {/* Editor Content */}
      {mode === 'visual' ? (
        <SceneEditor
          scenes={script.beats}
          onChange={handleScenesChange}
          onAddScene={handleAddScene}
          onRemoveScene={handleRemoveScene}
        />
      ) : (
        <MonacoEditor
          value={jsonValue}
          onChange={handleJsonChange}
          onValidationChange={handleValidationChange}
          readOnly={isReadOnly}
          height="600px"
          className="json-editor"
        />
      )}
    </div>
  );
};

// ================================================================
// Export
// ================================================================

export default ScriptEditor;