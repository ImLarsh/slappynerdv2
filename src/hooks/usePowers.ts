import { useState, useCallback, useEffect } from 'react';
import { Power, ActivePower, AVAILABLE_POWERS } from '@/types/powers';

export const usePowers = (playSound?: (soundName: string) => void) => {
  const [activePowers, setActivePowers] = useState<ActivePower[]>([]);
  const [showPowerSelection, setShowPowerSelection] = useState(false);
  const [pipesPassed, setPipesPassed] = useState(0);
  const [nextPowerAt, setNextPowerAt] = useState(Math.floor(Math.random() * 6) + 10); // 10-15 pipes

  // Get 3 random powers for selection using weighted selection
  const getRandomPowers = useCallback((hasLuckyStart: boolean = false): Power[] => {
    const selectedPowers: Power[] = [];
    
    // Create weighted pool with Lucky Start adjustments
    const weightedPool: Power[] = [];
    AVAILABLE_POWERS.forEach(power => {
      let weight = power.weight;
      
      // If player has Lucky Start, boost beneficial powers and reduce harmful ones
      if (hasLuckyStart) {
        if (power.beneficial) {
          weight *= 3; // Triple the chance of beneficial powers
        } else {
          weight = Math.max(1, Math.floor(weight / 2)); // Halve the chance of harmful powers
        }
      }
      
      for (let i = 0; i < weight; i++) {
        weightedPool.push(power);
      }
    });

    // Select 3 unique powers
    const availablePowers = [...AVAILABLE_POWERS];
    for (let i = 0; i < 3 && availablePowers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * weightedPool.length);
      const selectedPower = weightedPool[randomIndex];
      
      // Remove all instances of this power from the pool and available list
      const powerIndex = availablePowers.findIndex(p => p.id === selectedPower.id);
      if (powerIndex !== -1) {
        selectedPowers.push(availablePowers[powerIndex]);
        availablePowers.splice(powerIndex, 1);
        
        // Remove all instances from weighted pool
        for (let j = weightedPool.length - 1; j >= 0; j--) {
          if (weightedPool[j].id === selectedPower.id) {
            weightedPool.splice(j, 1);
          }
        }
      }
    }
    
    return selectedPowers;
  }, []);

  // Add a power with proper timing
  const addPower = useCallback((power: Power | ActivePower) => {
    // Special handling for refresh power
    if (power.id === 'refresh_power') {
      setActivePowers([]);
      setShowPowerSelection(false);
      setNextPowerAt(pipesPassed + Math.floor(Math.random() * 6) + 10);
      return;
    }

    // If it's already an ActivePower with timing, use it directly
    const activePower: ActivePower = 'startTime' in power ? power : {
      ...power,
      startTime: Date.now(),
      endTime: power.effect.duration ? Date.now() + power.effect.duration : undefined,
      stackCount: 1
    };

    setActivePowers(prev => {
      // Check if this power can stack (all except gap widening beneficial powers)
      const canStack = !(power.beneficial && power.effect.gapMultiplier && power.effect.gapMultiplier > 1);
      
      if (canStack) {
        // Find existing power of same ID
        const existingIndex = prev.findIndex(p => p.id === power.id);
        if (existingIndex !== -1) {
          // Stack the power by incrementing count
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            stackCount: (updated[existingIndex].stackCount || 1) + 1,
            startTime: Date.now(),
            endTime: power.effect.duration ? Date.now() + power.effect.duration : undefined
          };
          return updated;
        }
      }

      // For gap widening beneficial powers, don't stack - replace instead
      if (power.beneficial && power.effect.gapMultiplier && power.effect.gapMultiplier > 1) {
        return [...prev.filter(p => p.id !== power.id), activePower];
      }
      
      // For other powers, add them
      return [...prev, activePower];
    });

    setShowPowerSelection(false);
    
    // Set next power selection
    setNextPowerAt(pipesPassed + Math.floor(Math.random() * 6) + 10);
  }, [pipesPassed]);

  // Check if we should show power selection
  const checkPowerSelection = useCallback((currentPipesPassed: number) => {
    setPipesPassed(currentPipesPassed);
    if (currentPipesPassed >= nextPowerAt) {
      setShowPowerSelection(true);
      // Play powerup sound when menu opens
      playSound?.('powerup');
    }
  }, [nextPowerAt]);

  // Clean up expired powers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActivePowers(prev => prev.filter(power => 
        !power.endTime || power.endTime > now
      ));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Calculate current game modifiers
  const getGameModifiers = useCallback(() => {
    const now = Date.now();
    const currentPowers = activePowers.filter(power => 
      !power.endTime || power.endTime > now
    );

    let speedMultiplier = 1;
    let gapMultiplier = 1;
    let isInvincible = false;

    currentPowers.forEach(power => {
      const stackCount = power.stackCount || 1;
      
      if (power.effect.speedMultiplier) {
        // Apply stacking for speed multipliers
        const baseEffect = power.effect.speedMultiplier;
        if (baseEffect > 1) {
          // For speed increases, stack multiplicatively
          speedMultiplier *= Math.pow(baseEffect, stackCount);
        } else {
          // For speed decreases, stack the reduction
          speedMultiplier *= Math.pow(baseEffect, stackCount);
        }
      }
      if (power.effect.gapMultiplier) {
        // Gap effects don't stack (as per requirement)
        gapMultiplier *= power.effect.gapMultiplier;
      }
      if (power.effect.invincible) {
        isInvincible = true;
      }
    });

    return {
      speedMultiplier,
      gapMultiplier,
      isInvincible,
      activePowers: currentPowers
    };
  }, [activePowers]);

  const resetPowers = useCallback(() => {
    setActivePowers([]);
    setPipesPassed(0);
    setNextPowerAt(Math.floor(Math.random() * 6) + 10);
    setShowPowerSelection(false);
  }, []);

  return {
    activePowers,
    showPowerSelection,
    getRandomPowers,
    addPower,
    checkPowerSelection,
    getGameModifiers,
    resetPowers,
    setShowPowerSelection
  };
};