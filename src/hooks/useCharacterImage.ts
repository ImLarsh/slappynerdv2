import { useState, useEffect } from 'react';
import nerdDefault from '@/assets/characters/nerd-default.png';
import coolNerd from '@/assets/characters/cool-nerd.png';
import coolNerd2 from '@/assets/characters/cool-nerd-2.png';
import alienNerd from '@/assets/characters/alien-nerd.png';
import robotNerd from '@/assets/characters/robot-nerd.png';
import pheonixNerd from '@/assets/characters/pheonixnerd.png';
import demonNerd from '@/assets/characters/demonnerd.png';
import eagleNerd from '@/assets/characters/eaglenerd.png';
import owlNerd from '@/assets/characters/owlnerd.png';
import parrotNerd from '@/assets/characters/parrotnerd.png';
import flamingoNerd from '@/assets/characters/flamingonerd.png';
import peacockNerd from '@/assets/characters/peacocknerd.png';
import dragonNerd from '@/assets/characters/dragonnerd.png';
import unicornNerd from '@/assets/characters/unicornnerd.png';
import snailNerd from '@/assets/characters/snailnerd.png';

const imageMap: Record<string, string> = {
  'src/assets/characters/nerd-default.png': nerdDefault,
  'src/assets/characters/cool-nerd.png': coolNerd,
  'src/assets/characters/cool-nerd-2.png': coolNerd2,
  'src/assets/characters/alien-nerd.png': alienNerd,
  'src/assets/characters/robot-nerd.png': robotNerd,
  'src/assets/characters/pheonixnerd.png': pheonixNerd,
  'src/assets/characters/demonnerd.png': demonNerd,
  'src/assets/characters/eaglenerd.png': eagleNerd,
  'src/assets/characters/owlnerd.png': owlNerd,
  'src/assets/characters/parrotnerd.png': parrotNerd,
  'src/assets/characters/flamingonerd.png': flamingoNerd,
  'src/assets/characters/peacocknerd.png': peacockNerd,
  'src/assets/characters/dragonnerd.png': dragonNerd,
  'src/assets/characters/unicornnerd.png': unicornNerd,
  'src/assets/characters/snailnerd.png': snailNerd,
};

export const useCharacterImage = (imagePath?: string) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!imagePath) {
      setImageUrl(null);
      return;
    }

    setIsLoading(true);
    if (imageMap[imagePath]) {
      setImageUrl(imageMap[imagePath]);
      setIsLoading(false);
    } else {
      setImageUrl(null);
      setIsLoading(false);
    }
  }, [imagePath]);

  return { imageUrl, isLoading };
};