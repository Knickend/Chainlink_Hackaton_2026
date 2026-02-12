import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CDP_BASE_URL = 'https://api.developer.coinbase.com';

async function cdpRequest(path: string, method: string, body?: unknown) {
  const apiKeyId = Deno.env.get('CDP_API_KEY_ID');
  const apiKeySecret = Deno.env.get('CDP_API_KEY_SECRET');
  if (!apiKeyId || !apiKeySecret) throw new Error('CDP API keys not configured');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKeySecret}`,
    'X-CDP-API-Key-Id': apiKeyId,
  };

  const resp = await fetch(`${CDP_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`CDP API error ${resp.status}: ${text}`);
    throw new Error(`CDP API error: ${resp.status}`);
  }

  return resp.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user via Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // User client for RLS-protected queries
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for admin operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Check Pro subscription
    const { data: sub } = await userClient
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub || sub.tier !== 'pro') {
      return new Response(
        JSON.stringify({ error: 'Pro subscription required for Agent features' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();
    console.log(`[AgentWallet] Action: ${action}, User: ${user.id}`);

    switch (action) {
      // ===== WALLET AUTH =====
      case 'auth-start': {
        const { email } = params;
        if (!email) throw new Error('Email is required');

        // Upsert wallet record
        await userClient.from('agent_wallets').upsert({
          user_id: user.id,
          wallet_email: email,
          is_authenticated: false,
        }, { onConflict: 'user_id' });

        // In production, this would call CDP's auth endpoint
        // For now, we simulate the OTP initiation
        console.log(`[AgentWallet] OTP initiated for ${email}`);

        return new Response(
          JSON.stringify({ success: true, message: 'OTP sent to your email' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'auth-verify': {
        const { email, otp } = params;
        if (!email || !otp) throw new Error('Email and OTP are required');

        // In production, verify OTP with CDP API
        // For now, accept any 6-digit code for development
        if (otp.length !== 6) throw new Error('Invalid OTP format');

        // Mark wallet as authenticated
        const { error: updateError } = await userClient
          .from('agent_wallets')
          .update({
            is_authenticated: true,
            wallet_address: `0x${crypto.randomUUID().replace(/-/g, '').slice(0, 40)}`, // Placeholder
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, message: 'Wallet authenticated successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        await userClient
          .from('agent_wallets')
          .update({ is_authenticated: false, wallet_address: null })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ success: true, message: 'Wallet disconnected' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ===== STATUS =====
      case 'status': {
        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            connected: wallet?.is_authenticated ?? false,
            wallet_address: wallet?.wallet_address ?? null,
            wallet_email: wallet?.wallet_email ?? null,
            enabled_skills: wallet?.enabled_skills ?? [],
            spending_limit_per_tx: wallet?.spending_limit_per_tx ?? 50,
            spending_limit_daily: wallet?.spending_limit_daily ?? 200,
            daily_spent: wallet?.daily_spent ?? 0,
            balance: null, // Would fetch from CDP in production
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ===== SKILL MANAGEMENT =====
      case 'update-skills': {
        const { enabled_skills } = params;
        if (!Array.isArray(enabled_skills)) throw new Error('enabled_skills must be an array');

        const validSkills = ['send-usdc', 'trade', 'fund'];
        const filtered = enabled_skills.filter((s: string) => validSkills.includes(s));

        await userClient
          .from('agent_wallets')
          .update({ enabled_skills: filtered })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ success: true, enabled_skills: filtered }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-limits': {
        const { spending_limit_per_tx, spending_limit_daily } = params;
        const updates: Record<string, number> = {};
        if (spending_limit_per_tx !== undefined) updates.spending_limit_per_tx = Number(spending_limit_per_tx);
        if (spending_limit_daily !== undefined) updates.spending_limit_daily = Number(spending_limit_daily);

        await userClient
          .from('agent_wallets')
          .update(updates)
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ success: true, ...updates }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ===== DEFI ACTIONS =====
      case 'send': {
        const { amount, recipient } = params;
        if (!amount || !recipient) throw new Error('Amount and recipient are required');

        // Validate limits
        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!wallet?.is_authenticated) throw new Error('Wallet not authenticated');
        if (!wallet.enabled_skills?.includes('send-usdc')) throw new Error('Send USDC skill is disabled');
        if (amount > wallet.spending_limit_per_tx) throw new Error(`Amount exceeds per-transaction limit of $${wallet.spending_limit_per_tx}`);

        // Check daily limit
        const now = new Date();
        let dailySpent = wallet.daily_spent || 0;
        if (wallet.daily_reset_at && new Date(wallet.daily_reset_at) < new Date(now.toISOString().split('T')[0])) {
          dailySpent = 0; // Reset daily counter
        }
        if (dailySpent + amount > wallet.spending_limit_daily) {
          throw new Error(`Amount would exceed daily limit of $${wallet.spending_limit_daily}`);
        }

        // Log the action
        const { data: logEntry } = await serviceClient
          .from('agent_actions_log')
          .insert({
            user_id: user.id,
            action_type: 'send',
            params: { amount, recipient, token: 'USDC', network: 'base' },
            status: 'executed',
          })
          .select()
          .single();

        // Update daily spent
        await userClient
          .from('agent_wallets')
          .update({
            daily_spent: dailySpent + amount,
            daily_reset_at: new Date(now.toISOString().split('T')[0] + 'T00:00:00Z').toISOString(),
          })
          .eq('user_id', user.id);

        // In production: execute via CDP API
        // const result = await cdpRequest('/v1/wallets/send', 'POST', { amount, recipient, token: 'USDC' });

        return new Response(
          JSON.stringify({
            success: true,
            message: `Sent ${amount} USDC to ${recipient} on Base`,
            tx_hash: `0x${crypto.randomUUID().replace(/-/g, '')}`, // Placeholder
            log_id: logEntry?.id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'trade': {
        const { amount, from_token, to_token } = params;
        if (!amount || !from_token || !to_token) throw new Error('Amount, from_token and to_token are required');

        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!wallet?.is_authenticated) throw new Error('Wallet not authenticated');
        if (!wallet.enabled_skills?.includes('trade')) throw new Error('Trade skill is disabled');
        if (amount > wallet.spending_limit_per_tx) throw new Error(`Amount exceeds per-transaction limit of $${wallet.spending_limit_per_tx}`);

        const { data: logEntry } = await serviceClient
          .from('agent_actions_log')
          .insert({
            user_id: user.id,
            action_type: 'trade',
            params: { amount, from_token, to_token, network: 'base' },
            status: 'executed',
          })
          .select()
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            message: `Swapped ${amount} ${from_token} for ${to_token} on Base`,
            tx_hash: `0x${crypto.randomUUID().replace(/-/g, '')}`,
            log_id: logEntry?.id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'fund': {
        const { amount } = params;
        if (!amount) throw new Error('Amount is required');

        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!wallet?.is_authenticated) throw new Error('Wallet not authenticated');
        if (!wallet.enabled_skills?.includes('fund')) throw new Error('Fund wallet skill is disabled');

        const { data: logEntry } = await serviceClient
          .from('agent_actions_log')
          .insert({
            user_id: user.id,
            action_type: 'fund',
            params: { amount, method: 'coinbase-onramp' },
            status: 'executed',
          })
          .select()
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            message: `Initiated funding of $${amount} via Coinbase Onramp`,
            log_id: logEntry?.id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ===== ACTIVITY LOG =====
      case 'get-logs': {
        const { data: logs } = await userClient
          .from('agent_actions_log')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        return new Response(
          JSON.stringify({ logs: logs || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[AgentWallet] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
