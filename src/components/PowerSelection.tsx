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
    <div className="absolute inset-0 flex items-center justify-center bg-foreground/70 z-50 rounded-lg">
      <div className="p-4 sm:p-6 text-center space-y-4 animate-scale-in max-w-md mx-4">
        {!selectedPower ? (
          <>
            <h2 className="text-xl sm:text-2xl font-bold text-primary">Choose Your Power!</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Select one of these nerdy abilities to help you soar!
            </p>
            
            <div className="grid gap-3">
              {powers.map((power) => (
                <Button
                  key={power.id}
                  onClick={() => handlePowerClick(power)}
                  variant="outline"
                  className="h-auto p-4 text-left hover:bg-accent transition-all duration-200 border-2 hover:border-primary"
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="text-2xl flex-shrink-0">{power.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base">{power.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{power.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-4xl">{selectedPower.emoji}</div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary">Confirm Your Choice</h2>
            <Card className="p-4 border-2 border-primary bg-accent/20">
              <div className="flex items-center space-x-3 w-full">
                <div className="text-3xl flex-shrink-0">{selectedPower.emoji}</div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-bold text-base sm:text-lg">{selectedPower.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedPower.description}</div>
                </div>
              </div>
            </Card>
            <div className="flex space-x-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                variant="default"
                className="flex-1 bg-gradient-button shadow-glow"
              >
                Confirm ✓
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};