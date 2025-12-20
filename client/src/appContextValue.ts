import { createContext } from 'react';

export type AppContextType = {
  isAuthed: boolean;
  setIsAuthed: React.Dispatch<React.SetStateAction<boolean>>;
};

export const AppContext = createContext<AppContextType | null>(null);
