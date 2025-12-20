import { useContext } from 'react';
import { AppContext } from './appContextValue.js';

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
