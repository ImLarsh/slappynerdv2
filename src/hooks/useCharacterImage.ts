import { useState, useEffect } from 'react';
import nerdDefault from '@/assets/characters/nerd-default.png';

const imageMap: Record<string, string> = {
  'src/assets/characters/nerd-default.png': nerdDefault,
};

export const useCharacterImage = (imagePath?: string) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!imagePath) {
      setImageUrl(null);
      return;
    }

    if (imageMap[imagePath]) {
      setImageUrl(imageMap[imagePath]);
    } else {
      setImageUrl(null);
    }
  }, [imagePath]);

  return { imageUrl, isLoading };
};