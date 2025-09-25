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

    // Wheel rotation animation parameters for 8 segments  
    const totalDuration = 4000; // 4 seconds
    const minRotations = 3; // Minimum full rotations
    const degreesPerSegment = 45; // 8 segments = 45 degrees each
    
    // Determine which segment the final reward should be in (0-7)
    const targetSegment = Math.floor(Math.random() * 8);
    
    // Calculate target rotation to land on the selected segment
    const finalRotation = (minRotations * 360) + (targetSegment * degreesPerSegment) + 22.5; // +22.5 to center on segment
    
    let startTime = Date.now();
    let currentRotation = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      
      // Smooth easing function for wheel rotation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      // Calculate current rotation
      currentRotation = finalRotation * easeOutCubic;
      
      // Update rotation state and determine current quadrant
      setCurrentRotation(currentRotation);
      const normalizedRotation = currentRotation % 360;
      const currentQuadrant = Math.floor(normalizedRotation / 90);
      setCurrentIndex(currentQuadrant);
      
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
            <div className="relative w-[500px] h-[500px] rounded-full bg-gradient-to-br from-card via-card/90 to-card/80 backdrop-blur-sm shadow-2xl border-4 border-primary/30 overflow-hidden">
              {/* Pointer/Indicator */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
                <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[25px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-xl filter brightness-110"></div>
              </div>
              
              {/* Wheel segments */}
              <div 
                className="relative w-full h-full transition-transform duration-75 ease-out"
                style={{
                  transform: `rotate(${-currentRotation}deg)`,
                  willChange: 'transform'
                }}
              >
                {rewards.slice(0, 8).map((reward, index) => {
                  const angle = (360 / 8) * index; // 8 segments for clean divisions
                  const isSelected = Math.floor(((currentRotation + 22.5) % 360) / 45) === index;
                  
                  // Rarity-based colors
                  const rarityColors = {
                    common: 'from-green-500/40 to-green-600/60',
                    uncommon: 'from-blue-500/40 to-blue-600/60', 
                    rare: 'from-purple-500/40 to-purple-600/60',
                    epic: 'from-orange-500/40 to-orange-600/60',
                    legendary: 'from-yellow-400/40 to-yellow-500/60'
                  };
                  
                  const segmentColor = rarityColors[reward.rarity as keyof typeof rarityColors] || rarityColors.common;
                  
                  return (
                    <div
                      key={`${reward.id}-${index}`}
                      className={`absolute w-full h-full transition-all duration-200 ${
                        isSelected ? 'scale-105 z-20' : 'z-10'
                      }`}
                      style={{
                        transform: `rotate(${angle}deg)`,
                        transformOrigin: 'center'
                      }}
                    >
                      {/* Segment slice */}
                      <div 
                        className={`absolute top-0 left-1/2 w-1 h-1/2 origin-bottom transition-all duration-200 bg-gradient-to-t ${segmentColor} ${
                          isSelected ? 'brightness-125 shadow-lg' : 'brightness-100'
                        }`}
                        style={{
                          transform: 'translateX(-50%)',
                          clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)',
                          width: '90px',
                          filter: isSelected ? 'drop-shadow(0 0 15px currentColor)' : 'none'
                        }}
                      />
                      
                      {/* Icon */}
                      <div
                        className="absolute flex items-center justify-center"
                        style={{
                          top: '25%',
                          left: '50%',
                          transform: `translateX(-50%) translateY(-50%) rotate(${-angle}deg)`,
                        }}
                      >
                        <div className={`transition-all duration-200 ${
                          isSelected ? 'text-6xl drop-shadow-2xl animate-pulse' : 'text-5xl drop-shadow-lg'
                        }`}>
                          {reward.emoji}
                        </div>
                      </div>
                      
                      {/* Segment border */}
                      <div 
                        className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-background/30 origin-bottom"
                        style={{ transform: 'translateX(-50%)' }}
                      />
                    </div>
                  );
                })}
              </div>
              
              {/* Center hub */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full border-4 border-background z-30 flex items-center justify-center shadow-xl">
                <div className="text-3xl drop-shadow-lg">{crate.emoji}</div>
              </div>
              
              {/* Outer ring decoration */}
              <div className="absolute inset-2 rounded-full border-2 border-primary/20 pointer-events-none"></div>
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