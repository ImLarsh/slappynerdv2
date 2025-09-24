-- Add books currency to profiles table
ALTER TABLE public.profiles 
ADD COLUMN books INTEGER DEFAULT 0 NOT NULL;

-- Create shop items table
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('character', 'power')),
  item_data JSONB NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🛍️',
  is_available BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on shop_items
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing shop items
CREATE POLICY "Shop items are viewable by everyone" 
ON public.shop_items 
FOR SELECT 
USING (is_available = true);

-- Create user purchases table to track what users have bought
CREATE TABLE public.user_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_item_id UUID REFERENCES public.shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_item_id)
);

-- Enable RLS on user_purchases
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for user purchases
CREATE POLICY "Users can view their own purchases" 
ON public.user_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases" 
ON public.user_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add trigger for shop_items updated_at
CREATE TRIGGER update_shop_items_updated_at
BEFORE UPDATE ON public.shop_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial shop items
INSERT INTO public.shop_items (name, description, price, item_type, item_data, emoji, sort_order) VALUES
('Speed Demon Character', 'Unlock the speedy red character', 50, 'character', '{"character_id": "speed_demon", "emoji": "🔥", "name": "Speed Demon"}', '🔥', 1),
('Nerd Character', 'Unlock the classic nerd character', 30, 'character', '{"character_id": "nerd", "emoji": "🤓", "name": "Nerd"}', '🤓', 2),
('Power: Extra Shield', 'Start each game with a 3-second shield', 75, 'power', '{"power_id": "start_shield", "name": "Start Shield", "description": "Begin with 3 seconds of invincibility"}', '🛡️', 3),
('Power: Book Magnet', 'Books are attracted to you for 30 seconds', 100, 'power', '{"power_id": "book_magnet", "name": "Book Magnet", "description": "Automatically collect nearby books"}', '🧲', 4);