'use client';

import React, { createContext, useContext } from 'react';
import { ToastContainer, useToast as useToastHook, type ToastType } from '@/components/ui/toast';

// ================================================================
// Toast Context Types
// ================================================================

interface ToastContextType {
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

// ================================================================
// Context
// ================================================================

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ================================================================
// Provider Component
// ================================================================

interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  position = 'top-right' 
}) => {
  const { toasts, removeToast, success, error, warning, info } = useToastHook();

  const value: ToastContextType = {
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position={position}
      />
    </ToastContext.Provider>
  );
};

// ================================================================
// Hook
// ================================================================

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// ================================================================
// Export
// ================================================================

export default ToastContext;