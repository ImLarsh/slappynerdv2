-- Enable real-time for user_achievements table
ALTER TABLE public.user_achievements REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.user_achievements;

-- Enable real-time for user_characters table  
ALTER TABLE public.user_characters REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.user_characters;