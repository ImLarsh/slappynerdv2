import React, { useEffect, useState } from 'react';
import { useCharactersContext } from '@/context/CharactersContext';
import { useAudio } from '@/hooks/useAudio';

interface FallingEmoji {
  id: number;
  emoji: string;
  x: number;
  duration: number;
  delay: number;
  isPopped: boolean;
  popTop?: number;
}

export const FallingEmojis: React.FC = () => {
  const [emojis, setEmojis] = useState<FallingEmoji[]>([]);
  const { characters } = useCharactersContext();
  const { playSound } = useAudio();

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
        delay: 0,
        isPopped: false
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
    }, 5000); // Add new emoji every 5 seconds

    return () => clearInterval(interval);
  }, [characters]);

  const handleEmojiClick = (
    emojiId: number,
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    // Play pop sound
    playSound('emojipop');

    // Capture current screen position to avoid teleporting
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const top = rect.top;

    // Mark emoji as popped and freeze its position
    setEmojis(prev => prev.map(emoji =>
      emoji.id === emojiId
        ? { ...emoji, isPopped: true, popTop: top }
        : emoji
    ));

    // Remove emoji after animation
    setTimeout(() => {
      setEmojis(prev => prev.filter(emoji => emoji.id !== emojiId));
    }, 300);
  };

  const getEmojiStyles = (emoji: FallingEmoji) => {
    const baseStyles = {
      left: `${emoji.x}%`,
      transform: 'translateX(-50%)',
    };

    if (emoji.isPopped) {
      // Pop animation - stay in current position
      return {
        ...baseStyles,
        top: `${emoji.popTop ?? 0}px`,
        animation: 'emoji-pop 0.3s ease-out forwards',
      };
    } else {
      // Falling animation
      return {
        ...baseStyles,
        animation: `fall ${emoji.duration}s ease-out infinite`,
        animationDelay: `${emoji.delay}s`,
      };
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {emojis.map((emoji) => (
        <div
          key={emoji.id}
          className={`absolute text-4xl font-bold antialiased cursor-pointer transition-all duration-300 ${
            emoji.isPopped 
              ? 'pointer-events-none' 
              : 'pointer-events-auto hover:scale-110'
          }`}
          style={getEmojiStyles(emoji)}
          onClick={(e) => handleEmojiClick(emoji.id, e)}
          onTouchStart={(e) => handleEmojiClick(emoji.id, e)}
        >
          {emoji.emoji}
        </div>
      ))}
    </div>
  );
};
