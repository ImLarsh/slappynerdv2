export interface Power {
  id: string;
  name: string;
  description: string;
  emoji: string;
  type: 'speed' | 'gap' | 'special' | 'temporary';
  beneficial: boolean; // true if this power helps the player
  weight: number; // higher weight = more likely to appear
  effect: {
    speedMultiplier?: number;
    gapMultiplier?: number;
    invincible?: boolean;
    duration?: number; // in milliseconds, undefined for permanent effects
  };
}

export interface ActivePower extends Power {
  startTime: number;
  endTime?: number;
  stackCount?: number; // How many times this power has been stacked
}

export const AVAILABLE_POWERS: Power[] = [
  // Challenging powers (high weight - appear often)
  {
    id: 'speed_boost',
    name: 'Turbo Mode',
    description: 'Increase game speed by 50%',
    emoji: '⚡',
    type: 'speed',
    beneficial: false,
    weight: 15,
    effect: { speedMultiplier: 1.5 }
  },
  {
    id: 'gap_decrease',
    name: 'Tight Squeeze',
    description: 'Make gaps 25% smaller',
    emoji: '🔒',
    type: 'gap',
    beneficial: false,
    weight: 15,
    effect: { gapMultiplier: 0.75 }
  },
  {
    id: 'chaos_mode',
    name: 'Chaos Boost',
    description: 'Speed up by 80% for 6 seconds',
    emoji: '🌪️',
    type: 'temporary',
    beneficial: false,
    weight: 13,
    effect: { speedMultiplier: 1.8, duration: 6000 }
  },
  {
    id: 'micro_gaps',
    name: 'Needle Threading',
    description: 'Tiny gaps for 8 seconds',
    emoji: '🎯',
    type: 'temporary',
    beneficial: false,
    weight: 13,
    effect: { gapMultiplier: 0.6, duration: 8000 }
  },
  {
    id: 'speed_chaos',
    name: 'Speed Demon',
    description: 'Double speed permanently',
    emoji: '👹',
    type: 'speed',
    beneficial: false,
    weight: 12,
    effect: { speedMultiplier: 2.0 }
  },
  {
    id: 'combo_chaos',
    name: 'Double Trouble',
    description: 'Faster + smaller gaps for 5 seconds',
    emoji: '💀',
    type: 'temporary',
    beneficial: false,
    weight: 11,
    effect: { speedMultiplier: 1.6, gapMultiplier: 0.7, duration: 5000 }
  },
  {
    id: 'nightmare_mode',
    name: 'Nightmare Fuel',
    description: 'Ultra speed + micro gaps for 4 seconds',
    emoji: '😈',
    type: 'temporary',
    beneficial: false,
    weight: 10,
    effect: { speedMultiplier: 2.2, gapMultiplier: 0.5, duration: 4000 }
  },
  {
    id: 'locker_spam',
    name: 'Locker Madness',
    description: 'Double the locker spawn rate',
    emoji: '🚪',
    type: 'special',
    beneficial: false,
    weight: 5, // 10% chance (reduced from 11)
    effect: { speedMultiplier: 1.0 } // This will be handled specially in game logic
  },

  // Beneficial powers (low weight - appear rarely)
  {
    id: 'speed_slow',
    name: 'Chill Mode',
    description: 'Decrease game speed by 30%',
    emoji: '🐌',
    type: 'speed',
    beneficial: true,
    weight: 2.5, // 5% chance (increased from 1)
    effect: { speedMultiplier: 0.7 }
  },
  {
    id: 'gap_increase',
    name: 'Wide Gaps',
    description: 'Make gaps 40% wider for 8 seconds',
    emoji: '📏',
    type: 'temporary',
    beneficial: true,
    weight: 2.5, // 5% chance (increased from 1)
    effect: { gapMultiplier: 1.4, duration: 8000 }
  },
  {
    id: 'nerd_mode',
    name: 'Nerd Shield',
    description: 'Invincibility for 5 seconds',
    emoji: '🛡️',
    type: 'temporary',
    beneficial: true,
    weight: 1,
    effect: { invincible: true, duration: 5000 }
  },
  {
    id: 'slow_motion',
    name: 'Matrix Mode',
    description: 'Slow motion for 8 seconds',
    emoji: '⏰',
    type: 'temporary',
    beneficial: true,
    weight: 2.5, // 5% chance (increased from 1)
    effect: { speedMultiplier: 0.4, duration: 8000 }
  },
  {
    id: 'mega_gaps',
    name: 'Easy Street',
    description: 'Huge gaps for 10 seconds',
    emoji: '🚪',
    type: 'temporary',
    beneficial: true,
    weight: 2.5, // 5% chance (increased from 1)
    effect: { gapMultiplier: 2.0, duration: 10000 }
  },
  {
    id: 'precision_mode',
    name: 'Precision Flying',
    description: 'Perfect control for 6 seconds',
    emoji: '🎯',
    type: 'temporary',
    beneficial: true,
    weight: 1,
    effect: { speedMultiplier: 0.8, gapMultiplier: 1.2, duration: 6000 }
  },
  {
    id: 'refresh_power',
    name: 'Fresh Start',
    description: 'Clear all active powerups',
    emoji: '🔄',
    type: 'special',
    beneficial: true,
    weight: 1,
    effect: {}
  }
];