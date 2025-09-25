import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAudio } from '@/hooks/useAudio';

interface Crate {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: string;
}

interface CrateOpeningProps {
  crate: Crate;
  onComplete: () => void;
}

const rarityColors = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400'
};

const rarityGlows = {
  common: 'shadow-gray-400/20',
  uncommon: 'shadow-green-400/30',
  rare: 'shadow-blue-400/30',
  epic: 'shadow-purple-400/30',
  legendary: 'shadow-yellow-400/40'
};

export const CrateOpening = ({ crate, onComplete }: CrateOpeningProps) => {
  const [phase, setPhase] = useState<'opening' | 'spinning' | 'revealing' | 'complete'>('opening');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();
  const { playSound } = useAudio();

  useEffect(() => {
    if (phase === 'opening') {
      // Start the crate opening process
      setTimeout(() => {
        openCrate();
      }, 1000);
    }
  }, [phase]);

  const openCrate = async () => {
    try {
      setPhase('spinning');
      playSound('collectbook'); // Play sound effect

      const { data, error } = await supabase.functions.invoke('open-crate', {
        body: { crate_id: crate.id }
      });

      if (error) {
        console.error('Error opening crate:', error);
        toast({
          title: "Error",
          description: "Failed to open crate",
          variant: "destructive"
        });
        onComplete();
        return;
      }

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive"
        });
        onComplete();
        return;
      }

      // Set up the spinning animation with all rewards
      const allRewards = [...data.animation_rewards, data.reward, ...data.animation_rewards];
      setRewards(allRewards);
      setSelectedReward(data.reward);

      // Start spinning animation
      startSpinAnimation(allRewards, data.reward);

    } catch (error) {
      console.error('Error in openCrate:', error);
      toast({
        title: "Error",
        description: "Failed to open crate",
        variant: "destructive"
      });
      onComplete();
    }
  };

  const startSpinAnimation = (allRewards: Reward[], finalReward: Reward) => {
    const totalRewards = allRewards.length;
    const finalIndex = Math.floor(totalRewards / 2); // Place the final reward in the middle
    
    // Replace the middle reward with our actual reward
    allRewards[finalIndex] = finalReward;

    // Animation parameters for exactly 5 seconds at 60fps
    const totalDuration = 5000; // 5 seconds
    const frameRate = 16.67; // ~60fps (1000ms / 60fps)
    const startSpeed = frameRate; // Start at 60fps
    const endSpeed = frameRate * 8; // End at ~7.5fps
    let startTime = Date.now();
    let currentIndex = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressValue = Math.min(elapsed / totalDuration, 1);
      
      // Easing function for smooth deceleration (quintic ease-out)
      const easeOut = 1 - Math.pow(1 - progressValue, 5);
      
      // Calculate current speed based on progress
      const currentSpeed = startSpeed + (endSpeed - startSpeed) * easeOut;
      
      setCurrentIndex(currentIndex);
      
      if (progressValue < 1) {
        // Continue spinning with smooth frame rate
        setTimeout(() => {
          currentIndex = (currentIndex + 1) % totalRewards;
          animate();
        }, currentSpeed);
      } else {
        // Animation complete - stop at final reward
        setCurrentIndex(finalIndex);
        setPhase('revealing');
        
        // Show the final result after a brief pause
        setTimeout(() => {
          setPhase('complete');
          toast({
            title: "Congratulations!",
            description: `You won: ${finalReward.emoji} ${finalReward.name}`,
          });
        }, 500);
      }
    };

    animate();
  };

  const getRarityStyle = (rarity: string) => {
    return `${rarityColors[rarity as keyof typeof rarityColors]} ${rarityGlows[rarity as keyof typeof rarityGlows]}`;
  };

  if (phase === 'opening') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">{crate.emoji}</div>
          <h2 className="text-3xl font-bold mb-2">Opening {crate.name}...</h2>
          <p className="text-muted-foreground">Preparing your rewards...</p>
        </div>
      </div>
    );
  }

  if (phase === 'spinning' || phase === 'revealing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/10 flex items-center justify-center">
        <div className="w-full max-w-4xl mx-auto p-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">🎰 Opening {crate.name}</h2>
          </div>

          {/* Spinning reel */}
          <div className="relative overflow-hidden border-2 border-primary rounded-lg bg-card/80 backdrop-blur-sm">
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-yellow-400 rounded-lg shadow-lg shadow-yellow-400/50" />
            </div>
            
            <div 
              className="flex py-8 transition-transform duration-[16ms] ease-out"
              style={{
                transform: `translateX(${-currentIndex * 128 + 200}px)`,
                willChange: 'transform'
              }}
            >
              {rewards.map((reward, index) => {
                const isCenter = index === currentIndex;
                const distance = Math.abs(index - currentIndex);
                const opacity = distance === 0 ? 1 : distance === 1 ? 0.9 : distance === 2 ? 0.7 : distance === 3 ? 0.4 : 0.2;
                const scale = distance === 0 ? 1.5 : distance === 1 ? 1.2 : distance === 2 ? 1.0 : distance === 3 ? 0.8 : 0.6;
                const blur = distance === 0 ? 'blur(0px)' : distance === 1 ? 'blur(1px)' : distance === 2 ? 'blur(2px)' : distance === 3 ? 'blur(3px)' : 'blur(4px)';
                
                return (
                  <div
                    key={`${reward.id}-${index}`}
                    className={`flex-shrink-0 w-32 h-32 flex flex-col items-center justify-center transition-all duration-[16ms] ease-out ${
                      isCenter ? `${getRarityStyle(reward.rarity)} animate-pulse` : ''
                    }`}
                    style={{
                      opacity,
                      transform: `scale(${scale})`,
                      filter: `${blur} ${isCenter ? 'brightness(1.4) saturate(1.3)' : distance <= 2 ? 'brightness(0.9)' : 'brightness(0.6)'}`,
                      willChange: 'transform, opacity, filter'
                    }}
                  >
                    <div className="text-4xl mb-1 transition-all duration-[16ms]">{reward.emoji}</div>
                    <div className="text-xs font-medium text-center px-1 transition-all duration-[16ms]">{reward.name}</div>
                    <div className={`text-xs capitalize transition-all duration-[16ms] ${rarityColors[reward.rarity as keyof typeof rarityColors]}`}>
                      {reward.rarity}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'complete' && selectedReward) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Card className={`bg-card/90 backdrop-blur-sm border-2 shadow-2xl ${getRarityStyle(selectedReward.rarity)}`}>
            <CardContent className="p-8">
              <div className="text-8xl mb-4">{selectedReward.emoji}</div>
              <h3 className="text-2xl font-bold mb-2">{selectedReward.name}</h3>
              <p className="text-muted-foreground mb-4">{selectedReward.description}</p>
              <div className={`text-lg font-semibold capitalize mb-6 ${rarityColors[selectedReward.rarity as keyof typeof rarityColors]}`}>
                {selectedReward.rarity}
              </div>
              <Button onClick={onComplete} className="w-full">
                Collect Reward
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
};