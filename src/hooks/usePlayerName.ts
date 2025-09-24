import { useEffect } from 'react';
import { useAuth } from './useAuth';

export const usePlayerName = () => {
  const { user } = useAuth();

  // Clear all user data when user changes/logs out
  const clearAllUserData = () => {
    if (user) {
      // Clear user-specific data
      localStorage.removeItem(`slappy-nerds-player-name-${user.id}`);
      localStorage.removeItem(`slappy-nerds-total-games-${user.id}`);
      localStorage.removeItem(`slappy-nerds-record-${user.id}`);
    }
  };

  return {
    clearAllUserData
  };
};