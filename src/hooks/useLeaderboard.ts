import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
  user_id: string;
  character_id?: string;
  characters?: {
    emoji: string;
    name: string;
  };
  isCurrentPlayer?: boolean;
}

export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, session } = useAuth();
  const { toast } = useToast();

  const fetchLeaderboard = async () => {
    try {
      // Get highest score per user only
      const { data, error } = await supabase
        .from('leaderboards')
        .select(`
          *,
          characters (
            emoji,
            name
          )
        `)
        .order('score', { ascending: false })
        .limit(100); // Get more initially to filter unique users

      if (error) throw error;

      // Filter to only show highest score per user and limit to 10
      const userBestScores = new Map();
      (data || []).forEach((entry) => {
        if (!userBestScores.has(entry.user_id) || 
            userBestScores.get(entry.user_id).score < entry.score) {
          userBestScores.set(entry.user_id, entry);
        }
      });

      // Convert back to array, sort by score, and limit to 10
      const uniqueEntries = Array.from(userBestScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // Mark current player's entry
      const processedData = uniqueEntries.map((entry) => ({
        ...entry,
        isCurrentPlayer: user?.id === entry.user_id
      }));

      setLeaderboard(processedData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitScore = async (score: number, characterId?: string) => {
    if (!session || !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit your score.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const response = await supabase.functions.invoke('submit-score', {
        body: { 
          score,
          characterId,
          gameData: {
            timestamp: Date.now(),
            userAgent: navigator.userAgent
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { isNewHighScore } = response.data;
      
      if (isNewHighScore) {
        toast({
          title: "New Personal Best!",
          description: `Your high score has been updated to ${score}!`,
        });
      } else {
        toast({
          title: "Score Recorded",
          description: `Your score of ${score} was recorded.`,
        });
      }

      // Refresh leaderboard after successful submission
      await fetchLeaderboard();
      return true;
    } catch (error: any) {
      console.error('Error submitting score:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit your score. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const getPlayerBestScore = () => {
    if (!user) return 0;
    
    const playerEntries = leaderboard.filter(entry => entry.user_id === user.id);
    if (playerEntries.length === 0) return 0;
    
    return Math.max(...playerEntries.map(entry => entry.score));
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  return {
    leaderboard,
    isLoading,
    submitScore,
    refreshLeaderboard: fetchLeaderboard,
    getPlayerBestScore
  };
};