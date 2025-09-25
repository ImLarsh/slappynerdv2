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
  const [currentRotation, setCurrentRotation] = useState(0);
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

    // Wheel rotation animation parameters
    const totalDuration = 4000; // 4 seconds
    const minRotations = 5; // Minimum full rotations
    const degreesPerItem = 360 / totalRewards;
    
    // Calculate target rotation to land on the final reward
    const finalRotation = (minRotations * 360) + (finalIndex * degreesPerItem);
    
    let startTime = Date.now();
    let currentRotation = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      
      // Smooth easing function for wheel rotation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      // Calculate current rotation
      currentRotation = finalRotation * easeOutCubic;
      
      // Update rotation state for the wheel
      setCurrentRotation(currentRotation);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure we're at the final reward
        setCurrentIndex(finalIndex);
        setPhase('revealing');
        
        // Show the final result after a brief pause
        setTimeout(() => {
          setPhase('complete');
          toast({
            title: "Congratulations!",
            description: `You won: ${finalReward.emoji} ${finalReward.name}`,
          });
        }, 800);
      }
    };

    // Start the animation
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

          {/* Spinning wheel */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-96 h-96 border-4 border-primary rounded-full bg-card/80 backdrop-blur-sm overflow-hidden">
              {/* Pointer/Indicator */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
                <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-yellow-400"></div>
              </div>
              
              {/* Wheel segments */}
              <div 
                className="relative w-full h-full transition-transform duration-100 ease-out"
                style={{
                  transform: `rotate(${-currentRotation}deg)`,
                  willChange: 'transform'
                }}
              >
                {rewards.map((reward, index) => {
                  const angle = (360 / rewards.length) * index;
                  const isSelected = index === currentIndex;
                  
                  return (
                    <div
                      key={`${reward.id}-${index}`}
                      className={`absolute w-full h-full transition-all duration-200 ${
                        isSelected ? getRarityStyle(reward.rarity) : ''
                      }`}
                      style={{
                        transform: `rotate(${angle}deg)`,
                        transformOrigin: 'center'
                      }}
                    >
                      {/* Segment background */}
                      <div 
                        className={`absolute top-0 left-1/2 w-4 origin-bottom transition-all duration-200 ${
                          isSelected ? 'opacity-30' : 'opacity-10'
                        }`}
                        style={{
                          height: '50%',
                          backgroundColor: rarityColors[reward.rarity as keyof typeof rarityColors].replace('text-', ''),
                          transform: 'translateX(-50%) rotate(0deg)',
                          clipPath: `polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)`
                        }}
                      />
                      
                      {/* Reward content */}
                      <div
                        className="absolute top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
                        style={{
                          transform: `translateX(-50%) rotate(${-angle}deg)`
                        }}
                      >
                        <div className={`text-2xl mb-1 transition-all duration-200 ${
                          isSelected ? 'scale-150 drop-shadow-lg' : 'scale-100'
                        }`}>
                          {reward.emoji}
                        </div>
                        <div className={`text-xs font-medium text-center transition-all duration-200 ${
                          isSelected ? 'font-bold' : ''
                        }`}>
                          {reward.name}
                        </div>
                        <div className={`text-xs capitalize font-semibold transition-all duration-200 ${
                          rarityColors[reward.rarity as keyof typeof rarityColors]
                        } ${isSelected ? 'text-shadow' : ''}`}>
                          {reward.rarity}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Center decoration */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary rounded-full border-4 border-background z-10 flex items-center justify-center">
                <div className="text-xl">{crate.emoji}</div>
              </div>
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