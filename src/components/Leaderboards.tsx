import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useCharacterImage } from '@/hooks/useCharacterImage';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const LeaderboardCharacterDisplay: React.FC<{ character: any }> = ({ character }) => {
  const { imageUrl, isLoading } = useCharacterImage(character?.image_path);
  
  if (isLoading) {
    return <div className="w-6 h-6 animate-pulse bg-gray-200 rounded"></div>;
  }
  
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={character?.name || "Character"}
        className="w-6 h-6 object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }
  
  return character?.emoji ? <span className="text-lg">{character.emoji}</span> : null;
};
interface LeaderboardsProps {
  onBack?: () => void;
}

export const Leaderboards: React.FC<LeaderboardsProps> = ({ onBack }) => {
  const {
    leaderboard,
    isLoading,
    getPlayerBestScore
  } = useLeaderboard();
  const playerBestScore = getPlayerBestScore();
  return <div className="space-y-4">
      <div className="text-center">
        {onBack && (
          <div className="flex items-center mb-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBack}
              className="text-xs md:text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
        )}
        <h2 className="text-2xl font-bold text-primary mb-2">Top Nerds</h2>
        <p className="text-sm text-muted-foreground">
          Live scores from players worldwide
        </p>
      </div>
      
      {isLoading ? <div className="space-y-2 max-h-64 overflow-y-auto">
          {[...Array(5)].map((_, i) => <Card key={i} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            </Card>)}
        </div> : <div className="space-y-2 max-h-64 overflow-y-auto">
          {leaderboard.map((entry, index) => <Card key={entry.id} className={`p-3 flex items-center justify-between ${entry.isCurrentPlayer ? 'bg-primary/10 border-primary' : ''}`}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium flex items-center space-x-2">
                    <LeaderboardCharacterDisplay character={entry.characters} />
                    <span>{entry.player_name}</span>
                    {entry.isCurrentPlayer && <Badge variant="secondary">You</Badge>}
                    {index + 1 <= 3 && <span className="text-lg">
                        {index + 1 === 1 ? '🥇' : index + 1 === 2 ? '🥈' : '🥉'}
                      </span>}
                  </div>
                </div>
              </div>
              <div className="font-bold text-lg">
                {entry.score}
              </div>
            </Card>)}
          
          {leaderboard.length === 0 && <Card className="p-6 text-center">
              <p className="text-muted-foreground">No scores yet. Be the first!</p>
            </Card>}
        </div>}
      
      {playerBestScore > 0 && <Card className="p-3 bg-gradient-score">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Your Personal Best</p>
            <p className="text-2xl font-bold text-warning-foreground">{playerBestScore} 👑</p>
          </div>
        </Card>}
    </div>;
};