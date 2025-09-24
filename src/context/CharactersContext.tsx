import React, { createContext, useContext, useMemo } from 'react';
import { useCharacters } from '@/hooks/useCharacters';

// Share the characters state across the app so character changes are instant everywhere
export type CharactersContextValue = ReturnType<typeof useCharacters>;

const CharactersContext = createContext<CharactersContextValue | undefined>(undefined);

export const CharactersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useCharacters();

  // Memoize to avoid unnecessary re-renders of consumers
  const memoValue = useMemo(
    () => value,
    [
      value.characters,
      value.unlockedCharacters,
      value.selectedCharacter,
      value.achievements,
      value.userAchievements,
      value.loading,
    ]
  );

  return (
    <CharactersContext.Provider value={memoValue}>
      {children}
    </CharactersContext.Provider>
  );
};

export const useCharactersContext = (): CharactersContextValue => {
  const ctx = useContext(CharactersContext);
  if (!ctx) throw new Error('useCharactersContext must be used within CharactersProvider');
  return ctx;
};
