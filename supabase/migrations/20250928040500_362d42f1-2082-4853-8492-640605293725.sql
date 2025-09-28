-- Update characters to use the new character images based on their emojis
UPDATE characters 
SET image_path = CASE 
  WHEN emoji = '👽' THEN 'src/assets/characters/alien-nerd.png'
  WHEN emoji = '🤖' THEN 'src/assets/characters/robot-nerd.png'
  WHEN emoji = '😎' THEN 'src/assets/characters/cool-nerd-2.png'
  ELSE image_path  -- Keep existing image_path for other characters
END
WHERE emoji IN ('👽', '🤖', '😎');