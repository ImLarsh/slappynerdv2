-- Create crates table
CREATE TABLE public.crates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📦',
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create crate_rewards table
CREATE TABLE public.crate_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crate_id UUID NOT NULL REFERENCES public.crates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  drop_rate DECIMAL(5,4) NOT NULL CHECK (drop_rate > 0 AND drop_rate <= 1),
  reward_type TEXT NOT NULL DEFAULT 'cosmetic',
  reward_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_crate_openings table to track what users have won
CREATE TABLE public.user_crate_openings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crate_id UUID NOT NULL REFERENCES public.crates(id),
  reward_id UUID NOT NULL REFERENCES public.crate_rewards(id),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crate_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_crate_openings ENABLE ROW LEVEL SECURITY;

-- RLS policies for crates
CREATE POLICY "Crates are viewable by everyone" 
ON public.crates 
FOR SELECT 
USING (is_available = true);

-- RLS policies for crate_rewards
CREATE POLICY "Crate rewards are viewable by everyone" 
ON public.crate_rewards 
FOR SELECT 
USING (true);

-- RLS policies for user_crate_openings
CREATE POLICY "Users can view their own crate openings" 
ON public.user_crate_openings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own crate openings" 
ON public.user_crate_openings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_crates_updated_at
BEFORE UPDATE ON public.crates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crate_rewards_updated_at
BEFORE UPDATE ON public.crate_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert The Nerd Supply crate
INSERT INTO public.crates (name, description, price, emoji, sort_order) VALUES
('The Nerd Supply', 'A mysterious crate filled with exclusive nerd treasures!', 50, '📦', 1);

-- Get the crate ID for rewards (using a variable)
DO $$
DECLARE
  nerd_crate_id UUID;
BEGIN
  SELECT id INTO nerd_crate_id FROM public.crates WHERE name = 'The Nerd Supply' LIMIT 1;
  
  -- Insert placeholder rewards for The Nerd Supply
  INSERT INTO public.crate_rewards (crate_id, name, description, emoji, rarity, drop_rate, reward_type, reward_data) VALUES
  (nerd_crate_id, 'Study Buddy', 'A loyal companion for late night cramming', '🤓', 'common', 0.4000, 'cosmetic', '{"type": "character", "unlock_character": true}'),
  (nerd_crate_id, 'Golden Calculator', 'For those complex equations', '🧮', 'uncommon', 0.3000, 'cosmetic', '{"type": "item", "special_effect": "math_boost"}'),
  (nerd_crate_id, 'Laser Pointer', 'Professional presentation tool', '🔦', 'uncommon', 0.2000, 'cosmetic', '{"type": "item", "special_effect": "precision"}'),
  (nerd_crate_id, 'Binary Glasses', 'See the world in 1s and 0s', '👓', 'rare', 0.0800, 'cosmetic', '{"type": "accessory", "visual_effect": "binary_vision"}'),
  (nerd_crate_id, 'Quantum Pencil', 'Writes in multiple dimensions', '✏️', 'epic', 0.0150, 'cosmetic', '{"type": "tool", "special_ability": "quantum_write"}'),
  (nerd_crate_id, 'Legendary Brain', 'The ultimate thinking machine', '🧠', 'legendary', 0.0050, 'cosmetic', '{"type": "character", "legendary_effect": true}');
END $$;