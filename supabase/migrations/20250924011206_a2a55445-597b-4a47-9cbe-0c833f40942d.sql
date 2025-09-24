-- Create characters table for unlockable emojis
CREATE TABLE public.characters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL,
  unlock_condition text NOT NULL,
  unlock_description text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create achievements table
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  condition_type text NOT NULL, -- 'score_reached', 'games_played', 'total_points', etc.
  condition_value integer NOT NULL,
  reward_character_id uuid REFERENCES public.characters(id),
  icon text NOT NULL DEFAULT '🏆',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_achievements table to track unlocked achievements
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id),
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(player_name, achievement_id)
);

-- Create user_characters table to track unlocked characters
CREATE TABLE public.user_characters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL,
  character_id uuid NOT NULL REFERENCES public.characters(id),
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(player_name, character_id)
);

-- Create user_settings table for selected character
CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL UNIQUE,
  selected_character_id uuid REFERENCES public.characters(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for characters (publicly readable)
CREATE POLICY "Characters are viewable by everyone" 
ON public.characters FOR SELECT USING (true);

-- RLS Policies for achievements (publicly readable)
CREATE POLICY "Achievements are viewable by everyone" 
ON public.achievements FOR SELECT USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view all achievements" 
ON public.user_achievements FOR SELECT USING (true);

CREATE POLICY "Users can insert their own achievements" 
ON public.user_achievements FOR INSERT WITH CHECK (true);

-- RLS Policies for user_characters
CREATE POLICY "Users can view all unlocked characters" 
ON public.user_characters FOR SELECT USING (true);

CREATE POLICY "Users can insert their own characters" 
ON public.user_characters FOR INSERT WITH CHECK (true);

-- RLS Policies for user_settings
CREATE POLICY "Users can view all settings" 
ON public.user_settings FOR SELECT USING (true);

CREATE POLICY "Users can insert their own settings" 
ON public.user_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings FOR UPDATE USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_characters_updated_at
BEFORE UPDATE ON public.characters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at
BEFORE UPDATE ON public.achievements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default characters
INSERT INTO public.characters (name, emoji, unlock_condition, unlock_description, is_default, sort_order) VALUES
('Classic Nerd', '🤓', 'default', 'Default character', true, 0),
('Cool Nerd', '😎', 'score_10', 'Score 10 points in a single game', false, 1),
('Robot', '🤖', 'score_25', 'Score 25 points in a single game', false, 2),
('Alien', '👽', 'score_50', 'Score 50 points in a single game', false, 3),
('Wizard', '🧙‍♂️', 'total_games_50', 'Play 50 total games', false, 4),
('Ninja', '🥷', 'score_100', 'Score 100 points in a single game', false, 5);

-- Insert achievements
INSERT INTO public.achievements (name, description, condition_type, condition_value, reward_character_id, icon) VALUES
('First Flight', 'Score your first point', 'score_reached', 1, NULL, '🆕'),
('Getting Good', 'Score 10 points in a single game', 'score_reached', 10, (SELECT id FROM characters WHERE name = 'Cool Nerd'), '😎'),
('Quarter Century', 'Score 25 points in a single game', 'score_reached', 25, (SELECT id FROM characters WHERE name = 'Robot'), '🤖'),
('Half Century', 'Score 50 points in a single game', 'score_reached', 50, (SELECT id FROM characters WHERE name = 'Alien'), '👽'),
('Centurion', 'Score 100 points in a single game', 'score_reached', 100, (SELECT id FROM characters WHERE name = 'Ninja'), '🥷'),
('Dedication', 'Play 50 total games', 'games_played', 50, (SELECT id FROM characters WHERE name = 'Wizard'), '🧙‍♂️');