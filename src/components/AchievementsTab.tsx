import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Lock } from 'lucide-react';
import { useCharacters, Achievement } from '@/hooks/useCharacters';
import { useUserStats } from '@/hooks/useUserStats';

export const AchievementsTab: React.FC = () => {
  const {
    achievements,
    isAchievementUnlocked,
    loading
  } = useCharacters();
  const { stats } = useUserStats();
  
  // Display stats directly from database
  const gameStats = {
    gamesPlayed: stats.total_games,
    personalBest: stats.best_score
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl animate-pulse">🏆</div>
        <p className="text-muted-foreground mt-2">Loading achievements...</p>
      </div>
    );
  }

  const getProgress = (achievement: Achievement): number => {
    if (isAchievementUnlocked(achievement.id)) {
      return 100;
    }

    switch (achievement.condition_type) {
      case 'single_game_score':
        // For single game score, show best attempt towards goal
        return Math.min((gameStats.personalBest / achievement.condition_value) * 100, 100);
      
      case 'games_played':
        // For games played, show current progress
        return Math.min((gameStats.gamesPlayed / achievement.condition_value) * 100, 100);
      
      case 'high_score':
        // For high score achievements, show progress towards goal
        return Math.min((gameStats.personalBest / achievement.condition_value) * 100, 100);
      
      default:
        return 0;
    }
  };

  const getProgressText = (achievement: Achievement): string => {
    if (isAchievementUnlocked(achievement.id)) {
      return 'Completed!';
    }

    switch (achievement.condition_type) {
      case 'single_game_score':
        return `Best: ${gameStats.personalBest}/${achievement.condition_value}`;
      
      case 'games_played':
        return `${gameStats.gamesPlayed}/${achievement.condition_value} games`;
      
      case 'high_score':
        return `Best: ${gameStats.personalBest}/${achievement.condition_value}`;
      
      default:
        return '0%';
    }
  };

  const unlockedCount = achievements.filter(a => isAchievementUnlocked(a.id)).length;

  return (
    <div className="space-y-2 md:space-y-4 h-full flex flex-col">
      {/* Header - Compact */}
      <div className="text-center space-y-1">
        <h3 className="text-lg md:text-xl font-bold text-primary">Achievements</h3>
        <div className="text-xs md:text-sm text-muted-foreground">
          {unlockedCount} of {achievements.length} unlocked
        </div>
        <Progress 
          value={(unlockedCount / achievements.length) * 100} 
          className="w-full max-w-xs mx-auto h-1.5"
        />
      </div>

      {/* Game Statistics - Compact */}
      <Card className="p-2 md:p-3 bg-card/50 backdrop-blur border-primary/20">
        <h4 className="font-semibold mb-2 text-center text-sm">Your Progress</h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg md:text-xl font-bold text-primary">{gameStats.gamesPlayed}</div>
            <div className="text-xs text-muted-foreground">Games</div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-primary">{gameStats.personalBest}</div>
            <div className="text-xs text-muted-foreground">Best</div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-primary">{unlockedCount}</div>
            <div className="text-xs text-muted-foreground">Unlocked</div>
          </div>
        </div>
      </Card>

      {/* Achievements List - Optimized for mobile */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 h-full">
          {achievements.map((achievement) => {
            const unlocked = isAchievementUnlocked(achievement.id);
            const progress = getProgress(achievement);
            const progressText = getProgressText(achievement);

            return (
              <Card 
                key={achievement.id}
                className={`p-2 md:p-3 transition-all duration-300 ${
                  unlocked 
                    ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 shadow-glow' 
                    : 'bg-card/50 backdrop-blur border-muted/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`text-lg md:text-xl transition-all duration-300 ${unlocked ? 'scale-110' : ''}`}>
                    {unlocked ? achievement.icon : <Lock className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <h4 className="font-semibold text-xs md:text-sm truncate">{achievement.name}</h4>
                      {unlocked && (
                        <Badge variant="secondary" className="text-xs px-1 py-0 hidden sm:flex">
                          <Trophy className="w-2 h-2 mr-0.5" />
                          ✓
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                      {achievement.description}
                    </p>
                    
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium">Progress</span>
                        <span className="text-xs text-muted-foreground">{progressText}</span>
                      </div>
                      <Progress 
                        value={progress} 
                        className="h-1.5"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};