import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CHAINLINK_SYMBOL_MAP: Record<string, string> = {
  cbBTC: "base:cbBTC/USD",
  ETH: "base:ETH/USD",
  WETH: "base:ETH/USD",
};

interface StepLog {
  step: string;
  message: string;
  timestamp: string;
}

interface ExecutionResult {
  strategy_id: string;
  success: boolean;
  error?: string;
  tx_hash?: string;
}

function addStep(steps: StepLog[], step: string, message: string) {
  steps.push({ step, message, timestamp: new Date().toISOString() });
}

function isStrategyDue(strategy: any): boolean {
  const now = new Date();
  const lastExec = strategy.last_executed_at
    ? new Date(strategy.last_executed_at)
    : strategy.next_execution_at
      ? new Date(strategy.next_execution_at)
      : new Date(strategy.created_at);

  const diffMs = now.getTime() - lastExec.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  switch (strategy.frequency) {
    case 'hourly': return diffHours >= 1;
    case 'daily': return diffHours >= 24;
    case 'weekly': return diffHours >= 168;
    case 'biweekly': return diffHours >= 336;
    case 'monthly': return diffHours >= 720;
    default: return diffHours >= 24;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const steps: StepLog[] = [];
  const results: ExecutionResult[] = [];

  try {
    addStep(steps, 'cron_trigger', '⏰ CRE Cron Trigger fired — starting DCA workflow simulation');

    // Auth: user JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET')!;

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    // Fetch active strategies
    addStep(steps, 'fetch_strategies', '📡 HTTPClient: Fetching active DCA strategies from database');

    const { data: strategies, error: stratErr } = await serviceClient
      .from('dca_strategies')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (stratErr) throw new Error(`Failed to fetch strategies: ${stratErr.message}`);

    addStep(steps, 'fetch_strategies', `Found ${strategies?.length || 0} active strategies`);

    if (!strategies || strategies.length === 0) {
      return new Response(JSON.stringify({
        steps,
        results: [],
        summary: { total: 0, succeeded: 0, failed: 0, skipped: 0 },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Filter due
    addStep(steps, 'filter_due', force
      ? '🔓 Force mode enabled — skipping schedule filter, executing ALL strategies'
      : '🔍 Filtering strategies by schedule frequency');

    const dueStrategies = force ? strategies : strategies.filter(isStrategyDue);
    const skipped = strategies.length - dueStrategies.length;

    addStep(steps, 'filter_due', `${dueStrategies.length} strategies due for execution (${skipped} skipped)`);

    // Process each
    for (const strategy of dueStrategies) {
      // Budget check
      if (strategy.total_budget_usd && strategy.total_spent_usd >= strategy.total_budget_usd) {
        addStep(steps, 'price_check', `⏭️ ${strategy.to_token}: Budget exhausted ($${strategy.total_spent_usd}/$${strategy.total_budget_usd})`);
        results.push({ strategy_id: strategy.id, success: false, error: 'Budget exhausted' });
        continue;
      }
      if (strategy.max_executions && strategy.executions_completed >= strategy.max_executions) {
        addStep(steps, 'price_check', `⏭️ ${strategy.to_token}: Max executions reached (${strategy.executions_completed}/${strategy.max_executions})`);
        results.push({ strategy_id: strategy.id, success: false, error: 'Max executions reached' });
        continue;
      }

      // Price fetch
      const chainlinkSymbol = CHAINLINK_SYMBOL_MAP[strategy.to_token];
      let tokenPriceUsd: number | null = null;

      if (chainlinkSymbol) {
        addStep(steps, 'price_check', `📊 Querying Chainlink price feed: ${chainlinkSymbol}`);

        const { data: priceRows, error: priceErr } = await serviceClient
          .from('price_cache')
          .select('price')
          .eq('symbol', chainlinkSymbol)
          .limit(1);

        if (!priceErr && priceRows && priceRows.length > 0) {
          tokenPriceUsd = priceRows[0].price;
          addStep(steps, 'price_check', `✅ Chainlink price for ${strategy.to_token}: $${Number(tokenPriceUsd).toLocaleString()}`);
        } else {
          addStep(steps, 'price_check', `⚠️ No Chainlink price available for ${chainlinkSymbol}`);
        }
      } else {
        addStep(steps, 'price_check', `⚠️ No Chainlink mapping for ${strategy.to_token}, proceeding without price`);
      }

      // Execute order
      addStep(steps, 'execute_order', `🚀 Calling execute-dca-order for ${strategy.from_token} → ${strategy.to_token} ($${strategy.amount_per_execution})`);

      try {
        const execResp = await fetch(`${supabaseUrl}/functions/v1/execute-dca-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({
            strategy_id: strategy.id,
            user_id: user.id,
            from_token: strategy.from_token,
            to_token: strategy.to_token,
            amount_usd: strategy.amount_per_execution,
            trigger_type: 'simulated',
            token_price_usd: tokenPriceUsd,
          }),
        });

        const execResult = await execResp.json();

        if (execResp.ok && execResult.success) {
          addStep(steps, 'execute_order', `✅ Order executed — tx: ${execResult.tx_hash || 'pending'}`);
          results.push({ strategy_id: strategy.id, success: true, tx_hash: execResult.tx_hash });
        } else {
          const errMsg = execResult.error || `HTTP ${execResp.status}`;
          addStep(steps, 'execute_order', `❌ Order failed: ${errMsg}`);
          results.push({ strategy_id: strategy.id, success: false, error: errMsg });
        }
      } catch (execErr) {
        const errMsg = execErr instanceof Error ? execErr.message : 'Unknown error';
        addStep(steps, 'execute_order', `❌ Execution error: ${errMsg}`);
        results.push({ strategy_id: strategy.id, success: false, error: errMsg });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    addStep(steps, 'execute_order', `🏁 Simulation complete: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped`);

    return new Response(JSON.stringify({
      steps,
      results,
      summary: { total: strategies.length, succeeded, failed, skipped },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[simulate-dca-cre] Error:', error);
    addStep(steps, 'error', `Fatal error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return new Response(JSON.stringify({
      steps,
      results,
      summary: { total: 0, succeeded: 0, failed: 0, skipped: 0 },
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
