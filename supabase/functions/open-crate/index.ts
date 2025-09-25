import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrateReward {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: string;
  drop_rate: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { crate_id } = await req.json();

    if (!crate_id) {
      return new Response(
        JSON.stringify({ error: 'Crate ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get crate details and price
    const { data: crate, error: crateError } = await supabase
      .from('crates')
      .select('*')
      .eq('id', crate_id)
      .eq('is_available', true)
      .single();

    if (crateError || !crate) {
      return new Response(
        JSON.stringify({ error: 'Crate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's books balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('books')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.books < crate.price) {
      return new Response(
        JSON.stringify({ error: 'Insufficient books' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all possible rewards for this crate
    const { data: rewards, error: rewardsError } = await supabase
      .from('crate_rewards')
      .select('*')
      .eq('crate_id', crate_id)
      .order('drop_rate', { ascending: false });

    if (rewardsError || !rewards || rewards.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No rewards found for this crate' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate random number and select reward based on drop rates
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedReward: CrateReward | null = null;

    for (const reward of rewards) {
      cumulativeProbability += parseFloat(reward.drop_rate.toString());
      if (random <= cumulativeProbability) {
        selectedReward = reward;
        break;
      }
    }

    // Fallback to last reward if none selected (shouldn't happen with proper probabilities)
    if (!selectedReward) {
      selectedReward = rewards[rewards.length - 1];
    }

    // Ensure we have a selected reward
    if (!selectedReward) {
      return new Response(
        JSON.stringify({ error: 'Failed to select reward' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct books from user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ books: profile.books - crate.price })
      .eq('id', user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to deduct books' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the crate opening
    const { error: recordError } = await supabase
      .from('user_crate_openings')
      .insert({
        user_id: user.id,
        crate_id: crate_id,
        reward_id: selectedReward.id
      });

    if (recordError) {
      console.error('Failed to record crate opening:', recordError);
      // Don't fail the request, just log the error
    }

    // Generate additional rewards for animation (all possible rewards)
    const animationRewards = [];
    for (let i = 0; i < 20; i++) {
      const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
      animationRewards.push(randomReward);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reward: selectedReward,
        animation_rewards: animationRewards,
        books_spent: crate.price,
        remaining_books: profile.books - crate.price
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error opening crate:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});