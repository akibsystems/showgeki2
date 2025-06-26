'use client';

import React from 'react';
import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr-config';

// ================================================================
// SWR Provider Component
// ================================================================

interface SWRProviderProps {
  children: React.ReactNode;
}

export const SWRProvider: React.FC<SWRProviderProps> = ({ children }) => {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
};

// ================================================================
// Export
// ================================================================

export default SWRProvider;