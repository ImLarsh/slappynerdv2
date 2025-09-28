import React, { useEffect, useState } from 'react';
import { useCharactersContext } from '@/context/CharactersContext';
import { useAudio } from '@/hooks/useAudio';
import { useCharacterImage } from '@/hooks/useCharacterImage';

const FallingCharacterDisplay: React.FC<{ emoji: string; imagePath?: string }> = ({ emoji, imagePath }) => {
  const { imageUrl } = useCharacterImage(imagePath);
  
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt="Character"
        className="w-8 h-8 object-contain"
      />
    );
  }
  
  return <span>{emoji}</span>;
};

interface FallingEmoji {
  id: number;
  emoji: string;
  image_path?: string;
  x: number;
  duration: number;
  delay: number;
  isPopped: boolean;
  popTop?: number;
}

interface FallingEmojisProps {
  onEmojiPop?: () => void;
}

export const FallingEmojis: React.FC<FallingEmojisProps> = ({ onEmojiPop }) => {
  const [emojis, setEmojis] = useState<FallingEmoji[]>([]);
  const { characters } = useCharactersContext();
  const { playSound } = useAudio();

  const createEmoji = () => {
    if (characters.length === 0) return null;
    
    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
    
    return {
      id: Math.random(),
      emoji: randomCharacter.emoji,
      image_path: randomCharacter.image_path,
      x: Math.random() * 80 + 10, // Random x position (10-90% to avoid edges)
      duration: Math.random() * 8 + 12, // Random duration between 12-20 seconds
      delay: 0,
      isPopped: false
    };
  };

  const addNewEmoji = () => {
    const newEmoji = createEmoji();
    if (newEmoji) {
      setEmojis([newEmoji]);
    }
  };

  useEffect(() => {
    if (characters.length === 0) return;

    // Start with one emoji
    addNewEmoji();
  }, [characters]);

  // Add new emoji when current one is removed
  useEffect(() => {
    if (characters.length > 0 && emojis.length === 0) {
      const timeout = setTimeout(addNewEmoji, 500); // Wait 0.5 seconds before new emoji
      return () => clearTimeout(timeout);
    }
  }, [emojis.length, characters.length]);

  const handleEmojiClick = (
    emojiId: number,
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    // Play pop sound and call callback
    playSound('emojipop');
    onEmojiPop?.();

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

    // Create new emoji immediately
    const newEmoji = createEmoji();
    
    // Spawn the new emoji immediately so it starts falling right away
    if (newEmoji) {
      setEmojis(prev => [...prev, newEmoji]);
    }

    // After the pop animation completes, remove the popped one
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
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
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
          <FallingCharacterDisplay emoji={emoji.emoji} imagePath={emoji.image_path} />
        </div>
      ))}
    </div>
  );
};
