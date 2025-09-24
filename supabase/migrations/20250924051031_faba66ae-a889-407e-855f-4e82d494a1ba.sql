-- Fix the Speed Demon shop item to reference the correct character ID
UPDATE public.shop_items 
SET item_data = jsonb_set(
  item_data, 
  '{character_id}', 
  to_jsonb((SELECT id FROM public.characters WHERE emoji = '👹' LIMIT 1)::text)
)
WHERE name = 'Speed Demon Character';

-- Create user roles enum and table for admin functionality
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Grant admin role to Larsh (jakelarsh@gmail.com)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'jakelarsh@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create RLS policy for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix any existing snail purchases that weren't properly unlocked
-- First, ensure all users who purchased snail have the character unlocked
INSERT INTO public.user_characters (user_id, character_id, player_name)
SELECT 
    up.user_id,
    (SELECT id FROM public.characters WHERE emoji = '🐌' LIMIT 1),
    p.player_name
FROM user_purchases up
JOIN profiles p ON up.user_id = p.id
JOIN shop_items si ON up.shop_item_id = si.id
WHERE si.name = 'Snail Character'
  AND NOT EXISTS (
    SELECT 1 FROM user_characters uc 
    WHERE uc.user_id = up.user_id 
    AND uc.character_id = (SELECT id FROM public.characters WHERE emoji = '🐌' LIMIT 1)
  );