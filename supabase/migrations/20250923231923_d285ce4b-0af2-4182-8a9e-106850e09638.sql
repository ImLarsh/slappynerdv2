-- Create leaderboards table for storing player scores
CREATE TABLE public.leaderboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- Create policies for leaderboards (read-only for all users, insert for authenticated users)
CREATE POLICY "Anyone can view leaderboards" 
ON public.leaderboards 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert scores" 
ON public.leaderboards 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leaderboards_updated_at
  BEFORE UPDATE ON public.leaderboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance on score-based queries
CREATE INDEX idx_leaderboards_score ON public.leaderboards(score DESC);
CREATE INDEX idx_leaderboards_created_at ON public.leaderboards(created_at DESC);