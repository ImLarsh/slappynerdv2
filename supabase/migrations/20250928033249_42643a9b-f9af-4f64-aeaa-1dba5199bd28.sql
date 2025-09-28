-- Fix the image path to use the correct format for assets import
UPDATE public.characters 
SET image_path = 'src/assets/characters/nerd-default.png'
WHERE is_default = true;