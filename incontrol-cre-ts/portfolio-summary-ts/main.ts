import * as cre from "@chainlink/cre-sdk";
import { Runner, HTTPClient, consensusMedianAggregation } from "@chainlink/cre-sdk";
import { CronCapability } from "./node_modules/@chainlink/cre-sdk/dist/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen.js";

// Asset type definitions
type AssetType = "crypto" | "stock" | "commodity" | "etf" | "bond" | "forex";
type Priority = "high" | "medium" | "low";

// Configuration interfaces
interface WorkflowConfig {
  name: string;
  type: AssetType;
  symbols: string[];
  schedule: string;
  enabled: boolean;
  priority: Priority;
  marketHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

interface Config {
  supabaseApiUrl: string;
  supabaseApiKey: string;
  workflows: WorkflowConfig[];
  general: {
    maxRetries: number;
    timeout: number;
    consensusNodes: number;
  };
}

// Price data response types
interface PriceData {
  symbol: string;
  price: number;
  change24h?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  timestamp: number;
  type: AssetType;
}

interface WorkflowResult {
  success: boolean;
  timestamp: number;
  assetType: AssetType;
  workflowName: string;
  priceCount: number;
  stats: {
    totalAssets: number;
    successfulFetches: number;
    failedFetches: number;
  };
  errors?: string[];
}

// Helper function to check market hours
function isWithinMarketHours(
  marketHours?: WorkflowConfig["marketHours"]
): boolean {
  if (!marketHours) return true; // 24/7 markets (crypto, forex)

  const now = new Date();
  const currentHour = now.getHours();
  const [startHour] = marketHours.start.split(':').map(Number);
  const [endHour] = marketHours.end.split(':').map(Number);

  return currentHour >= startHour && currentHour < endHour;
}

// Helper function to chunk arrays for batch processing
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
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

const initWorkflow = (rawConfig?: unknown) => {
  const config = parseConfig(rawConfig);

  const trigger = new CronCapability().trigger({
    schedule: "0 */5 * * * *",
  });

  const handler = async (runtime: cre.Runtime) => {
    runtime.log("[Portfolio] Starting Multi-Asset Price Feed Workflow");
    runtime.log(`[Portfolio] Total workflows configured: ${config.workflows?.length ?? 0}`);

    const allResults: WorkflowResult[] = [];

    if (!config.workflows || config.workflows.length === 0) {
      runtime.log("[Portfolio] No workflows configured");
      return allResults;
    }

    // Process each asset type workflow
    for (const workflow of config.workflows) {
      if (!workflow.enabled) {
        runtime.log(`[Portfolio] Skipping disabled workflow: ${workflow.name}`);
        continue;
      }

      // Check market hours for stocks/ETFs
      if (!isWithinMarketHours(workflow.marketHours)) {
        runtime.log(`[Portfolio] ${workflow.name}: Outside market hours, skipping`);
        continue;
      }

      runtime.log(`[Portfolio] Processing: ${workflow.name.toUpperCase()} (${workflow.type}, ${workflow.symbols.length} symbols)`);

      try {
        // Process symbols in chunks to avoid API limits
        const symbolChunks = chunkArray(workflow.symbols, 10);
        let successfulFetches = 0;
        const errors: string[] = [];

        for (let i = 0; i < symbolChunks.length; i++) {
          const chunk = symbolChunks[i];
          runtime.log(`[Portfolio] Processing chunk ${i + 1}/${symbolChunks.length}: ${chunk.join(', ')}`);

          try {
            // Fetch with consensus across oracle nodes
            // Return raw JSON string (simple value for consensus)
            const chunkRaw = runtime.runInNodeMode(
              (nodeRuntime: cre.NodeRuntime) => {
                const httpClient = new HTTPClient();

                // Build query parameters
                const queryParams = new URLSearchParams({
                  type: workflow.type,
                  symbols: chunk.join(','),
                });

                const fullUrl = `${config.supabaseApiUrl}?${queryParams}`;

                // Make authenticated request
                const response = httpClient.sendRequest(nodeRuntime, {
                  url: fullUrl,
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    apikey: config.supabaseApiKey,
                    Authorization: `Bearer ${config.supabaseApiKey}`,
                  },
                  timeout: "10s",
                }).result();

                if (response.statusCode !== 200) {
                  return "0";
                }

                const responseText = new TextDecoder().decode(response.body);
                // Return count of prices as simple number for consensus
                try {
                  const parsed = JSON.parse(responseText);
                  if (parsed && parsed.data && Array.isArray(parsed.data)) {
                    return parsed.data.length;
                  }
                } catch { /* fallthrough */ }
                return 0;
              },
              consensusMedianAggregation(),
            )(rawConfig).result();

            const count = typeof chunkRaw === "number" ? chunkRaw : (typeof chunkRaw === "string" ? parseInt(chunkRaw, 10) || 0 : 0);
            successfulFetches += count;

            runtime.log(`[Portfolio] Chunk ${i + 1} successful: ${count} prices fetched`);
          } catch (error) {
            const errorMsg = `Chunk ${i + 1} failed: ${error}`;
            runtime.log(`[Portfolio] ${errorMsg}`);
            errors.push(errorMsg);
          }
        }

        // Calculate statistics
        const failedFetches = workflow.symbols.length - successfulFetches;

        runtime.log(`[Portfolio] ${workflow.name} Summary: ${successfulFetches}/${workflow.symbols.length} successful, ${failedFetches} failed`);

        // Create result object
        const result: WorkflowResult = {
          success: successfulFetches > 0,
          timestamp: Date.now(),
          assetType: workflow.type,
          workflowName: workflow.name,
          priceCount: successfulFetches,
          stats: {
            totalAssets: workflow.symbols.length,
            successfulFetches,
            failedFetches,
          },
          errors: errors.length > 0 ? errors : undefined,
        };

        allResults.push(result);
      } catch (error) {
        runtime.log(`[Portfolio] Workflow ${workflow.name} failed: ${error}`);

        allResults.push({
          success: false,
          timestamp: Date.now(),
          assetType: workflow.type,
          workflowName: workflow.name,
          priceCount: 0,
          stats: {
            totalAssets: workflow.symbols.length,
            successfulFetches: 0,
            failedFetches: workflow.symbols.length,
          },
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }

    // Final summary
    const totalSuccess = allResults.filter((r) => r.success).length;
    runtime.log(`[Portfolio] COMPLETE: ${totalSuccess}/${allResults.length} workflows succeeded`);

    return allResults;
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
