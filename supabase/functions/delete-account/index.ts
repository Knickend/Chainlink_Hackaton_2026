import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const userId = user.id;
    console.log(`[DeleteAccount] Starting deletion for user: ${userId}`);

    // Delete from all user-owned tables in dependency-safe order
    const tables = [
      'agent_actions_log',
      'agent_wallets',
      'address_book',
      'asset_transactions',
      'assets',
      'chat_memories',
      'debts',
      'expenses',
      'feedback',
      'financial_goals',
      'income',
      'portfolio_snapshots',
      'rebalance_alerts',
      'user_investment_preferences',
      'user_subscriptions',
      'subscription_cancellations',
      'user_roles',
      'profiles',
    ];

    for (const table of tables) {
      const { error } = await serviceClient
        .from(table)
        .delete()
        .eq('user_id', userId);
      if (error) {
        console.error(`[DeleteAccount] Error deleting from ${table}:`, error.message);
        // Continue with other tables even if one fails
      } else {
        console.log(`[DeleteAccount] Cleared ${table}`);
      }
    }

    // Delete the auth user
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[DeleteAccount] Failed to delete auth user:', deleteError.message);
      throw new Error('Failed to delete account. Please try again.');
    }

    console.log(`[DeleteAccount] Successfully deleted user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[DeleteAccount] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
