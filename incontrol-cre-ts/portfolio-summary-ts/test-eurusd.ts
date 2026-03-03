/**
 * Simple EUR/USD price fetch test for `cre simulate`.
 *
 * Since `cre simulate` hits live web APIs, this workflow makes a real
 * request to the Supabase price-feed endpoint and returns the price
 * with consensus verification.
 */

import * as cre from "@chainlink/cre-sdk";
import {
  Runner,
  HTTPClient,
  CronCapability,
  consensusMedianAggregation,
} from "@chainlink/cre-sdk";

interface TestConfig {
  supabaseApiUrl: string;
  supabaseAnonKeySecret: string;
}

/** Parse config from raw WASM input */
function parseConfig(c: unknown): TestConfig {
  try {
    if (typeof c === "string") return JSON.parse(c) as TestConfig;
    if (c && typeof c === "object" && (c as any).type === "Buffer" && Array.isArray((c as any).data)) {
      return JSON.parse(String.fromCharCode(...((c as any).data as number[]))) as TestConfig;
    }
    if (Array.isArray(c) && c.every((x) => typeof x === "number")) {
      return JSON.parse(String.fromCharCode(...(c as unknown as number[]))) as TestConfig;
    }
    try {
      if (typeof TextDecoder !== "undefined" && c && (c as any).buffer instanceof ArrayBuffer) {
        return JSON.parse(new TextDecoder().decode(c as unknown as Uint8Array)) as TestConfig;
      }
    } catch { /* fallthrough */ }
    return c as unknown as TestConfig;
  } catch {
    return {} as TestConfig;
  }
}

const initWorkflow = (config: TestConfig) => {
  const trigger = new CronCapability().trigger({
    schedule: "* * * * * *",
  });

  const handler = async (runtime: cre.Runtime) => {
    runtime.log("🧪 TEST: Fetching EUR/USD price via live API");

    const supabaseApiKey = runtime.getSecret({ id: config.supabaseAnonKeySecret || "SUPABASE_ANON_KEY" });

    const price = runtime.runInNodeMode(
      (nodeRuntime: cre.NodeRuntime) => {
        const httpClient = new HTTPClient();
        const url = `${config.supabaseApiUrl}?type=forex&symbols=EUR/USD`;

        const response = httpClient.sendRequest(nodeRuntime, {
          url,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseApiKey,
            Authorization: `Bearer ${supabaseApiKey}`,
          },
          timeout: "10s",
        }).result();

        if (response.statusCode !== 200) {
          runtime.log(`❌ API returned status ${response.statusCode}`);
          return 0;
        }

        const text = new TextDecoder().decode(response.body);
        runtime.log(`📦 Response: ${text}`);

        try {
          const parsed = JSON.parse(text);
          // Handle both { data: [{ price }] } and [{ price }] shapes
          const items = parsed.data ?? parsed;
          if (Array.isArray(items) && items.length > 0) {
            return Number(items[0].price) || 0;
          }
        } catch { /* fallthrough */ }
        return 0;
      },
      consensusMedianAggregation(),
    )(config).result();

    const numericPrice = typeof price === "number" ? price : 0;
    runtime.log(`✅ EUR/USD Price: ${numericPrice}`);
    return numericPrice;
  };

  return [cre.handler(trigger, handler)];
};

export async function main() {
  const runner = await Runner.newRunner<TestConfig>({
    configParser: (c) => parseConfig(c),
  });
  await runner.run(initWorkflow);
}
