import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Lock, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCharactersContext } from '@/context/CharactersContext';
import { useCharacterImage } from '@/hooks/useCharacterImage';
import { useAudio } from '@/hooks/useAudio';

interface CharacterSelectionProps {
  onClose?: () => void;
}

interface CharacterDisplayProps {
  character: any;
  isSelected: boolean;
  isUnlocked: boolean;
  size?: 'preview' | 'main';
}

const CharacterDisplay: React.FC<CharacterDisplayProps> = ({ 
  character, 
  isSelected, 
  isUnlocked, 
  size = 'preview' 
}) => {
  const { imageUrl, isLoading } = useCharacterImage(character.image_path);
  
  const sizeClasses = {
    preview: 'w-16 h-16 md:w-20 md:h-20',
    main: 'w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80'
  };
  
  const textSizeClasses = {
    preview: 'text-4xl md:text-5xl',
    main: 'text-8xl md:text-9xl lg:text-[12rem]'
  };

  if (isLoading && size === 'main') {
    return (
      <div className={`${sizeClasses[size]} animate-pulse bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center border-2 border-primary/30`}>
        <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-muted rounded-full animate-spin border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-muted/50 to-muted/80 rounded-lg flex items-center justify-center border-2 border-muted relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <Lock className={`${size === 'main' ? 'w-16 h-16 md:w-20 md:h-20' : 'w-6 h-6'} text-muted-foreground z-10`} />
        {size === 'main' && (
          <div className="absolute bottom-4 left-4 right-4 text-center z-10">
            <p className="text-sm md:text-base text-muted-foreground font-medium">
              {character.unlock_description}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className={`${sizeClasses[size]} relative rounded-lg overflow-hidden ${isSelected && size === 'main' ? 'ring-4 ring-primary animate-pulse' : ''}`}>
        <img 
          src={imageUrl} 
          alt={character.name}
          className="w-full h-full object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
        {isSelected && size === 'main' && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-2">
            <Check className="w-6 h-6" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center rounded-lg ${isSelected && size === 'main' ? 'ring-4 ring-primary' : ''}`}>
      <span className={textSizeClasses[size]}>{character.emoji}</span>
      {isSelected && size === 'main' && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-2">
          <Check className="w-6 h-6" />
        </div>
      )}
    </div>
  );
};

export const CharacterSelection: React.FC<CharacterSelectionProps> = ({ onClose }) => {
  const {
    characters,
    selectedCharacter,
    selectCharacter,
    isCharacterUnlocked,
    loading
  } = useCharactersContext();
  
  const { playSound } = useAudio();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Find the index of the selected character
  useEffect(() => {
    if (selectedCharacter && characters.length > 0) {
      const index = characters.findIndex(char => char.id === selectedCharacter.id);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [selectedCharacter, characters]);

  const navigateCharacter = (direction: 'prev' | 'next') => {
    if (isAnimating || characters.length === 0) return;
    
    setIsAnimating(true);
    playSound('click');
    
    setCurrentIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % characters.length;
      } else {
        return prev === 0 ? characters.length - 1 : prev - 1;
      }
    });
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleCharacterSelect = (characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    if (character && isCharacterUnlocked(characterId)) {
      playSound('emojipop');
      selectCharacter(characterId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full animate-spin border-8 border-primary border-t-transparent"></div>
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Loading Characters...</h2>
        </div>
      </div>
    );
  }

  const currentCharacter = characters[currentIndex];
  const isCurrentUnlocked = currentCharacter ? isCharacterUnlocked(currentCharacter.id) : false;
  const isCurrentSelected = currentCharacter?.id === selectedCharacter?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full animate-float"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-secondary/10 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-20 w-16 h-16 bg-accent/10 rounded-full animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-6">
        {/* Close Button */}
        {onClose && (
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <X className="w-6 h-6" />
          </Button>
        )}
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SELECT CHARACTER
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            Choose your champion for battle
          </p>
        </div>
      </div>

      {/* Main Character Display */}
      <div className="relative z-10 flex flex-col items-center space-y-8 px-4">
        {/* Character Navigation */}
        <div className="flex items-center justify-center space-x-8 md:space-x-12">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigateCharacter('prev')}
            disabled={isAnimating}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border-2 border-primary/30 hover:scale-110 transition-all duration-300"
          >
            <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
          </Button>

          {/* Main Character */}
          <div className={`transition-all duration-300 ${isAnimating ? 'scale-95 opacity-70' : 'scale-100 opacity-100'}`}>
            {currentCharacter && (
              <div className="text-center space-y-6">
                <div className="relative">
                  <CharacterDisplay
                    character={currentCharacter}
                    isSelected={isCurrentSelected}
                    isUnlocked={isCurrentUnlocked}
                    size="main"
                  />
                  
                  {/* Character glow effect */}
                  {isCurrentUnlocked && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg -z-10 blur-xl animate-pulse"></div>
                  )}
                </div>

                {/* Character Info */}
                <div className="space-y-4">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">
                    {currentCharacter.name}
                  </h2>
                  
                  {isCurrentUnlocked && (
                    <div className="flex justify-center">
                      {isCurrentSelected ? (
                        <Badge variant="default" className="px-6 py-2 text-lg font-bold bg-green-500 hover:bg-green-600">
                          <Check className="w-5 h-5 mr-2" />
                          Selected
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => handleCharacterSelect(currentCharacter.id)}
                          size="lg"
                          className="px-8 py-3 text-lg font-bold bg-gradient-to-r from-primary to-secondary hover:scale-105 transition-all duration-300"
                        >
                          Select Character
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={() => navigateCharacter('next')}
            disabled={isAnimating}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border-2 border-primary/30 hover:scale-110 transition-all duration-300"
          >
            <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
          </Button>
        </div>

        {/* Character Gallery */}
        <div className="w-full max-w-6xl">
          <div className="flex justify-center space-x-2 md:space-x-4 overflow-x-auto pb-4">
            {characters.map((character, index) => {
              const isUnlocked = isCharacterUnlocked(character.id);
              const isSelected = character.id === selectedCharacter?.id;
              const isCurrent = index === currentIndex;
              
              return (
                <Card
                  key={character.id}
                  className={`
                    flex-shrink-0 p-3 cursor-pointer transition-all duration-300 relative
                    ${isCurrent ? 'ring-2 ring-primary scale-110 bg-primary/10' : 'hover:scale-105'}
                    ${!isUnlocked ? 'opacity-50' : ''}
                  `}
                  onClick={() => {
                    setCurrentIndex(index);
                    if (isUnlocked) {
                      handleCharacterSelect(character.id);
                    }
                  }}
                >
                  <CharacterDisplay
                    character={character}
                    isSelected={isSelected}
                    isUnlocked={isUnlocked}
                    size="preview"
                  />
                  
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  
                  <p className="text-xs text-center mt-2 font-medium truncate">
                    {character.name}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Stats or Info Panel */}
        {currentCharacter && isCurrentUnlocked && (
          <Card className="w-full max-w-2xl p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold text-primary">Character Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-muted-foreground">Type</p>
                  <p className="font-bold">Nerd Warrior</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-muted-foreground">Rarity</p>
                  <p className="font-bold">Legendary</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-muted-foreground">Power</p>
                  <p className="font-bold">Maximum Knowledge</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};