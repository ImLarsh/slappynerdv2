import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetPlayerName, bookAmount } = await req.json();

    if (!targetPlayerName || typeof bookAmount !== 'number' || bookAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid parameters. Requires targetPlayerName and positive bookAmount.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the target user by player name
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, player_name, books')
      .eq('player_name', targetPlayerName)
      .single();

    if (profileError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: `Player '${targetPlayerName}' not found.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the target user's books
    const newBookAmount = (targetProfile.books || 0) + bookAmount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ books: newBookAmount })
      .eq('id', targetProfile.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`Admin ${user.email} granted ${bookAmount} books to ${targetPlayerName}. New total: ${newBookAmount}`);

    return new Response(
      JSON.stringify({ 
        message: `Successfully granted ${bookAmount} books to ${targetPlayerName}`,
        newTotal: newBookAmount,
        targetPlayer: targetPlayerName
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in grant-books function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});