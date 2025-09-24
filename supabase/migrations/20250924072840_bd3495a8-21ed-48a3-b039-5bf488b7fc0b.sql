-- Create user_stats table to track game statistics per user
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_games INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for user_stats
CREATE POLICY "Users can view their own stats" 
ON public.user_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" 
ON public.user_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON public.user_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to increment games played and update best score
CREATE OR REPLACE FUNCTION public.update_user_game_stats(
  p_user_id UUID,
  p_score INTEGER
)
RETURNS TABLE(new_total_games INTEGER, new_best_score INTEGER, is_new_best BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stats RECORD;
  new_games INTEGER;
  new_best INTEGER;
  is_best_score BOOLEAN := FALSE;
BEGIN
  -- Get current stats or create if doesn't exist
  SELECT total_games, best_score INTO current_stats
  FROM user_stats 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create new stats record
    new_games := 1;
    new_best := p_score;
    is_best_score := TRUE;
    
    INSERT INTO user_stats (user_id, total_games, best_score)
    VALUES (p_user_id, new_games, new_best);
  ELSE
    -- Update existing stats
    new_games := current_stats.total_games + 1;
    new_best := GREATEST(current_stats.best_score, p_score);
    is_best_score := p_score > current_stats.best_score;
    
    UPDATE user_stats 
    SET total_games = new_games,
        best_score = new_best,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN QUERY SELECT new_games, new_best, is_best_score;
END;
$$;