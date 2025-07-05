'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { Story, WorkflowState, StoryElements, CustomAssets, WorkflowMetadata } from '@/types';
import { useApp } from './app-context';
import { generateScreenplay, generateSceneScripts, generateFinalVideo } from '@/lib/api/workflow';
import { apiClient } from '@/lib/api-client';
import { debounce } from '@/lib/utils';

// ================================================================
// Workflow State Types
// ================================================================

interface WorkflowContextState {
  story: Story | null;
  currentStep: number;
  completedSteps: number[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  storyElements: StoryElements | null;
  customAssets: CustomAssets | null;
  workflowMetadata: WorkflowMetadata | null;
}

type WorkflowAction =
  | { type: 'SET_STORY'; payload: Story }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'COMPLETE_STEP'; payload: number }
  | { type: 'SET_COMPLETED_STEPS'; payload: number[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'UPDATE_STORY_ELEMENTS'; payload: Partial<StoryElements> }
  | { type: 'UPDATE_CUSTOM_ASSETS'; payload: Partial<CustomAssets> }
  | { type: 'UPDATE_WORKFLOW_STATE'; payload: Partial<WorkflowState> }
  | { type: 'UPDATE_WORKFLOW_METADATA'; payload: Partial<WorkflowMetadata> }
  | { type: 'RESET_WORKFLOW' };

interface WorkflowContextType {
  state: WorkflowContextState;
  
  // Story Management
  loadStory: (storyId: string) => Promise<void>;
  saveStory: () => Promise<void>;
  
  // Workflow Navigation
  goToStep: (step: number) => void;
  completeCurrentStep: () => void;
  completeStep: (step: number) => void;
  canNavigateToStep: (step: number) => boolean;
  
  // Data Updates
  updateStoryElements: (elements: Partial<StoryElements>) => void;
  updateCustomAssets: (assets: Partial<CustomAssets>) => void;
  updateWorkflowMetadata: (metadata: Partial<WorkflowMetadata>) => void;
  
  // AI Generation
  generateSceneOverviewAI: () => Promise<void>;
  generateMulmoscriptAI: () => Promise<void>;
  generateScreenplayAI: () => Promise<void>;
  generateSceneScriptsAI: (characters: any[]) => Promise<void>;
  generateFinalVideoAI: (videoConfig: any) => Promise<void>;
  
  // Utility
  resetWorkflow: () => void;
  markAsUnsaved: () => void;
}

// ================================================================
// Initial State
// ================================================================

const initialState: WorkflowContextState = {
  story: null,
  currentStep: 1,
  completedSteps: [],
  isLoading: false,
  isSaving: false,
  error: null,
  hasUnsavedChanges: false,
  storyElements: null,
  customAssets: null,
  workflowMetadata: null,
};

// ================================================================
// Reducer
// ================================================================

const workflowReducer = (state: WorkflowContextState, action: WorkflowAction): WorkflowContextState => {
  switch (action.type) {
    case 'SET_STORY':
      // story_elementsが存在しない場合のデフォルト値
      const defaultStoryElements = {
        main_story: '',
        dramatic_turning_point: '',
        future_image: '',
        learnings: '',
        total_scenes: 5,
      };
      
      return {
        ...state,
        story: action.payload,
        currentStep: action.payload.workflow_state?.current_step || 1,
        completedSteps: action.payload.workflow_state?.completed_steps || [],
        storyElements: action.payload.story_elements || defaultStoryElements,
        customAssets: action.payload.custom_assets || null,
        workflowMetadata: action.payload.workflow_state?.metadata || null,
        hasUnsavedChanges: false,
      };
      
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
        hasUnsavedChanges: true,
      };
      
    case 'COMPLETE_STEP':
      const newCompletedSteps = state.completedSteps.includes(action.payload)
        ? state.completedSteps
        : [...state.completedSteps, action.payload].sort((a, b) => a - b);
      return {
        ...state,
        completedSteps: newCompletedSteps,
        hasUnsavedChanges: true,
      };
      
    case 'SET_COMPLETED_STEPS':
      return {
        ...state,
        completedSteps: action.payload,
        hasUnsavedChanges: true,
      };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload };
      
    case 'UPDATE_STORY_ELEMENTS':
      return {
        ...state,
        storyElements: {
          ...state.storyElements,
          ...action.payload,
        } as StoryElements,
        hasUnsavedChanges: true,
      };
      
    case 'UPDATE_CUSTOM_ASSETS':
      return {
        ...state,
        customAssets: {
          ...state.customAssets,
          ...action.payload,
        } as CustomAssets,
        hasUnsavedChanges: true,
      };
      
    case 'UPDATE_WORKFLOW_STATE':
      if (!state.story) return state;
      return {
        ...state,
        story: {
          ...state.story,
          workflow_state: {
            ...state.story.workflow_state,
            ...action.payload,
          } as WorkflowState,
        },
        hasUnsavedChanges: true,
      };
      
    case 'UPDATE_WORKFLOW_METADATA':
      return {
        ...state,
        workflowMetadata: {
          ...state.workflowMetadata,
          ...action.payload,
        } as WorkflowMetadata,
        hasUnsavedChanges: true,
      };
      
    case 'RESET_WORKFLOW':
      return initialState;
      
    default:
      return state;
  }
};

// ================================================================
// Context
// ================================================================

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

// ================================================================
// Provider Component
// ================================================================

interface WorkflowProviderProps {
  children: React.ReactNode;
}

export const WorkflowProvider: React.FC<WorkflowProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const { state: appState } = useApp();

  // Load story
  const loadStory = useCallback(async (storyId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const story = await apiClient.getStory(storyId);
      dispatch({ type: 'SET_STORY', payload: story });
    } catch (error) {
      console.error('Failed to load story:', error);
      dispatch({ type: 'SET_ERROR', payload: 'ストーリーの読み込みに失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Save story with debounce
  const saveStoryInternal = useCallback(async () => {
    if (!state.story || state.isSaving) return;

    try {
      dispatch({ type: 'SET_SAVING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Build update object with all changes
      const updates: any = {
        workflow_state: {
          current_step: state.currentStep,
          completed_steps: state.completedSteps,
          metadata: state.workflowMetadata || state.story.workflow_state?.metadata || {},
        },
      };
      
      if (state.storyElements) {
        updates.story_elements = state.storyElements;
      }
      
      if (state.customAssets) {
        updates.custom_assets = state.customAssets;
      }

      // Use client-side API to update story
      await apiClient.updateStory(state.story.id, updates);
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
    } catch (error) {
      console.error('Failed to save story:', error);
      dispatch({ type: 'SET_ERROR', payload: 'ストーリーの保存に失敗しました' });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.story, state.storyElements, state.customAssets, state.workflowMetadata, state.currentStep, state.completedSteps, state.isSaving]);

  // Debounced save
  const debouncedSave = useCallback(
    debounce(saveStoryInternal, 2000),
    [saveStoryInternal]
  );

  // Auto-save on changes
  useEffect(() => {
    if (state.hasUnsavedChanges && !state.isLoading) {
      debouncedSave();
    }
  }, [state.hasUnsavedChanges, state.isLoading, debouncedSave]);

  // Navigation
  const goToStep = useCallback((step: number) => {
    if (step < 1 || step > 5) return;
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  }, []);

  const completeCurrentStep = useCallback(() => {
    dispatch({ type: 'COMPLETE_STEP', payload: state.currentStep });
    
    // Clear unsaved changes when completing a step
    dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
    
    // Auto-advance to next step if not on last step
    if (state.currentStep < 5) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep + 1 });
    }
  }, [state.currentStep]);

  const canNavigateToStep = useCallback((step: number): boolean => {
    // Can always go to completed steps or previous steps
    if (state.completedSteps.includes(step) || step <= state.currentStep) {
      return true;
    }
    
    // Can go to next step only if current step is completed
    if (step === state.currentStep + 1 && state.completedSteps.includes(state.currentStep)) {
      return true;
    }
    
    return false;
  }, [state.currentStep, state.completedSteps]);

  // Data updates
  const updateStoryElements = useCallback((elements: Partial<StoryElements>) => {
    dispatch({ type: 'UPDATE_STORY_ELEMENTS', payload: elements });
  }, []);

  const updateCustomAssets = useCallback((assets: Partial<CustomAssets>) => {
    dispatch({ type: 'UPDATE_CUSTOM_ASSETS', payload: assets });
  }, []);

  const updateWorkflowMetadata = useCallback((metadata: Partial<WorkflowMetadata>) => {
    dispatch({ type: 'UPDATE_WORKFLOW_METADATA', payload: metadata });
  }, []);

  // Utility functions
  const resetWorkflow = useCallback(() => {
    dispatch({ type: 'RESET_WORKFLOW' });
  }, []);

  const markAsUnsaved = useCallback(() => {
    dispatch({ type: 'SET_UNSAVED_CHANGES', payload: true });
  }, []);

  const saveStory = useCallback(async () => {
    await saveStoryInternal();
  }, [saveStoryInternal]);

  // AI Generation functions
  const generateSceneOverviewAI = useCallback(async () => {
    if (!state.story || !state.storyElements) {
      console.error('No story or story elements loaded');
      dispatch({ type: 'SET_ERROR', payload: 'ストーリー情報が不足しています' });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      console.log('Generating scene overview for story:', state.story.id);
      
      // まず、ストーリーテキストをデータベースに保存
      if (state.storyElements.main_story && appState.uid) {
        const updateResponse = await fetch(`/api/stories/${state.story.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-UID': appState.uid,
          },
          body: JSON.stringify({
            text_raw: state.storyElements.main_story,
            title: state.story.title,
          }),
        });

        if (!updateResponse.ok) {
          console.error('Failed to update story text');
        } else {
          // ローカルステートも更新
          const updatedStory = { ...state.story, text_raw: state.storyElements.main_story };
          dispatch({ type: 'SET_STORY', payload: updatedStory });
        }
      }
      
      // Call generate-scene-overview API
      const response = await fetch('/api/stories/generate-scene-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyText: state.storyElements.main_story || state.story.text_raw,
          beatCount: state.storyElements.total_scenes || 5,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate scene overview');
      }

      const result = await response.json();
      
      if (result.scenes) {
        // TODO: Store scene data in a format compatible with WorkflowMetadata
        // For now, skip metadata update
        
        // Mark step 1 as completed
        dispatch({ type: 'COMPLETE_STEP', payload: 1 });
      }
    } catch (error) {
      console.error('Failed to generate scene overview:', error);
      dispatch({ type: 'SET_ERROR', payload: 'シーン概要の生成に失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.story, state.storyElements, appState.uid]);

  const generateMulmoscriptAI = useCallback(async () => {
    if (!state.story || !appState.uid) {
      console.error('No story or user ID found');
      dispatch({ type: 'SET_ERROR', payload: 'ストーリー情報が不足しています' });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      console.log('Generating mulmoscript for story:', state.story.id);
      
      // 最新のストーリー情報を取得（text_rawが保存されていることを確認）
      const storyResponse = await fetch(`/api/stories/${state.story.id}`, {
        headers: {
          'X-User-UID': appState.uid,
        },
      });
      
      if (storyResponse.ok) {
        const storyResult = await storyResponse.json();
        if (storyResult.success && storyResult.data) {
          // ローカルステートを最新の情報で更新
          dispatch({ type: 'SET_STORY', payload: storyResult.data });
          console.log('Updated story with latest data:', {
            id: storyResult.data.id,
            text_raw_length: storyResult.data.text_raw?.length || 0,
            has_text_raw: !!storyResult.data.text_raw
          });
        }
      }
      
      // Prepare scenes data (fallback to default if no scenes available)
      const sceneData = Array.from({ length: 5 }, (_, index) => ({
        number: index + 1,
        title: `シーン ${index + 1}`
      }));
      
      // Call generate-script API
      const response = await fetch(`/api/stories/${state.story.id}/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': appState.uid,
        },
        body: JSON.stringify({
          beats: state.storyElements?.total_scenes || 5,
          language: 'ja',
          scenes: sceneData,
          style_preference: 'dramatic', // Default style
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate mulmoscript');
      }

      const result = await response.json();
      
      if (result.success && result.data?.script_json) {
        // Update workflow state with generated mulmoscript
        dispatch({ type: 'UPDATE_WORKFLOW_STATE', payload: {
          ai_generations: {
            ...state.story.workflow_state?.ai_generations,
            scene_scripts: result.data.script_json,
          },
        }});
        
        // Update story with script_json
        const updatedStory = { ...state.story, script_json: result.data.script_json };
        dispatch({ type: 'SET_STORY', payload: updatedStory });
      }
    } catch (error) {
      console.error('Failed to generate mulmoscript:', error);
      dispatch({ type: 'SET_ERROR', payload: 'スクリプト生成に失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.story, state.storyElements, state.workflowMetadata, appState.uid]);

  const generateScreenplayAI = useCallback(async () => {
    if (!state.story) {
      console.error('No story loaded');
      dispatch({ type: 'SET_ERROR', payload: 'ストーリーが読み込まれていません' });
      return;
    }

    if (!appState.uid) {
      console.error('No user ID found');
      dispatch({ type: 'SET_ERROR', payload: 'ユーザー情報が見つかりません' });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      console.log('Generating screenplay for story:', state.story.id, 'with UID:', appState.uid);
      const result = await generateScreenplay(state.story.id, appState.uid);
      
      if (result.success) {
        // Update workflow state with generated screenplay
        dispatch({ type: 'UPDATE_WORKFLOW_STATE', payload: {
          ai_generations: {
            ...state.story.workflow_state?.ai_generations,
            screenplay: result.screenplay,
          },
        }});
        
        // TODO: Update workflow metadata in a format compatible with schema
        
        // Mark step 1 as completed and move to step 2
        dispatch({ type: 'COMPLETE_STEP', payload: 1 });
        dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
      }
    } catch (error) {
      console.error('Failed to generate screenplay:', error);
      dispatch({ type: 'SET_ERROR', payload: 'AI脚本生成に失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.story, appState.uid]);

  const generateSceneScriptsAI = useCallback(async (characters: any[]) => {
    if (!state.story) return;

    // 既にmulmoscriptが生成されていて、台詞（beats）が含まれている場合はスキップ
    if (state.story.script_json?.beats && state.story.script_json.beats.length > 0) {
      console.log('Skipping scene scripts generation - already have mulmoscript with dialogue');
      
      // 既存のmulmoscriptからキャラクター情報を更新（音声IDなど）
      if (state.story.script_json.speechParams?.speakers) {
        const updatedSpeakers = { ...state.story.script_json.speechParams.speakers };
        characters.forEach(char => {
          if (updatedSpeakers[char.name]) {
            updatedSpeakers[char.name].voiceId = char.voiceId;
          }
        });
        
        const updatedScript = {
          ...state.story.script_json,
          speechParams: {
            ...state.story.script_json.speechParams,
            speakers: updatedSpeakers
          }
        };
        
        // ローカルステートを更新
        dispatch({ type: 'SET_STORY', payload: { ...state.story, script_json: updatedScript } });
        
        // データベースに保存
        if (appState.uid) {
          await fetch(`/api/stories/${state.story.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-User-UID': appState.uid,
            },
            body: JSON.stringify({
              script_json: updatedScript,
            }),
          });
        }
      }
      
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const result = await generateSceneScripts(state.story.id, appState.uid || '', characters);
      
      if (result.success) {
        // Update workflow state with generated scene scripts
        dispatch({ type: 'UPDATE_WORKFLOW_STATE', payload: {
          ai_generations: {
            ...state.story.workflow_state?.ai_generations,
            scene_scripts: result.sceneScripts,
          },
        }});
        
        // Mark step 3 as completed and move to step 4
        dispatch({ type: 'COMPLETE_STEP', payload: 3 });
        dispatch({ type: 'SET_CURRENT_STEP', payload: 4 });
      }
    } catch (error) {
      console.error('Failed to generate scene scripts:', error);
      dispatch({ type: 'SET_ERROR', payload: 'AIシーン生成に失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.story, appState.uid]);

  const generateFinalVideoAI = useCallback(async (videoConfig: any) => {
    if (!state.story) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const result = await generateFinalVideo(state.story.id, appState.uid || '', videoConfig);
      
      if (result.success) {
        // Mark step 5 as completed
        dispatch({ type: 'COMPLETE_STEP', payload: 5 });
        
        // Navigate to video status page
        if (typeof window !== 'undefined') {
          window.location.href = `/videos?storyId=${state.story.id}`;
        }
      }
    } catch (error) {
      console.error('Failed to generate video:', error);
      dispatch({ type: 'SET_ERROR', payload: '動画生成の開始に失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.story, appState.uid]);

  const completeStep = useCallback((step: number) => {
    dispatch({ type: 'COMPLETE_STEP', payload: step });
  }, []);

  const value: WorkflowContextType = {
    state,
    loadStory,
    saveStory,
    goToStep,
    completeCurrentStep,
    completeStep,
    canNavigateToStep,
    updateStoryElements,
    updateCustomAssets,
    updateWorkflowMetadata,
    generateSceneOverviewAI,
    generateMulmoscriptAI,
    generateScreenplayAI,
    generateSceneScriptsAI,
    generateFinalVideoAI,
    resetWorkflow,
    markAsUnsaved,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};

// ================================================================
// Hook
// ================================================================

export const useWorkflow = (): WorkflowContextType => {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};

// ================================================================
// Export
// ================================================================

export default WorkflowContext;