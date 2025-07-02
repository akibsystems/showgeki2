'use client';

import React, { createContext, useContext, ReactNode } from 'react';

// ================================================================
// Types
// ================================================================

interface AdminContextType {
  isAdmin: boolean;
}

// ================================================================
// Context
// ================================================================

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// ================================================================
// Provider Component
// ================================================================

export function AdminProvider({ 
  children,
}: { 
  children: ReactNode;
}) {
  // Since this layout is only rendered for authenticated admins,
  // we can safely assume isAdmin is true
  const value: AdminContextType = {
    isAdmin: true,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

// ================================================================
// Hook
// ================================================================

export function useAdmin() {
  const context = useContext(AdminContext);
  
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  
  return context;
}