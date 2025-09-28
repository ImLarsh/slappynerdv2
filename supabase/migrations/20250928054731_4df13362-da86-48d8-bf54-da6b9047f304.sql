-- Update the correct wizard and demon characters with proper image paths
UPDATE characters SET image_path = 'src/assets/characters/wizardnerd.png' WHERE emoji = '🧙‍♂️';
UPDATE characters SET image_path = 'src/assets/characters/demonnerd-2.png' WHERE emoji = '👹';

-- Add simple wizard and demon emojis if they don't exist
INSERT INTO characters (emoji, name, image_path, unlock_condition, unlock_description, is_default, sort_order)
SELECT '🧙', 'Simple Wizard', 'src/assets/characters/wizardnerd.png', 'start', 'Available from the start!', false, 15
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE emoji = '🧙');

INSERT INTO characters (emoji, name, image_path, unlock_condition, unlock_description, is_default, sort_order)
SELECT '😈', 'Simple Demon', 'src/assets/characters/demonnerd-2.png', 'start', 'Available from the start!', false, 16
WHERE NOT EXISTS (SELECT 1 FROM characters WHERE emoji = '😈');