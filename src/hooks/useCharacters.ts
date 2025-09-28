import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Character {
  id: string;
  name: string;
  emoji: string; // Keep for backward compatibility, will be deprecated
  image_path?: string; // New field for character images
  unlock_condition: string;
  unlock_description: string;
  is_default: boolean;
  sort_order: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
  reward_character_id?: string;
}

export interface UserCharacter {
  id: string;
  user_id: string;
  character_id: string;
  unlocked_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export const useCharacters = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [unlockedCharacters, setUnlockedCharacters] = useState<UserCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUserData = async () => {
    if (!user) return;

    try {
      const { data: userChars } = await supabase
        .from('user_characters')
        .select('*')
        .eq('user_id', user.id);

      setUnlockedCharacters(userChars || []);

      const { data: userAchs } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      setUserAchievements(userAchs || []);

      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settings?.selected_character_id) {
        const selectedChar = characters.find(c => c.id === settings.selected_character_id);
        if (selectedChar) {
          setSelectedCharacter(selectedChar);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Reset per-user state when user changes to avoid stale data
  useEffect(() => {
    setUnlockedCharacters([]);
    setUserAchievements([]);
  }, [user?.id]);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const { data } = await supabase
          .from('characters')
          .select('*')
          .order('sort_order');
        
        setCharacters(data || []);
        
        // Set default character if none selected
        const defaultChar = data?.find(c => c.is_default);
        if (defaultChar && !selectedCharacter) {
          setSelectedCharacter(defaultChar);
        }
      } catch (error) {
        console.error('Error fetching characters:', error);
      }
    };

    const fetchAchievements = async () => {
      try {
        const { data } = await supabase
          .from('achievements')
          .select('*');
        
        setAchievements(data || []);
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacters();
    fetchAchievements();
  }, []);

  // Set up real-time updates for user characters
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-characters-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_characters',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('New character unlocked:', payload);
          // Immediately add the new character to unlocked characters
          const newCharacter = payload.new as UserCharacter;
          setUnlockedCharacters(prev => [...prev, newCharacter]);
          
          // Also refresh all user data to ensure everything is in sync
          await fetchUserData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Set up real-time updates for user achievements
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-achievements-realtime-ui')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newAchievement = payload.new as UserAchievement;
          setUserAchievements(prev => [...prev, newAchievement]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [user, characters]);

  const isCharacterUnlocked = (characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    if (character?.is_default) return true;
    return unlockedCharacters.some(uc => uc.character_id === characterId);
  };

  const isAchievementUnlocked = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const selectCharacter = async (characterId: string) => {
    if (!user || !isCharacterUnlocked(characterId)) return false;

    // Find the character first
    const character = characters.find(c => c.id === characterId);
    if (!character) return false;

    // OPTIMISTIC UPDATE: Update UI immediately
    const previousCharacter = selectedCharacter;
    setSelectedCharacter(character);
    
    // Update character selection immediately without toast

    try {
      // Save to database in background
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingSettings) {
        const { error } = await supabase
          .from('user_settings')
          .update({ selected_character_id: characterId })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Get user profile to get player_name
        const { data: profile } = await supabase
          .from('profiles')
          .select('player_name')
          .eq('id', user.id)
          .single();

        const { error } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            player_name: profile?.player_name || 'Player',
            selected_character_id: characterId
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error selecting character:', error);
      
      // ROLLBACK: Revert to previous character on error
      setSelectedCharacter(previousCharacter);
      toast({
        title: "Error",
        description: "Failed to save character selection. Please try again.",
        variant: "destructive"
      });
      
      return false;
    }
  };

  return {
    characters,
    unlockedCharacters,
    selectedCharacter,
    achievements,
    userAchievements,
    loading: isLoading,
    selectCharacter,
    isCharacterUnlocked,
    isAchievementUnlocked,
    fetchUserData
  };
};