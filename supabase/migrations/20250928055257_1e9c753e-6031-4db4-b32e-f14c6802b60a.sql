-- Remove simple wizard and simple demon from the game
-- First clear any user selections pointing to these characters
UPDATE user_settings
SET selected_character_id = NULL
WHERE selected_character_id IN (
  SELECT id FROM characters WHERE emoji IN ('🧙', '😈')
);

-- Remove user unlock records for these characters
DELETE FROM user_characters
WHERE character_id IN (
  SELECT id FROM characters WHERE emoji IN ('🧙', '😈')
);

-- Finally delete the characters themselves
DELETE FROM characters
WHERE emoji IN ('🧙', '😈');