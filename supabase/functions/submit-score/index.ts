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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { score, gameData, characterId } = await req.json();

    // Parse and validate score
    const parsedScore = typeof score === 'string' ? parseInt(score, 10) : score;
    
    // Basic anti-cheat validation
    if (parsedScore === null || parsedScore === undefined || isNaN(parsedScore) || parsedScore < 0 || parsedScore > 10000) {
      throw new Error(`Invalid score: received ${score} (type: ${typeof score}), parsed: ${parsedScore}`);
    }

    // Rate limiting check - prevent rapid score submissions
    const { data: recentScores } = await supabase
      .from('leaderboards')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
      .order('created_at', { ascending: false });

    if (recentScores && recentScores.length >= 5) {
      throw new Error('Too many score submissions. Please wait before submitting again.');
    }

    // Get user's profile for player name
    const { data: profile } = await supabase
      .from('profiles')
      .select('player_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Check if this is a new high score for the user
    const { data: existingScore } = await supabase
      .from('leaderboards')
      .select('score')
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .limit(1)
      .single();

    // Check if this is a new high score for the user
    if (!existingScore || parsedScore > existingScore.score) {
      // If user already has a score, update it; otherwise insert new one
      if (existingScore) {
        const { error: updateError } = await supabase
          .from('leaderboards')
          .update({
            score: parsedScore,
            character_id: characterId || null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('score', existingScore.score);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('leaderboards')
          .insert({
            user_id: user.id,
            player_name: profile.player_name,
            score: parsedScore,
            character_id: characterId || null
          });

        if (insertError) {
          throw insertError;
        }
      }

      console.log(`New high score submitted: ${parsedScore} by ${profile.player_name}`);
    } else {
      console.log(`Score ${parsedScore} not high enough for ${profile.player_name} (current best: ${existingScore.score})`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Score submitted successfully',
        isNewHighScore: !existingScore || parsedScore > existingScore.score
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    console.error('Error in submit-score function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      {
        status: errorMessage === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});