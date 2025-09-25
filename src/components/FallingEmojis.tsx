import React, { useEffect, useState } from 'react';
import { useCharactersContext } from '@/context/CharactersContext';

interface FallingEmoji {
  id: number;
  emoji: string;
  x: number;
  duration: number;
  delay: number;
}

export const FallingEmojis: React.FC = () => {
  const [emojis, setEmojis] = useState<FallingEmoji[]>([]);
  const { characters } = useCharactersContext();

  useEffect(() => {
    if (characters.length === 0) return;

    const createEmoji = () => {
      const characterEmojis = characters.map(char => char.emoji);
      const randomEmoji = characterEmojis[Math.floor(Math.random() * characterEmojis.length)];
      
      return {
        id: Math.random(),
        emoji: randomEmoji,
        x: Math.random() * 100, // Random x position (0-100%)
        duration: Math.random() * 10 + 15, // Random duration between 15-25 seconds
        delay: 0
      };
    };

    // Create initial emojis
    const initialEmojis = Array.from({ length: 8 }, createEmoji);
    setEmojis(initialEmojis);

    // Add new emojis periodically
    const interval = setInterval(() => {
      setEmojis(prev => {
        const newEmoji = createEmoji();
        // Keep only the last 12 emojis to prevent memory issues
        return [...prev.slice(-11), newEmoji];
      });
    }, 3000); // Add new emoji every 3 seconds

    return () => clearInterval(interval);
  }, [characters]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-5">
      {emojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute text-4xl opacity-100 animate-fall"
          style={{
            left: `${emoji.x}%`,
            animationDuration: `${emoji.duration}s`,
            animationDelay: `${emoji.delay}s`,
            animationTimingFunction: 'ease-out',
            animationIterationCount: 'infinite',
            transform: 'translateX(-50%)',
          }}
        >
          {emoji.emoji}
        </div>
      ))}
    </div>
  );
};
