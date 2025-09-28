-- Add image_path column to characters table
ALTER TABLE public.characters 
ADD COLUMN image_path TEXT;

-- Update the default character to use the nerd image
UPDATE public.characters 
SET image_path = '/src/assets/characters/nerd-default.png'
WHERE is_default = true;

-- If no default character exists, create one
INSERT INTO public.characters (name, emoji, image_path, unlock_condition, unlock_description, is_default, sort_order)
SELECT 'Nerdy', '🤓', '/src/assets/characters/nerd-default.png', 'default', 'Your default character', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.characters WHERE is_default = true);