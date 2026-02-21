/**
 * DCA Trigger CRE Workflow
 *
 * Runs every 5 minutes via Chainlink CRE. On each tick:
 *   1. Regular pass: executes strategies whose schedule frequency is due
 *   2. Dip-detection pass: for strategies with dip_threshold_pct > 0 that
 *      are NOT already in the regular batch, compares current price against
 *      last execution price. If price dropped >= threshold, triggers a
 *      dip-buy with the multiplied amount.
 */

import * as cre from "@chainlink/cre-sdk";

type DCAConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  cronSecret: string;
  priceApiUrl?: string;
};

interface DCAStrategy {
  id: string;
  user_id: string;
  from_token: string;
  to_token: string;
  amount_per_execution: number;
  frequency: string;
  is_active: boolean;
  last_executed_at: string | null;
  total_budget_usd: number | null;
  total_spent_usd: number;
  dip_threshold_pct: number;
  dip_multiplier: number;
}

interface ExecutionResult {
  strategy_id: string;
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

/** Tracks a strategy that should execute, with optional dip-buy metadata */
interface PendingExecution {
  strategy: DCAStrategy;
  triggerType: "scheduled" | "dip_buy";
  executionAmount: number;
}

/**
 * Map token symbols to their Chainlink price_cache identifiers.
 */
const CHAINLINK_SYMBOL_MAP: Record<string, string> = {
  cbBTC: "base:cbBTC/USD",
  ETH:   "base:ETH/USD",
  WETH:  "base:ETH/USD",
};

/**
 * Filter strategies that are due for execution based on their frequency.
 */
function filterDueStrategies(strategies: DCAStrategy[], now: Date): DCAStrategy[] {
  return strategies.filter((s) => {
    if (!s.last_executed_at) return true;

    const lastExec = new Date(s.last_executed_at);
    const hoursSince = (now.getTime() - lastExec.getTime()) / (1000 * 60 * 60);

    switch (s.frequency) {
      case "hourly":
        return hoursSince >= 1;
      case "daily":
        return hoursSince >= 24;
      case "weekly":
        return hoursSince >= 168;
      case "biweekly":
        return hoursSince >= 336;
      case "monthly":
        return hoursSince >= 720;
      default:
        return hoursSince >= 24;
    }
  });
}

/**
 * Fetch the current price for a token from price_cache via HTTPClient.
 */
async function fetchCurrentPrice(
  tokenSymbol: string,
  config: DCAConfig,
  runtime: cre.Runtime,
): Promise<number | null> {
  const chainlinkSymbol = CHAINLINK_SYMBOL_MAP[tokenSymbol];
  if (!chainlinkSymbol) return null;

  try {
    const priceData = await runtime.runInNodeMode(
      (nodeRuntime: cre.NodeRuntime) => {
        const httpClient = new cre.capabilities.HTTPClient();
        const encodedSymbol = encodeURIComponent(chainlinkSymbol);
        const url = `${config.supabaseUrl}/rest/v1/price_cache?symbol=eq.${encodedSymbol}&select=price&limit=1`;

        const response = httpClient.sendRequest(nodeRuntime, {
          url,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: config.supabaseServiceRoleKey,
            Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
          },
          timeout: 10000,
        }).result();

        if (response.statusCode !== 200) {
          throw new Error(`price_cache query returned ${response.statusCode}`);
        }

        const text = new TextDecoder().decode(response.body);
        const rows = JSON.parse(text) as Array<{ price: number }>;
        return rows.length > 0 ? { price: rows[0].price } : { price: undefined };
      },
      cre.consensusMedianAggregation(),
    )(config);

    return priceData?.price ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch the last completed execution price for a strategy from dca_executions.
 */
async function fetchLastExecutionPrice(
  strategyId: string,
  config: DCAConfig,
  runtime: cre.Runtime,
): Promise<number | null> {
  try {
    const data = await runtime.runInNodeMode(
      (nodeRuntime: cre.NodeRuntime) => {
        const httpClient = new cre.capabilities.HTTPClient();
        const url = `${config.supabaseUrl}/rest/v1/dca_executions?strategy_id=eq.${strategyId}&status=eq.completed&token_price_usd=not.is.null&order=created_at.desc&limit=1&select=token_price_usd`;

        const response = httpClient.sendRequest(nodeRuntime, {
          url,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: config.supabaseServiceRoleKey,
            Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
          },
          timeout: 10000,
        }).result();

        if (response.statusCode !== 200) {
          throw new Error(`dca_executions query returned ${response.statusCode}`);
        }

        const text = new TextDecoder().decode(response.body);
        const rows = JSON.parse(text) as Array<{ token_price_usd: number }>;
        return rows.length > 0 ? { price: rows[0].token_price_usd } : { price: undefined };
      },
      cre.consensusMedianAggregation(),
    )(config);

    return data?.price ?? null;
  } catch {
    return null;
  }
}

export default cre.Handler(
  new cre.capabilities.CronCapability().trigger({
    schedule: "0 */5 * * * *", // every 5 minutes
  }),

  async (config: DCAConfig, runtime: cre.Runtime): Promise<ExecutionResult[]> => {
    runtime.log("[DCA] Starting DCA Trigger Workflow (5-min tick)");

    // ── 1. Fetch active strategies ──
    const strategies = await runtime.runInNodeMode(
      (nodeRuntime: cre.NodeRuntime) => {
        const httpClient = new cre.capabilities.HTTPClient();
        const url = `${config.supabaseUrl}/rest/v1/dca_strategies?is_active=eq.true&select=*`;

        const response = httpClient.sendRequest(nodeRuntime, {
          url,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: config.supabaseServiceRoleKey,
            Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
          },
          timeout: 10000,
        }).result();

        if (response.statusCode !== 200) {
          throw new Error(`Failed to fetch strategies: ${response.statusCode}`);
        }

        const text = new TextDecoder().decode(response.body);
        return JSON.parse(text) as DCAStrategy[];
      },
      cre.consensusMedianAggregation(),
    )(config);

    runtime.log(`[DCA] Found ${strategies.length} active strategies`);

    // ── 2. Regular pass: filter by schedule frequency ──
    const now = new Date();
    const dueStrategies = filterDueStrategies(strategies, now);
    runtime.log(`[DCA] ${dueStrategies.length} strategies due by schedule`);

    // Build pending executions from regular pass
    const pendingExecutions: PendingExecution[] = dueStrategies.map((s) => ({
      strategy: s,
      triggerType: "scheduled" as const,
      executionAmount: s.amount_per_execution,
    }));

    // ── 3. Dip-detection pass ──
    const dipCandidates = strategies.filter(
      (s) =>
        s.dip_threshold_pct > 0 &&
        s.dip_multiplier > 1 &&
        !dueStrategies.some((d) => d.id === s.id),
    );

    if (dipCandidates.length > 0) {
      runtime.log(`[DCA] Checking ${dipCandidates.length} strategies for dip-buy opportunities`);

      for (const candidate of dipCandidates) {
        const currentPrice = await fetchCurrentPrice(candidate.to_token, config, runtime);
        if (!currentPrice || currentPrice <= 0) {
          runtime.log(`[DCA] Dip check skipped for ${candidate.to_token}: no current price`);
          continue;
        }

        const lastPrice = await fetchLastExecutionPrice(candidate.id, config, runtime);
        if (!lastPrice || lastPrice <= 0) {
          runtime.log(`[DCA] Dip check skipped for strategy ${candidate.id}: no previous execution price`);
          continue;
        }

        const pctDrop = ((lastPrice - currentPrice) / lastPrice) * 100;

        if (pctDrop >= candidate.dip_threshold_pct) {
          const dipAmount = candidate.amount_per_execution * candidate.dip_multiplier;
          runtime.log(
            `[DCA] Dip detected for ${candidate.to_token}: -${pctDrop.toFixed(1)}% (threshold: ${candidate.dip_threshold_pct}%), buying ${dipAmount} USDC (${candidate.dip_multiplier}x)`,
          );
          pendingExecutions.push({
            strategy: candidate,
            triggerType: "dip_buy",
            executionAmount: dipAmount,
          });
        } else {
          runtime.log(
            `[DCA] No dip for ${candidate.to_token}: ${pctDrop > 0 ? `-${pctDrop.toFixed(1)}%` : `+${Math.abs(pctDrop).toFixed(1)}%`} (threshold: ${candidate.dip_threshold_pct}%)`,
          );
        }
      }
    }

    runtime.log(`[DCA] ${pendingExecutions.length} total executions to process`);

    if (pendingExecutions.length === 0) {
      return [];
    }

    // ── 4. Execute combined list ──
    const results: ExecutionResult[] = [];

    for (const pending of pendingExecutions) {
      const strategy = pending.strategy;
      let executionAmount = pending.executionAmount;

      try {
        // Fetch price for scheduled strategies (dip-buys already have it)
        let tokenPriceUsd: number | null = null;
        if (pending.triggerType === "scheduled") {
          tokenPriceUsd = await fetchCurrentPrice(strategy.to_token, config, runtime);
          if (tokenPriceUsd && tokenPriceUsd > 0) {
            runtime.log(`[DCA] Price for ${strategy.to_token}: $${tokenPriceUsd}`);

            // Apply dip logic for scheduled strategies that also have dip settings
            if (strategy.dip_threshold_pct > 0 && strategy.dip_multiplier > 1) {
              const lastPrice = await fetchLastExecutionPrice(strategy.id, config, runtime);
              if (lastPrice && lastPrice > 0) {
                const pctDrop = ((lastPrice - tokenPriceUsd) / lastPrice) * 100;
                if (pctDrop >= strategy.dip_threshold_pct) {
                  executionAmount = strategy.amount_per_execution * strategy.dip_multiplier;
                  runtime.log(
                    `[DCA] Dip detected on scheduled run: -${pctDrop.toFixed(1)}%, multiplying to ${executionAmount} USDC`,
                  );
                }
              }
            }
          }
        } else {
          // For dip-buy triggers, fetch the price for the execution record
          tokenPriceUsd = await fetchCurrentPrice(strategy.to_token, config, runtime);
        }

        // Check budget remaining
        if (strategy.total_budget_usd) {
          const remaining = strategy.total_budget_usd - (strategy.total_spent_usd || 0);
          if (remaining <= 0) {
            runtime.log(`[DCA] Strategy ${strategy.id} budget exhausted, skipping`);
            continue;
          }
          executionAmount = Math.min(executionAmount, remaining);
        }

        // Call execute-dca-order edge function
        const execResult = await runtime.runInNodeMode(
          (nodeRuntime: cre.NodeRuntime) => {
            const httpClient = new cre.capabilities.HTTPClient();
            const body = JSON.stringify({
              strategy_id: strategy.id,
              user_id: strategy.user_id,
              from_token: strategy.from_token,
              to_token: strategy.to_token,
              amount_usd: executionAmount,
              trigger_type: pending.triggerType,
              token_price_usd: tokenPriceUsd,
            });

            const response = httpClient.sendRequest(nodeRuntime, {
              url: `${config.supabaseUrl}/functions/v1/execute-dca-order`,
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.cronSecret}`,
              },
              body: new TextEncoder().encode(body),
              timeout: 30000,
            }).result();

            const text = new TextDecoder().decode(response.body);
            const parsed = JSON.parse(text);
            return {
              ok: response.statusCode >= 200 && response.statusCode < 300,
              ...parsed,
            };
          },
          cre.consensusMedianAggregation(),
        )(config);

        results.push({
          strategy_id: strategy.id,
          success: execResult.ok && execResult.success,
          ...execResult,
        });

        runtime.log(
          `[DCA] Strategy ${strategy.id} (${pending.triggerType}): ${execResult.ok ? "OK" : "FAILED"} — ${JSON.stringify(execResult).slice(0, 200)}`,
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        runtime.log(`[DCA] Strategy ${strategy.id} error: ${errorMsg}`);
        results.push({
          strategy_id: strategy.id,
          success: false,
          error: errorMsg,
        });
      }
    }

    runtime.log(
      `[DCA] Completed: ${results.filter((r) => r.success).length}/${results.length} succeeded`,
    );

    return results;
  },
);
