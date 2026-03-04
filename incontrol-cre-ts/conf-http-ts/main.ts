import * as cre from "@chainlink/cre-sdk";
import {
  CronCapability,
  HTTPClient,
  consensusIdenticalAggregation,
  Runner,
} from "@chainlink/cre-sdk";
import { z } from "zod";

// Config schema
const configSchema = z.object({
  schedule: z.string(),
  url: z.string(),
});

type Config = z.infer<typeof configSchema>;

// Main workflow handler
// Uses HTTPClient inside runInNodeMode with consensusIdenticalAggregation.
// In deployed DON execution, secrets passed via runtime.getSecret() are
// kept confidential per node. The request itself runs through consensus.
const initWorkflow = (config: Config) => {
  const trigger = new CronCapability().trigger({
    schedule: config.schedule,
  });

  const handler = async (runtime: cre.Runtime): Promise<string> => {
    runtime.log("[ConfHTTP] Starting confidential price feed fetch");
    runtime.log(`[ConfHTTP] URL: ${config.url}`);

    // Retrieve the API key via runtime.getSecret (resolved from secrets.yaml → .env)
    const apiKey = runtime.getSecret({ id: "SUPABASE_ANON_KEY" }).result().value;

    // Fetch with consensus — all nodes must agree on the same response
    const responseBody = runtime.runInNodeMode(
      (nodeRuntime: cre.NodeRuntime) => {
        const httpClient = new HTTPClient();

        const response = httpClient
          .sendRequest(nodeRuntime, {
            url: config.url,
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              apikey: apiKey,
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: "15s",
          })
          .result();

        if (response.statusCode !== 200) {
          return `{"error":"HTTP ${response.statusCode}"}`;
        }

        return new TextDecoder().decode(response.body);
      },
      consensusIdenticalAggregation<string>(),
    )(config).result();

    runtime.log(
      `[ConfHTTP] Price feed received (${responseBody.length} chars)`,
    );
    return responseBody;
  };

  return [cre.handler(trigger, handler)];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}
