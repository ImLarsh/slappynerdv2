import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Lock, Star, Award, Target, Zap } from 'lucide-react';
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
        return `${gameStats.personalBest}/${achievement.condition_value}`;
      
      case 'games_played':
        return `${gameStats.gamesPlayed}/${achievement.condition_value}`;
      
      case 'high_score':
        return `${gameStats.personalBest}/${achievement.condition_value}`;
      
      default:
        return '0/100';
    }
  };

  const getRarityColor = (achievement: Achievement): string => {
    const progress = getProgress(achievement);
    if (isAchievementUnlocked(achievement.id)) {
      if (achievement.condition_value >= 100) return 'from-yellow-400/20 to-orange-500/20 border-yellow-400/30'; // Legendary
      if (achievement.condition_value >= 50) return 'from-purple-400/20 to-blue-500/20 border-purple-400/30'; // Epic
      if (achievement.condition_value >= 20) return 'from-blue-400/20 to-green-500/20 border-blue-400/30'; // Rare
      return 'from-green-400/20 to-primary/20 border-green-400/30'; // Common
    }
    return 'from-muted/10 to-muted/5 border-muted/20';
  };

  const getDifficultyIcon = (achievement: Achievement) => {
    if (achievement.condition_value >= 100) return <Star className="w-3 h-3 text-yellow-500" />;
    if (achievement.condition_value >= 50) return <Award className="w-3 h-3 text-purple-500" />;
    if (achievement.condition_value >= 20) return <Target className="w-3 h-3 text-blue-500" />;
    return <Zap className="w-3 h-3 text-green-500" />;
  };

  const unlockedCount = achievements.filter(a => isAchievementUnlocked(a.id)).length;
  const totalProgress = (unlockedCount / achievements.length) * 100;

  // Sort achievements: unlocked first, then by difficulty/rarity
  const sortedAchievements = [...achievements].sort((a, b) => {
    const aUnlocked = isAchievementUnlocked(a.id);
    const bUnlocked = isAchievementUnlocked(b.id);
    
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    
    // If both same unlock status, sort by difficulty
    return a.condition_value - b.condition_value;
  });

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header with progress overview */}
      <div className="text-center space-y-3">
        <h3 className="text-xl font-bold text-yellow-500 flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6" />
          Achievements
        </h3>
        
        {/* Overall progress card */}
        <Card className="p-4 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 border-yellow-400/30">
          <div className="grid grid-cols-3 gap-4 text-center mb-3">
            <div>
              <div className="text-2xl font-bold text-yellow-500">{unlockedCount}</div>
              <div className="text-xs text-muted-foreground">Unlocked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">{gameStats.personalBest}</div>
              <div className="text-xs text-muted-foreground">Best Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">{gameStats.gamesPlayed}</div>
              <div className="text-xs text-muted-foreground">Games Played</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-yellow-500">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{unlockedCount}/{achievements.length}</span>
            </div>
            <Progress 
              value={totalProgress} 
              className="h-2 bg-muted/30"
            />
            <div className="text-center text-xs text-muted-foreground">
              {Math.round(totalProgress)}% Complete
            </div>
          </div>
        </Card>
      </div>

      {/* Achievements list */}
      <ScrollArea className="flex-1 max-h-[45vh] sm:max-h-[55vh]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
          {sortedAchievements.map((achievement) => {
            const unlocked = isAchievementUnlocked(achievement.id);
            const progress = getProgress(achievement);
            const progressText = getProgressText(achievement);

            return (
              <Card 
                key={achievement.id}
                className={`p-3 transition-all duration-300 bg-gradient-to-r ${getRarityColor(achievement)} ${
                  unlocked ? 'shadow-lg hover:scale-105' : 'hover:bg-muted/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Achievement icon/status */}
                  <div className={`text-xl transition-all duration-300 ${unlocked ? 'animate-pulse' : ''}`}>
                    {unlocked ? (
                      <div className="relative">
                        {achievement.icon}
                        <div className="absolute -top-1 -right-1">
                          <Trophy className="w-3 h-3 text-yellow-500" />
                        </div>
                      </div>
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Achievement header */}
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-yellow-500 truncate">
                        {achievement.name}
                      </h4>
                      {getDifficultyIcon(achievement)}
                      {unlocked && (
                        <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-500/20 text-green-400 border-green-400/30">
                          ✓
                        </Badge>
                      )}
                    </div>
                    
                    {/* Achievement description */}
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {achievement.description}
                    </p>
                    
                    {/* Progress section */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-yellow-500">
                          {unlocked ? 'Completed!' : 'Progress'}
                        </span>
                        <span className="text-xs text-muted-foreground">{progressText}</span>
                      </div>
                      
                      <Progress 
                        value={progress} 
                        className={`h-1.5 ${unlocked ? 'bg-green-500/20' : 'bg-muted/30'}`}
                      />
                      
                      {unlocked && (
                        <div className="text-center">
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-400/30">
                            🎉 Achievement Unlocked!
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Empty state */}
      {achievements.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="space-y-2">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto" />
            <h3 className="text-xl font-semibold text-yellow-500">No Achievements Yet</h3>
            <p className="text-muted-foreground">
              Start playing to unlock achievements!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};