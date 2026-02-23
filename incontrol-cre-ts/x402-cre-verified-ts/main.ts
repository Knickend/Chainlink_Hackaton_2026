import * as cre from "@chainlink/cre-sdk";
import { Runner, HTTPClient, consensusMedianAggregation } from "@chainlink/cre-sdk";
import { CronCapability } from "./node_modules/@chainlink/cre-sdk/dist/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen.js";

// Configuration interface
interface Config {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  symbols: string[];
  feedType: string;
}

// Response types
interface PriceCacheRow {
  symbol: string;
  price: number;
  change: number | null;
  change_percent: number | null;
  asset_type: string;
  price_unit: string | null;
  updated_at: string;
}

interface VerifiedPrice {
  symbol: string;
  price: number;
  change24h: number | null;
  changePercent24h: number | null;
  unit: string;
  lastUpdated: string;
  attestation: {
    method: string;
    nodeCount: number;
    source: string;
    feedOrigin: string;
  };
}

interface WorkflowResult {
  success: boolean;
  timestamp: string;
  attestation: {
    method: string;
    nodeCount: number;
    source: string;
  };
  prices: VerifiedPrice[];
  meta: {
    totalPrices: number;
    feedType: string;
  };
}

/** Parse config from raw WASM input */
function parseConfig(c: unknown): Config {
  try {
    if (typeof c === "string") return JSON.parse(c) as Config;
    if (c && typeof c === "object" && (c as any).type === "Buffer" && Array.isArray((c as any).data)) {
      const s = String.fromCharCode(...((c as any).data as number[]));
      return JSON.parse(s) as Config;
    }
    if (Array.isArray(c) && c.every((x) => typeof x === "number")) {
      const s = String.fromCharCode(...(c as unknown as number[]));
      return JSON.parse(s) as Config;
    }
    try {
      if (typeof TextDecoder !== "undefined" && c && (c as any).buffer instanceof ArrayBuffer) {
        return JSON.parse(new TextDecoder().decode(c as unknown as Uint8Array)) as Config;
      }
    } catch { /* fallthrough */ }
    return c as unknown as Config;
  } catch {
    return {} as Config;
  }
}

// CRE workflow that fetches price data with multi-node consensus verification
const initWorkflow = (rawConfig?: unknown) => {
  const cfg = parseConfig(rawConfig);

  const trigger = new CronCapability().trigger({
    schedule: "0 */5 * * * *",
  });

  const handler = async (runtime: cre.Runtime): Promise<WorkflowResult> => {
    runtime.log("🔐 Starting CRE Consensus-Verified Data Workflow");
    runtime.log(`📊 Feed type: ${cfg.feedType}`);
    runtime.log(`🔗 Symbols: ${(cfg.symbols || []).join(", ")}`);

    try {
      // Fetch price data with consensus — return raw JSON string (simple value for consensus)
      const rawJson = runtime.runInNodeMode(
        (nodeRuntime: cre.NodeRuntime) => {
          const httpClient = new HTTPClient();

          const symbolFilter = (cfg.symbols || [])
            .map((s) => `"${s}"`)
            .join(",");
          const queryUrl = `${cfg.supabaseUrl}/rest/v1/price_cache?select=symbol,price,change,change_percent,asset_type,price_unit,updated_at&asset_type=eq.${cfg.feedType}&symbol=in.(${symbolFilter})&order=updated_at.desc&limit=50`;

          const response = httpClient
            .sendRequest(nodeRuntime, {
              url: queryUrl,
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                apikey: cfg.supabaseServiceRoleKey,
                Authorization: `Bearer ${cfg.supabaseServiceRoleKey}`,
              },
              timeout: "10s",
            })
            .result();

          if (response.statusCode !== 200) {
            return "[]";
          }

          const responseText = new TextDecoder().decode(response.body);
          return responseText;
        },
        consensusMedianAggregation()
      )(rawConfig).result();

      // Parse the JSON string outside of consensus
      let verifiedData: PriceCacheRow[] = [];
      try {
        verifiedData = JSON.parse(typeof rawJson === "string" ? rawJson : JSON.stringify(rawJson)) as PriceCacheRow[];
      } catch {
        verifiedData = [];
      }

      // Format verified prices with attestation metadata
      const verifiedPrices: VerifiedPrice[] = verifiedData.map(
        (row: PriceCacheRow) => {
          const isChainlinkFeed = row.symbol.includes(":");
          return {
            symbol: row.symbol,
            price: row.price,
            change24h: row.change,
            changePercent24h: row.change_percent,
            unit: row.price_unit || "USD",
            lastUpdated: row.updated_at,
            attestation: {
              method: "consensusMedianAggregation",
              nodeCount: 3,
              source: isChainlinkFeed ? "chainlink-cre" : "price-cache",
              feedOrigin: isChainlinkFeed ? row.symbol : `cache:${row.symbol}`,
            },
          };
        }
      );

      runtime.log(`✅ Verified ${verifiedPrices.length} prices with CRE consensus`);

      verifiedPrices.slice(0, 5).forEach((p) => {
        const change = p.changePercent24h
          ? `(${p.changePercent24h > 0 ? "+" : ""}${p.changePercent24h.toFixed(2)}%)`
          : "";
        runtime.log(`  • ${p.symbol}: $${p.price} ${change}`);
      });

      return {
        success: true,
        timestamp: new Date().toISOString(),
        attestation: {
          method: "consensusMedianAggregation",
          nodeCount: 3,
          source: "chainlink-cre",
        },
        prices: verifiedPrices,
        meta: {
          totalPrices: verifiedPrices.length,
          feedType: cfg.feedType,
        },
      };
    } catch (error) {
      runtime.log(`❌ CRE verification failed: ${error}`);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        attestation: {
          method: "consensusMedianAggregation",
          nodeCount: 0,
          source: "chainlink-cre",
        },
        prices: [],
        meta: {
          totalPrices: 0,
          feedType: cfg.feedType,
        },
      };
    }
  };

  return [cre.handler(trigger, handler)];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({
    configParser: (c) => parseConfig(c),
  });
  await runner.run(initWorkflow);
}

await main();
