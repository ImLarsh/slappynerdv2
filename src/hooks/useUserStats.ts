import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface UserStats {
  total_games: number;
  best_score: number;
}

export const useUserStats = () => {
  const [stats, setStats] = useState<UserStats>({ total_games: 0, best_score: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch user stats from database
  const fetchStats = async () => {
    if (!user) {
      setStats({ total_games: 0, best_score: 0 });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('total_games, best_score')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStats(data);
      } else {
        // No stats yet, user hasn't played any games
        setStats({ total_games: 0, best_score: 0 });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setStats({ total_games: 0, best_score: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Update stats after a game
  const updateGameStats = async (score: number) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('update_user_game_stats', {
        p_user_id: user.id,
        p_score: score
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        const newStats = {
          total_games: result.new_total_games,
          best_score: result.new_best_score
        };
        
        setStats(newStats);

        // Show toast for new best score
        if (result.is_new_best && score > 0) {
          toast({
            title: "🎉 New Personal Best!",
            description: `Your new high score is ${score}!`,
            duration: 5000,
          });
        }

        return newStats;
      }
    } catch (error) {
      console.error('Error updating game stats:', error);
      toast({
        title: "Error",
        description: "Failed to save game statistics.",
        variant: "destructive",
      });
    }

    return null;
  };

  // Reset stats when user changes
  useEffect(() => {
    setStats({ total_games: 0, best_score: 0 });
    setLoading(true);
  }, [user?.id]);

  // Fetch stats on user change
  useEffect(() => {
    fetchStats();
  }, [user]);

  // Set up real-time updates for user stats
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            setStats({
              total_games: newData.total_games || 0,
              best_score: newData.best_score || 0
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    stats,
    loading,
    updateGameStats,
    refreshStats: fetchStats
  };
};