import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Lock, Check, ChevronLeft, ChevronRight, X, ArrowLeft } from 'lucide-react';
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
  const {
    imageUrl,
    isLoading
  } = useCharacterImage(character.image_path);
  const sizeClasses = {
    preview: 'w-16 h-16 md:w-20 md:h-20',
    main: 'w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-64 lg:h-64'
  };
  const textSizeClasses = {
    preview: 'text-4xl md:text-5xl',
    main: 'text-6xl sm:text-7xl md:text-8xl lg:text-9xl'
  };
  if (isLoading && size === 'main') {
    return <div className={`${sizeClasses[size]} animate-pulse bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center border-2 border-primary/30`}>
        <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-muted rounded-full animate-spin border-4 border-primary border-t-transparent"></div>
      </div>;
  }
  if (!isUnlocked) {
    return <div className={`${sizeClasses[size]} bg-gradient-to-br from-muted/50 to-muted/80 rounded-lg flex items-center justify-center border-2 border-muted relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <Lock className={`${size === 'main' ? 'w-16 h-16 md:w-20 md:h-20' : 'w-6 h-6'} text-muted-foreground z-10`} />
        {size === 'main' && <div className="absolute bottom-4 left-4 right-4 text-center z-10">
            <p className="text-sm md:text-base text-muted-foreground font-medium">
              {character.unlock_description}
            </p>
          </div>}
      </div>;
  }
  if (imageUrl) {
    return <div className={`${sizeClasses[size]} relative rounded-lg overflow-hidden flex items-center justify-center mx-auto ${isSelected && size === 'main' ? 'ring-4 ring-yellow-400' : ''}`}>
        <img src={imageUrl} alt={character.name} className="w-full h-full object-contain mx-auto" style={{
        imageRendering: 'pixelated'
      }} />
      </div>;
  }
  return <div className={`${sizeClasses[size]} flex items-center justify-center rounded-lg ${isSelected && size === 'main' ? 'ring-4 ring-yellow-400' : ''}`}>
      <span className={textSizeClasses[size]}>{character.emoji}</span>
    </div>;
};
export const CharacterSelection: React.FC<CharacterSelectionProps> = ({
  onClose
}) => {
  const {
    characters,
    selectedCharacter,
    selectCharacter,
    isCharacterUnlocked,
    loading
  } = useCharactersContext();
  const {
    playSound
  } = useAudio();
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
    return <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full animate-spin border-8 border-primary border-t-transparent"></div>
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Loading Characters...</h2>
        </div>
      </div>;
  }
  const currentCharacter = characters[currentIndex];
  const isCurrentUnlocked = currentCharacter ? isCharacterUnlocked(currentCharacter.id) : false;
  const isCurrentSelected = currentCharacter?.id === selectedCharacter?.id;
  return <div className="min-h-screen relative overflow-hidden bg-transparent">
      {/* Main Character Display */}
      <div className="relative z-10 flex flex-col items-center space-y-8 px-4 my-[187px]">
        {/* Character Navigation */}
        <div className="flex items-center justify-center space-x-4 sm:space-x-8 md:space-x-12 my-8 sm:my-16 md:my-[114px] px-4">
          <Button variant="outline" size="lg" onClick={() => navigateCharacter('prev')} disabled={isAnimating} className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-yellow-400/40 to-yellow-500/40 border-2 border-yellow-400 hover:scale-110 hover:shadow-lg hover:shadow-yellow-400/50 hover:bg-gradient-to-r hover:from-yellow-400/60 hover:to-yellow-500/60 hover:border-yellow-500 transition-all duration-300 backdrop-blur-sm">
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-yellow-900 font-bold" />
          </Button>

          {/* Main Character */}
          <div className={`transition-all duration-300 flex justify-center ${isAnimating ? 'scale-95 opacity-70' : 'scale-100 opacity-100'}`}>
            {currentCharacter && <div className="text-center space-y-3 sm:space-y-4 md:space-y-6 flex flex-col items-center">
                <div className="relative flex justify-center">
                  <CharacterDisplay character={currentCharacter} isSelected={isCurrentSelected} isUnlocked={isCurrentUnlocked} size="main" />
                  
                  {/* Character glow effect */}
                  {isCurrentUnlocked && <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg -z-10 blur-xl"></div>}
                </div>

                {/* Character Info */}
                <div className="space-y-4">
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-yellow-500">
                    {currentCharacter.name}
                  </h2>
                  
                  {isCurrentUnlocked && <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
                      {isCurrentSelected ? <div className="flex flex-col items-center gap-3 sm:gap-4">
                          <Badge variant="default" className="px-4 py-2 sm:px-6 sm:py-2 text-base sm:text-lg font-bold bg-green-500 hover:bg-green-600">
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Selected
                          </Badge>
                          <Button
                            onClick={onClose}
                            variant="outline"
                            size="lg"
                            className="bg-red-500/90 hover:bg-red-600/90 text-white border-red-400 backdrop-blur-sm shadow-lg px-4 py-2 sm:px-6 sm:py-2 text-sm sm:text-base"
                          >
                            <ArrowLeft className="w-4 h-4 sm:w-6 sm:h-6 mr-2" />
                            Back
                          </Button>
                        </div> : <Button onClick={() => handleCharacterSelect(currentCharacter.id)} size="lg" className="px-6 py-3 sm:px-8 sm:py-3 text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-secondary hover:scale-105 transition-all duration-300">
                          Select Character
                        </Button>}
                    </div>}
                </div>
              </div>}
          </div>

          <Button variant="outline" size="lg" onClick={() => navigateCharacter('next')} disabled={isAnimating} className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-yellow-400/40 to-yellow-500/40 border-2 border-yellow-400 hover:scale-110 hover:shadow-lg hover:shadow-yellow-400/50 hover:bg-gradient-to-r hover:from-yellow-400/60 hover:to-yellow-500/60 hover:border-yellow-500 transition-all duration-300 backdrop-blur-sm">
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-yellow-900 font-bold" />
          </Button>
        </div>

        {/* Character Gallery */}
        <div className="w-full max-w-6xl py-0">
          
        </div>

        {/* Stats or Info Panel */}
        {currentCharacter && isCurrentUnlocked}
      </div>
    </div>;
};