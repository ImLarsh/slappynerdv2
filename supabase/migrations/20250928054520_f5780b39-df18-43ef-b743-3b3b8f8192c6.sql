-- Update character image paths for demon, wizard, and default characters
UPDATE characters SET image_path = 'src/assets/characters/demonnerd-2.png' WHERE emoji = '😈';
UPDATE characters SET image_path = 'src/assets/characters/wizardnerd.png' WHERE emoji = '🧙';
UPDATE characters SET image_path = 'src/assets/characters/defaultnerd.png' WHERE emoji = '🤓';