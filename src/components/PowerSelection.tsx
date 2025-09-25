import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Power } from '@/types/powers';

interface PowerSelectionProps {
  isOpen: boolean;
  powers: Power[];
  onSelectPower: (power: Power) => void;
}

export const PowerSelection: React.FC<PowerSelectionProps> = ({
  isOpen,
  powers,
  onSelectPower
}) => {
  const [selectedPower, setSelectedPower] = useState<Power | null>(null);

  if (!isOpen) return null;

  const handlePowerClick = (power: Power) => {
    setSelectedPower(power);
  };

  const handleConfirm = () => {
    if (selectedPower) {
      onSelectPower(selectedPower);
      setSelectedPower(null);
    }
  };

  const handleCancel = () => {
    setSelectedPower(null);
  };

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-primary/20 via-background/95 to-background/95 backdrop-blur-sm">
      {/* Tap Zones */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none">
        <div className="bg-primary/20 border-2 border-primary/40 rounded-lg p-3 animate-pulse">
          <div className="text-primary text-sm font-semibold">👆 TAP HERE</div>
          <div className="text-xs text-muted-foreground">Safe Zone</div>
        </div>
        <div className="bg-primary/20 border-2 border-primary/40 rounded-lg p-3 animate-pulse">
          <div className="text-primary text-sm font-semibold">TAP HERE 👆</div>
          <div className="text-xs text-muted-foreground">Safe Zone</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-6 sm:p-8 text-center space-y-6 animate-scale-in shadow-2xl max-w-md mx-4 bg-gradient-to-br from-card via-card to-muted/20 border-2 border-primary/20">
          {!selectedPower ? (
            <>
              <div className="relative">
                <div className="text-5xl sm:text-6xl animate-bounce">🎁</div>
                <div className="absolute -top-2 -right-2 text-2xl animate-spin">✨</div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  Power Up Time!
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground animate-fade-in">
                  Choose your nerdy superpower wisely! 🤓
                </p>
              </div>
              
              <div className="grid gap-3 mt-6">
                {powers.map((power, index) => (
                  <Button
                    key={power.id}
                    onClick={() => handlePowerClick(power)}
                    variant="outline"
                    className="h-auto p-4 text-left hover:bg-primary/10 transition-all duration-300 border-2 border-muted hover:border-primary hover:shadow-lg hover:scale-105 bg-card/50"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center space-x-4 w-full">
                      <div className="text-3xl flex-shrink-0 hover:scale-110 transition-transform duration-200">
                        {power.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm sm:text-base text-foreground">{power.name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1">{power.description}</div>
                      </div>
                      <div className="text-primary/60 text-lg">›</div>
                    </div>
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="text-6xl animate-bounce">{selectedPower.emoji}</div>
                <div className="absolute -top-1 -right-1 text-xl animate-ping">⚡</div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  Activate Power?
                </h2>
                <p className="text-xs text-muted-foreground">You're about to unleash:</p>
              </div>
              
              <Card className="p-4 border-2 border-primary bg-gradient-to-r from-primary/5 to-primary-glow/5 shadow-inner">
                <div className="flex items-center space-x-4 w-full">
                  <div className="text-4xl flex-shrink-0">{selectedPower.emoji}</div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-bold text-base sm:text-lg text-foreground">{selectedPower.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">{selectedPower.description}</div>
                  </div>
                </div>
              </Card>
              
              <div className="flex space-x-4 pt-2">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all duration-200"
                >
                  ✕ Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow hover:scale-105 transition-all duration-200 text-primary-foreground font-bold"
                >
                  ⚡ Activate!
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};