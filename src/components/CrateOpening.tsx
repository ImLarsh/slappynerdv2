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

      // Build a fixed-size wheel with the final reward in a known target segment
      const segmentCount = 8;
      const targetIndex = 0; // land under the top pointer
      const wheel = Array.from({ length: segmentCount }, (_, i) => data.animation_rewards[i % data.animation_rewards.length]);
      wheel[targetIndex] = data.reward;
      setRewards(wheel);
      setSelectedReward(data.reward);

      // Start wheel animation toward targetIndex
      startSpinAnimation(wheel, data.reward, targetIndex);

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

  const startSpinAnimation = (wheel: Reward[], finalReward: Reward, targetIndex: number) => {
    const segmentCount = wheel.length;
    const degreesPerSegment = 360 / segmentCount;

    // Animation parameters
    const totalDuration = 4500; // 4.5 seconds for a smoother feel
    const minRotations = 4; // full rotations before landing

    // Calculate the exact rotation needed to center the target segment under the pointer
    const finalRotation = (minRotations * 360) + (targetIndex * degreesPerSegment);

    let startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      // Progressive slowdown (ease-out cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      const rotation = finalRotation * easeOutCubic;
      setCurrentRotation(rotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Snap to final index and reveal
        setCurrentRotation(finalRotation);
        setCurrentIndex(targetIndex);
        setPhase('revealing');
        setTimeout(() => {
          setPhase('complete');
          toast({
            title: "Congratulations!",
            description: `You won: ${finalReward.emoji} ${finalReward.name}`,
          });
        }, 600);
      }
    };

    animate();
  };

  const getRarityStyle = (rarity: string) => {
    return `${rarityColors[rarity as keyof typeof rarityColors]} ${rarityGlows[rarity as keyof typeof rarityGlows]}`;
  };

  const getRarityGradient = (rarity: string) => {
    return 'linear-gradient(to top, hsl(var(--muted) / 0.3), hsl(var(--muted) / 0.5))';
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
            <div className="relative w-[600px] h-[600px] rounded-full bg-gradient-to-br from-card via-card/90 to-card/80 backdrop-blur-sm shadow-2xl border-4 border-primary/30 overflow-hidden">
              {/* Pointer/Indicator */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
                <div
                  className="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[25px] border-l-transparent border-r-transparent drop-shadow-xl filter brightness-110"
                  style={{ borderBottomColor: 'hsl(var(--warning))' }}
                ></div>
              </div>
              
              {/* Wheel segments */}
              <div 
                className="relative w-full h-full transition-transform duration-75 ease-out"
                style={{
                  transform: `rotate(${-currentRotation}deg)`,
                  willChange: 'transform'
                }}
              >
                {rewards.map((reward, index) => {
                  const segmentCount = Math.max(rewards.length, 1);
                  const degreesPer = 360 / segmentCount;
                  const angle = degreesPer * index;
                  const selectedIndex = Math.round((currentRotation % 360) / degreesPer) % segmentCount;
                  const isSelected = selectedIndex === index;
                  
                  return (
                    <div
                      key={`${reward.id}-${index}`}
                      className={`absolute w-full h-full transition-all duration-200 ${isSelected ? 'scale-[1.02] z-20' : 'z-10'}`}
                      style={{
                        transform: `rotate(${angle}deg)`,
                        transformOrigin: 'center'
                      }}
                    >
                      
                      {/* Icon positioned at outer edge */}
                      <div
                        className="absolute flex items-center justify-center"
                        style={{
                          top: '15%',
                          left: '50%',
                          transform: `translateX(-50%) translateY(-50%) rotate(${-angle}deg)`,
                        }}
                      >
                        <div className={`transition-all duration-200 ${
                          isSelected ? 'text-6xl drop-shadow-2xl' : 'text-5xl drop-shadow-lg'
                        }`}>
                          {reward.emoji}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Center hub */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-primary to-primary-glow rounded-full border-4 border-background z-30 flex items-center justify-center shadow-xl">
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