-- Update ninja character to demon
UPDATE characters SET name = 'Demon', emoji = '👹', unlock_description = 'Unlock by scoring 100 points' WHERE name = 'Ninja';

-- Update achievements that reference the ninja character  
UPDATE achievements SET description = 'Score 100 points in a single game', reward_character_id = (SELECT id FROM characters WHERE name = 'Demon') WHERE condition_value = 100 AND condition_type = 'single_game_score';