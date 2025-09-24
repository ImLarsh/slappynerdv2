-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  player_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Update leaderboards to require authentication and link to profiles
ALTER TABLE public.leaderboards ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update leaderboards RLS policies
DROP POLICY IF EXISTS "Anyone can insert scores" ON public.leaderboards;
DROP POLICY IF EXISTS "Anyone can view leaderboards" ON public.leaderboards;

-- New secure leaderboards policies
CREATE POLICY "Users can view leaderboards" 
ON public.leaderboards 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert their own scores" 
ON public.leaderboards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update user_achievements RLS policies
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view all achievements" ON public.user_achievements;

ALTER TABLE public.user_achievements ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update user_characters RLS policies  
DROP POLICY IF EXISTS "Users can insert their own characters" ON public.user_characters;
DROP POLICY IF EXISTS "Users can view all unlocked characters" ON public.user_characters;

ALTER TABLE public.user_characters ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Users can view their own characters" 
ON public.user_characters 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own characters" 
ON public.user_characters 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update user_settings RLS policies
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view all settings" ON public.user_settings;

ALTER TABLE public.user_settings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Users can view their own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, player_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'player_name', 'Player_' || substr(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();