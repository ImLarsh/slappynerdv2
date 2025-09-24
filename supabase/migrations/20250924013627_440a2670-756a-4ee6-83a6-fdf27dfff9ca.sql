-- Insert sample achievements
INSERT INTO public.achievements (name, description, icon, condition_type, condition_value, reward_character_id) VALUES
('First Flight', 'Play your first game', '🎮', 'games_played', 1, NULL),
('Getting Started', 'Score at least 5 points', '🌟', 'single_game_score', 5, NULL),
('Double Digits', 'Score at least 10 points', '🔥', 'single_game_score', 10, NULL),
('High Achiever', 'Reach a high score of 20', '🏆', 'high_score', 20, NULL),
('Nerd Elite', 'Reach a high score of 50', '👑', 'high_score', 50, NULL),
('Persistence Pays', 'Play 10 games', '💪', 'games_played', 10, NULL),
('Gaming Marathon', 'Play 50 games', '🎯', 'games_played', 50, NULL);

-- Insert sample characters 
INSERT INTO public.characters (name, emoji, unlock_condition, unlock_description, is_default, sort_order) VALUES
('Regular Nerd', '🤓', 'default', 'Available from the start', true, 1),
('Cool Nerd', '😎', 'score_20', 'Unlock by reaching 20 points', false, 2),
('Smart Nerd', '🧠', 'score_50', 'Unlock by reaching 50 points', false, 3),
('Gaming Nerd', '🎮', 'games_10', 'Unlock by playing 10 games', false, 4);