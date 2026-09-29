/* Kept out of WinsProvider.tsx so that file exports only components (and types),
   which is what React Fast Refresh needs to hot-swap it. */
import { createContext, useContext } from 'react';
import type { WinsContextValue } from './WinsProvider';

export const WinsContext = createContext<WinsContextValue | null>(null);

export const useDW = (): WinsContextValue => {
  const ctx = useContext(WinsContext);
  if (!ctx) throw new Error('useDW must be used within WinsProvider');
  return ctx;
};
