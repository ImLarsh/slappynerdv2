import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface AchievementCheckData {
  score?: number;
  gamesPlayed?: number;
  highScore?: number;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Set up real-time updates for achievements
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-achievements-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('New achievement unlocked:', payload);
          
          // Get achievement details
          const { data: achievement } = await supabase
            .from('achievements')
            .select('*')
            .eq('id', payload.new.achievement_id)
            .single();

          if (achievement) {
            toast({
              title: "🎉 Achievement Unlocked!",
              description: `${achievement.icon} ${achievement.name}: ${achievement.description}`,
              duration: 5000,
            });

            // If achievement unlocks a character, also check for that
            if (achievement.reward_character_id) {
              const { data: character } = await supabase
                .from('characters')
                .select('*')
                .eq('id', achievement.reward_character_id)
                .single();

              if (character) {
                setTimeout(() => {
                  toast({
                    title: "🌟 New Character Unlocked!",
                    description: `You unlocked ${character.name} ${character.emoji}!`,
                    duration: 5000,
                  });
                }, 1000);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const checkAchievements = useCallback(async (data: AchievementCheckData) => {
    if (!user) return;

    try {
      // Get user's profile for player name
      const { data: profile } = await supabase
        .from('profiles')
        .select('player_name')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      // Get all achievements
      const { data: achievements } = await supabase
        .from('achievements')
        .select('*');

      if (!achievements) return;

      // Get user's current achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      const unlockedAchievementIds = userAchievements?.map(ua => ua.achievement_id) || [];

      // Check each achievement
      for (const achievement of achievements) {
        if (unlockedAchievementIds.includes(achievement.id)) continue;

        let shouldUnlock = false;

        switch (achievement.condition_type) {
          case 'high_score':
            shouldUnlock = (data.highScore || 0) >= achievement.condition_value;
            break;
          case 'single_game_score':
            shouldUnlock = (data.score || 0) >= achievement.condition_value;
            break;
          case 'games_played':
            shouldUnlock = (data.gamesPlayed || 0) >= achievement.condition_value;
            break;
          default:
            break;
        }

        if (shouldUnlock) {
          // Unlock the achievement
          await supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              player_name: profile.player_name,
              achievement_id: achievement.id
            });

          // If this achievement unlocks a character, unlock it too
          if (achievement.reward_character_id) {
            const { error: charError } = await supabase
              .from('user_characters')
              .insert({
                user_id: user.id,
                player_name: profile.player_name,
                character_id: achievement.reward_character_id
              });
            
            if (charError) {
              console.error('Error unlocking character:', charError);
            } else {
              console.log('Character unlocked successfully:', achievement.reward_character_id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }, [user]);

  return {
    checkAchievements
  };
};