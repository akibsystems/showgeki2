'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { getOrCreateUid } from '@/lib/uid';

// ================================================================
// App State Types
// ================================================================

interface AppState {
  uid: string | null;
  currentWorkspace: string | null;
  isLoading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_UID'; payload: string }
  | { type: 'SET_WORKSPACE'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

interface AppContextType {
  state: AppState;
  setUid: (uid: string) => void;
  setCurrentWorkspace: (workspace: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// ================================================================
// Initial State
// ================================================================

const initialState: AppState = {
  uid: null,
  currentWorkspace: null,
  isLoading: false,
  error: null,
};

// ================================================================
// Reducer
// ================================================================

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_UID':
      return { ...state, uid: action.payload };
    case 'SET_WORKSPACE':
      return { ...state, currentWorkspace: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

// ================================================================
// Context
// ================================================================

const AppContext = createContext<AppContextType | undefined>(undefined);

// ================================================================
// Provider Component
// ================================================================

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize UID on mount
  useEffect(() => {
    const initializeUid = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const uid = await getOrCreateUid();
        dispatch({ type: 'SET_UID', payload: uid });
      } catch (error) {
        console.error('Failed to initialize UID:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize user session' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeUid();
  }, []);

  // Action creators
  const setUid = (uid: string) => {
    dispatch({ type: 'SET_UID', payload: uid });
  };

  const setCurrentWorkspace = (workspace: string | null) => {
    dispatch({ type: 'SET_WORKSPACE', payload: workspace });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AppContextType = {
    state,
    setUid,
    setCurrentWorkspace,
    setLoading,
    setError,
    clearError,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// ================================================================
// Hook
// ================================================================

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// ================================================================
// Export
// ================================================================

export default AppContext;