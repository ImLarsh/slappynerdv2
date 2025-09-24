import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerName } = await req.json();

    // Comprehensive name validation
    if (!playerName || typeof playerName !== 'string') {
      throw new Error('Player name is required');
    }

    // Length validation
    if (playerName.length < 2 || playerName.length > 20) {
      throw new Error('Player name must be between 2 and 20 characters');
    }

    // Character validation - allow letters, numbers, underscores, hyphens
    const validCharacterRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validCharacterRegex.test(playerName)) {
      throw new Error('Player name can only contain letters, numbers, underscores, and hyphens');
    }

    // Inappropriate content filter (server-side)
    const inappropriateWords = [
      'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap',
      'nazi', 'hitler', 'terrorist', 'kill', 'die', 'suicide',
      'rape', 'porn', 'sex', 'drug', 'cocaine', 'weed',
      'admin', 'moderator', 'owner', 'official', 'support'
    ];

    const lowercaseName = playerName.toLowerCase();
    const hasInappropriateContent = inappropriateWords.some(word => 
      lowercaseName.includes(word)
    );

    if (hasInappropriateContent) {
      throw new Error('Player name contains inappropriate content');
    }

    // Check for name uniqueness
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('player_name', playerName)
      .single();

    if (existingProfile) {
      throw new Error('Player name is already taken');
    }

    console.log(`Player name validated successfully: ${playerName}`);

    return new Response(
      JSON.stringify({ 
        valid: true, 
        message: 'Player name is valid',
        playerName: playerName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    console.error('Error in validate-name function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Invalid player name';
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: errorMessage
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});