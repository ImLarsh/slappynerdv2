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
  const [animationSpeed, setAnimationSpeed] = useState(100);
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
    let currentSpeed = 50;
    let index = 0;
    const totalRewards = allRewards.length;
    const finalIndex = Math.floor(totalRewards / 2); // Place the final reward in the middle

    // Replace the middle reward with our actual reward
    allRewards[finalIndex] = finalReward;

    const animate = () => {
      setCurrentIndex(index);
      index = (index + 1) % totalRewards;
      currentSpeed += 5; // Gradually slow down

      if (currentSpeed < 500) {
        setTimeout(animate, currentSpeed);
      } else {
        // Stop at the final reward
        setCurrentIndex(finalIndex);
        setPhase('revealing');
        
        // Show the final result after a brief pause
        setTimeout(() => {
          setPhase('complete');
          toast({
            title: "Congratulations!",
            description: `You won: ${finalReward.emoji} ${finalReward.name}`,
          });
        }, 1000);
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
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000"
                style={{ width: phase === 'spinning' ? '60%' : '100%' }}
              />
            </div>
          </div>

          {/* Spinning reel */}
          <div className="relative overflow-hidden border-2 border-primary rounded-lg bg-card/80 backdrop-blur-sm">
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-yellow-400 rounded-lg shadow-lg shadow-yellow-400/50" />
            </div>
            
            <div className="flex py-8">
              {rewards.map((reward, index) => {
                const isCenter = index === currentIndex;
                const distance = Math.abs(index - currentIndex);
                const opacity = distance === 0 ? 1 : distance === 1 ? 0.7 : distance === 2 ? 0.4 : 0.2;
                const scale = distance === 0 ? 1.2 : distance === 1 ? 1 : 0.8;
                
                return (
                  <div
                    key={`${reward.id}-${index}`}
                    className={`flex-shrink-0 w-32 h-32 flex flex-col items-center justify-center transition-all duration-200 ${
                      isCenter ? getRarityStyle(reward.rarity) : ''
                    }`}
                    style={{
                      opacity,
                      transform: `scale(${scale})`,
                      marginLeft: index === 0 ? `${50 - currentIndex * 128}px` : '0'
                    }}
                  >
                    <div className="text-4xl mb-1">{reward.emoji}</div>
                    <div className="text-xs font-medium text-center px-1">{reward.name}</div>
                    <div className={`text-xs capitalize ${rarityColors[reward.rarity as keyof typeof rarityColors]}`}>
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