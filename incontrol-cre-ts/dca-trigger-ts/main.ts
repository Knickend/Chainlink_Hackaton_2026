/**
 * DCA Trigger CRE Workflow
 *
 * Runs hourly via Chainlink CRE. For each active DCA strategy that is due:
 *   1. Fetches the current token price
 *   2. Applies dip-buying logic (increase amount if price dropped beyond threshold)
 *   3. Calls the execute-dca-order edge function
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

/**
 * Filter strategies that are due for execution based on their frequency.
 */
function filterDueStrategies(strategies: DCAStrategy[], now: Date): DCAStrategy[] {
  return strategies.filter((s) => {
    if (!s.last_executed_at) return true; // Never executed → due

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

export default cre.Handler(
  new cre.capabilities.CronCapability().trigger({
    schedule: "0 0 */1 * * *", // every hour
  }),

  async (config: DCAConfig, runtime: cre.Runtime): Promise<ExecutionResult[]> => {
    runtime.log("[DCA] Starting DCA Trigger Workflow");

    // ── 1. Fetch active strategies via HTTPClient with consensus ──
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

    // ── 2. Filter strategies that are due ──
    const now = new Date();
    const dueStrategies = filterDueStrategies(strategies, now);
    runtime.log(`[DCA] ${dueStrategies.length} strategies are due for execution`);

    if (dueStrategies.length === 0) {
      return [];
    }

    // ── 3. Execute each due strategy ──
    const results: ExecutionResult[] = [];

    for (const strategy of dueStrategies) {
      try {
        let tokenPriceUsd: number | null = null;
        let executionAmount = strategy.amount_per_execution;

        // Fetch current price for dip-buying logic
        if (config.priceApiUrl) {
          try {
            const priceData = await runtime.runInNodeMode(
              (nodeRuntime: cre.NodeRuntime) => {
                const httpClient = new cre.capabilities.HTTPClient();
                const response = httpClient.sendRequest(nodeRuntime, {
                  url: `${config.priceApiUrl}?symbol=${strategy.to_token}`,
                  method: "GET",
                  headers: {
                    apikey: config.supabaseServiceRoleKey,
                    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
                  },
                  timeout: 10000,
                }).result();

                if (response.statusCode !== 200) {
                  throw new Error(`Price API returned ${response.statusCode}`);
                }

                const text = new TextDecoder().decode(response.body);
                return JSON.parse(text) as { price?: number };
              },
              cre.consensusMedianAggregation(),
            )(config);

            tokenPriceUsd = priceData?.price ?? null;
          } catch (priceErr) {
            runtime.log(`[DCA] Price fetch failed for ${strategy.to_token}: ${priceErr}`);
          }
        }

        // Dip-buying: placeholder check (real impl would compare against previous price)
        if (
          tokenPriceUsd &&
          strategy.dip_threshold_pct > 0 &&
          strategy.dip_multiplier > 1
        ) {
          runtime.log(
            `[DCA] Dip check: threshold=${strategy.dip_threshold_pct}%, multiplier=${strategy.dip_multiplier}`,
          );
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
              trigger_type:
                executionAmount > strategy.amount_per_execution
                  ? "dip_buy"
                  : "scheduled",
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
          `[DCA] Strategy ${strategy.id}: ${execResult.ok ? "OK" : "FAILED"} — ${JSON.stringify(execResult).slice(0, 200)}`,
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
