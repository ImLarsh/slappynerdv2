-- Update the default character to use the new cool nerd image
UPDATE characters 
SET image_path = 'src/assets/characters/cool-nerd.png'
WHERE is_default = true;