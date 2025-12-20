import { useState } from 'react';
import { AppContext } from './appContextValue.js';

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthed, setIsAuthed] = useState(false);

  return (
    <AppContext.Provider value={{ isAuthed, setIsAuthed }}>
      {children}
    </AppContext.Provider>
  );
};

