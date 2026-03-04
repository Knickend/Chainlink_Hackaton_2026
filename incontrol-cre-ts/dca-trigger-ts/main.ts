/**
 * DCA Trigger CRE Workflow
 *
 * Runs every 5 minutes via Chainlink CRE. On each tick:
 *   1. Fetches active strategies + all prices + last execution prices in 3 batch calls
 *   2. Regular pass: executes strategies whose schedule frequency is due
 *   3. Dip-detection pass: for strategies with dip_threshold_pct > 0 that
 *      are NOT already in the regular batch, compares current price against
 *      last execution price. If price dropped >= threshold, triggers a dip-buy.
 *   4. Executes up to 2 pending orders per tick
 *
 * HTTP call budget (CRE limit = 5):
 *   Call 1: Fetch active strategies
 *   Call 2: Batch fetch current prices for all relevant tokens
 *   Call 3: Batch fetch last execution prices for all strategies
 *   Call 4-5: Execute up to 2 DCA orders
 */

import * as cre from "@chainlink/cre-sdk";
import {
  Runner,
  HTTPClient,
  CronCapability,
  consensusMedianAggregation,
  consensusIdenticalAggregation,
} from "@chainlink/cre-sdk";

type DCAConfig = {
  supabaseUrl: string;
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
  error: string;
  trigger_type: string;
  amount_usd: number;
}

/** Tracks a strategy that should execute, with optional dip-buy metadata */
interface PendingExecution {
  strategy: DCAStrategy;
  triggerType: "scheduled" | "dip_buy";
  executionAmount: number;
  tokenPriceUsd: number;
}

/**
 * Map token symbols to their Chainlink price_cache identifiers.
 */
const CHAINLINK_SYMBOL_MAP: Record<string, string> = {
  cbBTC: "base:cbBTC/USD",
  ETH:   "base:ETH/USD",
  WETH:  "base:ETH/USD",
};

const MAX_EXECUTIONS_PER_TICK = 2;

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

/** Parse config from raw WASM input */
function parseConfig(c: unknown): DCAConfig {
  try {
    if (typeof c === "string") return JSON.parse(c) as DCAConfig;
    if (c && typeof c === "object" && (c as any).type === "Buffer" && Array.isArray((c as any).data)) {
      const s = String.fromCharCode(...((c as any).data as number[]));
      return JSON.parse(s) as DCAConfig;
    }
    if (Array.isArray(c) && c.every((x) => typeof x === "number")) {
      const s = String.fromCharCode(...(c as unknown as number[]));
      return JSON.parse(s) as DCAConfig;
    }
    try {
      if (typeof TextDecoder !== "undefined" && c && (c as any).buffer instanceof ArrayBuffer) {
        return JSON.parse(new TextDecoder().decode(c as unknown as Uint8Array)) as DCAConfig;
      }
    } catch { /* fallthrough */ }
    return c as unknown as DCAConfig;
  } catch {
    return {} as DCAConfig;
  }
}

const initWorkflow = (config: DCAConfig) => {
  const cfg = config;

  const trigger = new CronCapability().trigger({
    schedule: "0 */5 * * * *",
  });

  const handler = async (runtime: cre.Runtime): Promise<ExecutionResult[]> => {
    runtime.log("[DCA] Starting DCA Trigger Workflow (5-min tick)");

    // Retrieve secrets from CRE secrets management
    const supabaseKey = runtime.getSecret({ id: "SUPABASE_SERVICE_ROLE_KEY" }).result().value;
    const cronSecret = runtime.getSecret({ id: "CRON_SECRET" }).result().value;

    // ── CALL 1/5: Fetch active strategies ──
    let strategies: DCAStrategy[] = [];
    try {
      const raw = runtime.runInNodeMode(
        (nodeRuntime: cre.NodeRuntime) => {
          const httpClient = new HTTPClient();
          const url = `${cfg.supabaseUrl}/rest/v1/dca_strategies?is_active=eq.true&select=*`;

          const response = httpClient.sendRequest(nodeRuntime, {
            url,
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            timeout: "10s",
          }).result();

          if (response.statusCode !== 200) return "[]";
          return new TextDecoder().decode(response.body);
        },
        consensusIdenticalAggregation<string>(),
      )(config).result();

      strategies = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as DCAStrategy[];
    } catch {
      strategies = [];
    }

    runtime.log(`[DCA] Found ${strategies.length} active strategies`);

    if (strategies.length === 0) {
      return [];
    }

    // ── CALL 2/5: Batch fetch current prices for ALL unique tokens ──
    const uniqueChainlinkSymbols: string[] = [];
    const tokenToChainlink = new Map<string, string>();
    for (const s of strategies) {
      const cl = CHAINLINK_SYMBOL_MAP[s.to_token];
      if (cl && !tokenToChainlink.has(s.to_token)) {
        tokenToChainlink.set(s.to_token, cl);
        uniqueChainlinkSymbols.push(cl);
      }
    }

    const priceMap = new Map<string, number>(); // chainlink_symbol -> price
    if (uniqueChainlinkSymbols.length > 0) {
      try {
        const priceJson = runtime.runInNodeMode(
          (nodeRuntime: cre.NodeRuntime) => {
            const httpClient = new HTTPClient();
            const symbolFilter = uniqueChainlinkSymbols.map((s) => `"${s}"`).join(",");
            const url = `${cfg.supabaseUrl}/rest/v1/price_cache?symbol=in.(${symbolFilter})&select=symbol,price&limit=50`;

            const response = httpClient.sendRequest(nodeRuntime, {
              url,
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
              timeout: "10s",
            }).result();

            if (response.statusCode !== 200) return "[]";
            return new TextDecoder().decode(response.body);
          },
          consensusIdenticalAggregation<string>(),
        )(config).result();

        const rows = JSON.parse(typeof priceJson === "string" ? priceJson : "[]") as Array<{ symbol: string; price: number }>;
        for (const row of rows) {
          priceMap.set(row.symbol, row.price);
        }
        runtime.log(`[DCA] Batch fetched ${rows.length} prices`);
      } catch {
        runtime.log("[DCA] Failed to batch fetch prices");
      }
    }

    /** Get current price for a token from the batched cache */
    const getCurrentPrice = (tokenSymbol: string): number => {
      const cl = CHAINLINK_SYMBOL_MAP[tokenSymbol];
      return cl ? (priceMap.get(cl) ?? 0) : 0;
    };

    // ── CALL 3/5: Batch fetch last execution prices for ALL strategies ──
    const lastExecPriceMap = new Map<string, number>(); // strategy_id -> last token_price_usd
    const strategyIdFilter = strategies.map((s) => `"${s.id}"`).join(",");

    try {
      const execJson = runtime.runInNodeMode(
        (nodeRuntime: cre.NodeRuntime) => {
          const httpClient = new HTTPClient();
          const url = `${cfg.supabaseUrl}/rest/v1/dca_executions?strategy_id=in.(${strategyIdFilter})&status=eq.completed&token_price_usd=not.is.null&order=created_at.desc&select=strategy_id,token_price_usd&limit=50`;

          const response = httpClient.sendRequest(nodeRuntime, {
            url,
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            timeout: "10s",
          }).result();

          if (response.statusCode !== 200) return "[]";
          return new TextDecoder().decode(response.body);
        },
        consensusIdenticalAggregation<string>(),
      )(config).result();

      const rows = JSON.parse(typeof execJson === "string" ? execJson : "[]") as Array<{ strategy_id: string; token_price_usd: number }>;
      // Ordered desc by created_at — take only first (latest) per strategy_id
      for (const row of rows) {
        if (!lastExecPriceMap.has(row.strategy_id)) {
          lastExecPriceMap.set(row.strategy_id, row.token_price_usd);
        }
      }
      runtime.log(`[DCA] Batch fetched last execution prices for ${lastExecPriceMap.size} strategies`);
    } catch {
      runtime.log("[DCA] Failed to batch fetch last execution prices");
    }

    // ── Build pending executions using cached data (no more HTTP calls) ──
    const now = new Date();
    const dueStrategies = filterDueStrategies(strategies, now);
    runtime.log(`[DCA] ${dueStrategies.length} strategies due by schedule`);

    const pendingExecutions: PendingExecution[] = [];

    // Regular scheduled executions
    for (const s of dueStrategies) {
      const price = getCurrentPrice(s.to_token);
      let executionAmount = s.amount_per_execution;

      if (price > 0) {
        runtime.log(`[DCA] Price for ${s.to_token}: $${price}`);

        // Check for dip on scheduled strategies
        if (s.dip_threshold_pct > 0 && s.dip_multiplier > 1) {
          const lastPrice = lastExecPriceMap.get(s.id);
          if (lastPrice && lastPrice > 0) {
            const pctDrop = ((lastPrice - price) / lastPrice) * 100;
            if (pctDrop >= s.dip_threshold_pct) {
              executionAmount = s.amount_per_execution * s.dip_multiplier;
              runtime.log(
                `[DCA] Dip on scheduled: -${pctDrop.toFixed(1)}%, multiplying to ${executionAmount} USDC`,
              );
            }
          }
        }
      }

      // Check budget remaining
      if (s.total_budget_usd) {
        const remaining = s.total_budget_usd - (s.total_spent_usd || 0);
        if (remaining <= 0) {
          runtime.log(`[DCA] Strategy ${s.id} budget exhausted, skipping`);
          continue;
        }
        executionAmount = Math.min(executionAmount, remaining);
      }

      pendingExecutions.push({
        strategy: s,
        triggerType: "scheduled",
        executionAmount,
        tokenPriceUsd: price,
      });
    }

    // Dip-detection pass for non-scheduled strategies
    const dipCandidates = strategies.filter(
      (s) =>
        s.dip_threshold_pct > 0 &&
        s.dip_multiplier > 1 &&
        !dueStrategies.some((d) => d.id === s.id),
    );

    for (const candidate of dipCandidates) {
      const currentPrice = getCurrentPrice(candidate.to_token);
      if (currentPrice <= 0) {
        runtime.log(`[DCA] Dip check skipped for ${candidate.to_token}: no current price`);
        continue;
      }

      const lastPrice = lastExecPriceMap.get(candidate.id);
      if (!lastPrice || lastPrice <= 0) {
        runtime.log(`[DCA] Dip check skipped for strategy ${candidate.id}: no previous execution`);
        continue;
      }

      const pctDrop = ((lastPrice - currentPrice) / lastPrice) * 100;

      if (pctDrop >= candidate.dip_threshold_pct) {
        let dipAmount = candidate.amount_per_execution * candidate.dip_multiplier;

        if (candidate.total_budget_usd) {
          const remaining = candidate.total_budget_usd - (candidate.total_spent_usd || 0);
          if (remaining <= 0) {
            runtime.log(`[DCA] Strategy ${candidate.id} budget exhausted, skipping dip-buy`);
            continue;
          }
          dipAmount = Math.min(dipAmount, remaining);
        }

        runtime.log(
          `[DCA] Dip detected for ${candidate.to_token}: -${pctDrop.toFixed(1)}% (threshold: ${candidate.dip_threshold_pct}%), buying ${dipAmount} USDC (${candidate.dip_multiplier}x)`,
        );
        pendingExecutions.push({
          strategy: candidate,
          triggerType: "dip_buy",
          executionAmount: dipAmount,
          tokenPriceUsd: currentPrice,
        });
      } else {
        runtime.log(
          `[DCA] No dip for ${candidate.to_token}: ${pctDrop > 0 ? `-${pctDrop.toFixed(1)}%` : `+${Math.abs(pctDrop).toFixed(1)}%`} (threshold: ${candidate.dip_threshold_pct}%)`,
        );
      }
    }

    runtime.log(`[DCA] ${pendingExecutions.length} total executions to process`);

    if (pendingExecutions.length === 0) {
      return [];
    }

    // ── CALLS 4-5: Execute up to MAX_EXECUTIONS_PER_TICK orders ──
    // Scheduled executions take priority over dip-buys
    const toExecute = pendingExecutions.slice(0, MAX_EXECUTIONS_PER_TICK);
    if (pendingExecutions.length > MAX_EXECUTIONS_PER_TICK) {
      runtime.log(
        `[DCA] Throttled: executing ${MAX_EXECUTIONS_PER_TICK} of ${pendingExecutions.length} (HTTP call limit)`,
      );
    }

    const results: ExecutionResult[] = [];

    for (const pending of toExecute) {
      const strategy = pending.strategy;

      try {
        const execResultRaw = runtime.runInNodeMode(
          (nodeRuntime: cre.NodeRuntime) => {
            const httpClient = new HTTPClient();
            const body = JSON.stringify({
              strategy_id: strategy.id,
              user_id: strategy.user_id,
              from_token: strategy.from_token,
              to_token: strategy.to_token,
              amount_usd: pending.executionAmount,
              trigger_type: pending.triggerType,
              token_price_usd: pending.tokenPriceUsd > 0 ? pending.tokenPriceUsd : 0,
            });

            const response = httpClient.sendRequest(nodeRuntime, {
              url: `${cfg.supabaseUrl}/functions/v1/execute-dca-order`,
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cronSecret}`,
              },
              body: new TextEncoder().encode(body),
              timeout: "30s",
            }).result();

            return response.statusCode >= 200 && response.statusCode < 300 ? 1 : 0;
          },
          consensusMedianAggregation(),
        )(config).result();

        const execOk = (typeof execResultRaw === "number") ? execResultRaw > 0 : false;

        results.push({
          strategy_id: strategy.id,
          success: execOk,
          error: "",
          trigger_type: pending.triggerType,
          amount_usd: pending.executionAmount,
        });

        runtime.log(
          `[DCA] Strategy ${strategy.id} (${pending.triggerType}): ${execOk ? "OK" : "FAILED"}`,
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        runtime.log(`[DCA] Strategy ${strategy.id} error: ${errorMsg}`);
        results.push({
          strategy_id: strategy.id,
          success: false,
          error: errorMsg,
          trigger_type: pending.triggerType,
          amount_usd: pending.executionAmount,
        });
      }
    }

    runtime.log(
      `[DCA] Completed: ${results.filter((r) => r.success).length}/${results.length} succeeded`,
    );

    return results;
  };

  return [cre.handler(trigger, handler)];
};

export async function main() {
  const runner = await Runner.newRunner<DCAConfig>({
    configParser: (c) => parseConfig(c),
  });
  await runner.run(initWorkflow);
}
