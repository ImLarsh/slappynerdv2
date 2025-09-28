import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock } from 'lucide-react';
import { useCharactersContext } from '@/context/CharactersContext';
import { useCharacterImage } from '@/hooks/useCharacterImage';

const CharacterImageDisplay: React.FC<{ character: any; size?: 'small' | 'large' }> = ({ character, size = 'small' }) => {
  const { imageUrl, isLoading } = useCharacterImage(character.image_path);
  const sizeClass = size === 'large' ? 'w-20 h-20' : 'w-16 h-16';
  
  if (isLoading) {
    return <div className={`${sizeClass} animate-pulse bg-gray-200 rounded`}></div>;
  }
  
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={character.name}
        className={`${sizeClass} object-contain`}
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }
  
  return <span className={size === 'large' ? 'text-5xl' : 'text-4xl'}>{character.emoji}</span>;
};
export const CharactersTab: React.FC = () => {
  const {
    characters,
    selectedCharacter,
    selectCharacter,
    isCharacterUnlocked,
    loading
  } = useCharactersContext();
  if (loading) {
    return <div className="text-center py-8">
        <div className="text-4xl animate-pulse">🤓</div>
        <p className="text-muted-foreground mt-2">Loading characters...</p>
      </div>;
  }
  return <div className="space-y-4 h-full flex flex-col">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-primary mb-2">Choose Your Character</h3>
        
      </div>

      <ScrollArea className="flex-1 max-h-[50vh] sm:max-h-[60vh]">
        <div className="grid grid-cols-2 gap-3 p-1">
          {characters.map(character => {
          const unlocked = isCharacterUnlocked(character.id);
          const isSelected = selectedCharacter?.id === character.id;
          return <Card key={character.id} className={`relative p-4 text-center transition-all duration-300 cursor-pointer ${isSelected ? 'ring-2 ring-primary bg-primary/10 scale-105' : unlocked ? 'hover:scale-105 hover:shadow-lg' : 'opacity-60 cursor-not-allowed'}`} onClick={() => unlocked && selectCharacter(character.id)}>
                {!unlocked && <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                    
                  </div>}
                
                <div className="text-4xl mb-2 animate-pulse flex justify-center items-center h-16">
                  {unlocked ? (
                    <CharacterImageDisplay character={character} />
                  ) : '🔒'}
                </div>
                
                <h4 className="font-semibold text-sm mb-1">{character.name}</h4>
                
                {isSelected && unlocked && <Badge variant="default" className="text-xs bg-primary">
                    Selected
                  </Badge>}
                
                {!unlocked && <p className="text-xs text-muted-foreground mt-2">
                    {character.unlock_description}
                  </p>}
              </Card>;
        })}
        </div>
      </ScrollArea>

      {selectedCharacter && <Card className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 mt-4">
          <div className="text-center">
            <div className="text-5xl mb-2 animate-bounce flex justify-center items-center h-20">
              <CharacterImageDisplay character={selectedCharacter} size="large" />
            </div>
            <h3 className="font-bold text-lg text-primary">
              {selectedCharacter.name}
            </h3>
            
          </div>
        </Card>}
    </div>;
};