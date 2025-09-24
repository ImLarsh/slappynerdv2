-- First clear all references in the correct order
DELETE FROM public.user_characters;
DELETE FROM public.user_achievements;
DELETE FROM public.user_settings;
DELETE FROM public.achievements;  -- Delete achievements before characters
DELETE FROM public.characters;

-- Insert the new character set
INSERT INTO public.characters (name, emoji, unlock_condition, unlock_description, is_default, sort_order) VALUES
('Classic Nerd', '🤓', 'default', 'Available from the start', true, 1),
('Cool Nerd', '😎', 'score_10', 'Unlock by scoring 10 points', false, 2),
('Robot', '🤖', 'score_25', 'Unlock by scoring 25 points', false, 3),
('Alien', '👽', 'score_50', 'Unlock by scoring 50 points', false, 4),
('Wizard', '🧙‍♂️', 'games_25', 'Unlock by playing 25 games', false, 5),
('Ninja', '🥷', 'score_100', 'Unlock by scoring 100 points', false, 6);

-- Insert achievements with proper character rewards
INSERT INTO public.achievements (name, description, icon, condition_type, condition_value, reward_character_id) VALUES
('First Flight', 'Score your first point', '🎮', 'single_game_score', 1, NULL),
('Getting Good', 'Score 10 points in a single game', '🌟', 'single_game_score', 10, (SELECT id FROM characters WHERE name = 'Cool Nerd')),
('Quarter Century', 'Score 25 points in a single game', '🔥', 'single_game_score', 25, (SELECT id FROM characters WHERE name = 'Robot')),
('Half Century', 'Score 50 points in a single game', '🏆', 'single_game_score', 50, (SELECT id FROM characters WHERE name = 'Alien')),
('Centurion', 'Score 100 points in a single game', '👑', 'single_game_score', 100, (SELECT id FROM characters WHERE name = 'Ninja')),
('Dedication', 'Play 50 total games', '💪', 'games_played', 50, (SELECT id FROM characters WHERE name = 'Wizard')),
('Persistent Player', 'Play 10 total games', '🎯', 'games_played', 10, NULL),
('Marathon Gamer', 'Play 100 total games', '🏃‍♂️', 'games_played', 100, NULL),
('High Score Champion', 'Reach a personal best of 75 points', '⭐', 'high_score', 75, NULL),
('Score Master', 'Reach a personal best of 150 points', '🌟', 'high_score', 150, NULL);