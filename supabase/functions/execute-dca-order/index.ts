import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via CRON_SECRET
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { strategy_id, user_id, from_token, to_token, amount_usd, trigger_type, token_price_usd } = body;

    if (!strategy_id || !user_id || !amount_usd) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[DCA] Executing order for strategy ${strategy_id}, user ${user_id}, amount $${amount_usd}`);

    // 1. Fetch the strategy to verify it's still active
    const { data: strategy, error: stratErr } = await serviceClient
      .from('dca_strategies')
      .select('*')
      .eq('id', strategy_id)
      .eq('user_id', user_id)
      .single();

    if (stratErr || !strategy) {
      return new Response(JSON.stringify({ error: 'Strategy not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!strategy.is_active) {
      return new Response(JSON.stringify({ error: 'Strategy is inactive', skipped: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Check wallet has trade skill
    const { data: wallet } = await serviceClient
      .from('agent_wallets')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (!wallet?.is_authenticated) {
      return new Response(JSON.stringify({ error: 'Wallet not authenticated' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!wallet.enabled_skills?.includes('trade')) {
      return new Response(JSON.stringify({ error: 'Trade skill disabled' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Check spending limits
    const now = new Date();
    let dailySpent = wallet.daily_spent || 0;
    if (wallet.daily_reset_at && new Date(wallet.daily_reset_at) < new Date(now.toISOString().split('T')[0])) {
      dailySpent = 0;
    }

    if (amount_usd > wallet.spending_limit_per_tx) {
      return new Response(JSON.stringify({ error: `Amount $${amount_usd} exceeds per-tx limit $${wallet.spending_limit_per_tx}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (dailySpent + amount_usd > wallet.spending_limit_daily) {
      return new Response(JSON.stringify({ error: `Would exceed daily limit $${wallet.spending_limit_daily}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Insert pending execution
    const { data: execution, error: execInsertErr } = await serviceClient
      .from('dca_executions')
      .insert({
        strategy_id,
        user_id,
        from_token: from_token || strategy.from_token,
        to_token: to_token || strategy.to_token,
        amount_usd,
        trigger_type: trigger_type || 'scheduled',
        token_price_usd: token_price_usd || null,
        status: 'pending',
      })
      .select()
      .single();

    if (execInsertErr) {
      console.error('[DCA] Failed to insert execution:', execInsertErr);
      throw new Error('Failed to create execution record');
    }

    // 5. Call agent-wallet trade via service role + x-user-id
    const tradePayload = {
      action: 'trade',
      amount: amount_usd,
      from_token: from_token || strategy.from_token,
      to_token: to_token || strategy.to_token,
    };

    const tradeResp = await fetch(`${supabaseUrl}/functions/v1/agent-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'x-user-id': user_id,
      },
      body: JSON.stringify(tradePayload),
    });

    const tradeResult = await tradeResp.json();

    if (!tradeResp.ok || tradeResult.error) {
      // Update execution as failed
      await serviceClient
        .from('dca_executions')
        .update({
          status: 'failed',
          error_message: tradeResult.error || `Trade failed with status ${tradeResp.status}`,
        })
        .eq('id', execution.id);

      return new Response(JSON.stringify({ error: tradeResult.error || 'Trade failed', execution_id: execution.id }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Update execution as completed
    await serviceClient
      .from('dca_executions')
      .update({
        status: 'completed',
        tx_hash: tradeResult.tx_hash || null,
      })
      .eq('id', execution.id);

    // 7. Update strategy totals
    const newTotalSpent = (strategy.total_spent_usd || 0) + amount_usd;
    const newExecutionsCompleted = (strategy.executions_completed || 0) + 1;

    const strategyUpdate: Record<string, any> = {
      total_spent_usd: newTotalSpent,
      executions_completed: newExecutionsCompleted,
      last_executed_at: now.toISOString(),
    };

    // Auto-deactivate if budget exhausted or max executions reached
    if (strategy.total_budget_usd && newTotalSpent >= strategy.total_budget_usd) {
      strategyUpdate.is_active = false;
      console.log(`[DCA] Strategy ${strategy_id} deactivated: budget exhausted`);
    }
    if (strategy.max_executions && newExecutionsCompleted >= strategy.max_executions) {
      strategyUpdate.is_active = false;
      console.log(`[DCA] Strategy ${strategy_id} deactivated: max executions reached`);
    }

    await serviceClient
      .from('dca_strategies')
      .update(strategyUpdate)
      .eq('id', strategy_id);

    console.log(`[DCA] Order executed successfully for strategy ${strategy_id}, tx: ${tradeResult.tx_hash}`);

    return new Response(JSON.stringify({
      success: true,
      execution_id: execution.id,
      tx_hash: tradeResult.tx_hash,
      total_spent: newTotalSpent,
      executions_completed: newExecutionsCompleted,
      strategy_active: strategyUpdate.is_active !== false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[DCA] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
