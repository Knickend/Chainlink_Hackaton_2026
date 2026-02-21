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
    addStep(steps, 'cron_trigger', '⏰ CRE Cron Trigger fired (every 5 min) — starting DCA workflow simulation');

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

    // Filter due (regular pass)
    addStep(steps, 'filter_due', force
      ? '🔓 Force mode enabled — skipping schedule filter, executing ALL strategies'
      : '🔍 Filtering strategies by schedule frequency');

    const dueStrategies = force ? strategies : strategies.filter(isStrategyDue);
    const skippedBySchedule = strategies.length - dueStrategies.length;

    addStep(steps, 'filter_due', `${dueStrategies.length} strategies due by schedule (${skippedBySchedule} not yet due)`);

    // ── Dip-detection pass ──
    const dipCandidates = force ? [] : strategies.filter(
      (s: any) =>
        s.dip_threshold_pct > 0 &&
        s.dip_multiplier > 1 &&
        !dueStrategies.some((d: any) => d.id === s.id)
    );

    interface PendingExec {
      strategy: any;
      triggerType: 'scheduled' | 'dip_buy';
      executionAmount: number;
    }

    const pendingExecutions: PendingExec[] = dueStrategies.map((s: any) => ({
      strategy: s,
      triggerType: 'scheduled' as const,
      executionAmount: s.amount_per_execution,
    }));

    if (dipCandidates.length > 0) {
      addStep(steps, 'dip_check', `🔎 Checking ${dipCandidates.length} strategies for dip-buy opportunities`);

      for (const candidate of dipCandidates) {
        const chainlinkSymbol = CHAINLINK_SYMBOL_MAP[candidate.to_token];
        let currentPrice: number | null = null;

        if (chainlinkSymbol) {
          const { data: priceRows } = await serviceClient
            .from('price_cache')
            .select('price')
            .eq('symbol', chainlinkSymbol)
            .limit(1);

          currentPrice = priceRows && priceRows.length > 0 ? priceRows[0].price : null;
        }

        if (!currentPrice || currentPrice <= 0) {
          addStep(steps, 'dip_check', `⏭️ ${candidate.to_token}: No current price available — skipping dip check`);
          continue;
        }

        // Fetch last completed execution price
        const { data: execRows } = await serviceClient
          .from('dca_executions')
          .select('token_price_usd')
          .eq('strategy_id', candidate.id)
          .eq('status', 'completed')
          .not('token_price_usd', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastPrice = execRows && execRows.length > 0 ? execRows[0].token_price_usd : null;

        if (!lastPrice || lastPrice <= 0) {
          addStep(steps, 'dip_check', `⏭️ ${candidate.to_token}: No previous execution price — skipping dip check`);
          continue;
        }

        const pctDrop = ((lastPrice - currentPrice) / lastPrice) * 100;

        if (pctDrop >= candidate.dip_threshold_pct) {
          const dipAmount = candidate.amount_per_execution * candidate.dip_multiplier;
          addStep(steps, 'dip_check',
            `🔻 Dip detected: ${candidate.to_token} dropped ${pctDrop.toFixed(1)}% (threshold: ${candidate.dip_threshold_pct}%) — triggering dip buy at ${candidate.dip_multiplier}x ($${dipAmount})`
          );
          pendingExecutions.push({
            strategy: candidate,
            triggerType: 'dip_buy',
            executionAmount: dipAmount,
          });
        } else {
          addStep(steps, 'dip_check',
            `✅ ${candidate.to_token}: ${pctDrop > 0 ? `-${pctDrop.toFixed(1)}%` : `+${Math.abs(pctDrop).toFixed(1)}%`} (threshold: ${candidate.dip_threshold_pct}%) — no dip`
          );
        }
      }
    } else if (!force && dipCandidates.length === 0 && dueStrategies.length === 0) {
      addStep(steps, 'dip_check', '⏭️ No dip-eligible strategies to check');
    }

    // Handle case where nothing to execute
    if (pendingExecutions.length === 0) {
      addStep(steps, 'price_check', '⏭️ No strategies due — skipping price check');
      addStep(steps, 'execute_order', '⏭️ No strategies due — skipping execution');
    }

    // Process each pending execution
    for (const pending of pendingExecutions) {
      const strategy = pending.strategy;
      let executionAmount = pending.executionAmount;

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

      // Budget cap
      if (strategy.total_budget_usd) {
        const remaining = strategy.total_budget_usd - (strategy.total_spent_usd || 0);
        executionAmount = Math.min(executionAmount, remaining);
      }

      // Price fetch for scheduled strategies
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

      // For scheduled strategies with dip settings, check for dip on the scheduled run too
      if (pending.triggerType === 'scheduled' && tokenPriceUsd && strategy.dip_threshold_pct > 0 && strategy.dip_multiplier > 1) {
        const { data: execRows } = await serviceClient
          .from('dca_executions')
          .select('token_price_usd')
          .eq('strategy_id', strategy.id)
          .eq('status', 'completed')
          .not('token_price_usd', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastPrice = execRows && execRows.length > 0 ? execRows[0].token_price_usd : null;
        if (lastPrice && lastPrice > 0) {
          const pctDrop = ((lastPrice - tokenPriceUsd) / lastPrice) * 100;
          if (pctDrop >= strategy.dip_threshold_pct) {
            executionAmount = strategy.amount_per_execution * strategy.dip_multiplier;
            addStep(steps, 'price_check',
              `🔻 Dip on scheduled run: ${strategy.to_token} dropped ${pctDrop.toFixed(1)}% — multiplying to $${executionAmount}`
            );
          }
        }
      }

      // Execute order
      const triggerLabel = pending.triggerType === 'dip_buy' ? '(dip buy) ' : '';
      addStep(steps, 'execute_order', `🚀 ${triggerLabel}Calling execute-dca-order for ${strategy.from_token} → ${strategy.to_token} ($${executionAmount})`);

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
            amount_usd: executionAmount,
            trigger_type: pending.triggerType,
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
    const skipped = strategies.length - pendingExecutions.length;

    addStep(steps, 'summary', `🏁 Simulation complete: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped`);

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
