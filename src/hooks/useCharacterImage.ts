import { useState, useEffect } from 'react';
import nerdDefault from '@/assets/characters/nerd-default.png';
import coolNerd from '@/assets/characters/cool-nerd.png';

const imageMap: Record<string, string> = {
  'src/assets/characters/nerd-default.png': nerdDefault,
  'src/assets/characters/cool-nerd.png': coolNerd,
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