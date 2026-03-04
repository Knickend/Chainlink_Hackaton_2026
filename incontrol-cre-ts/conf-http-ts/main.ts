import {
  CronCapability,
  ConfidentialHTTPClient,
  handler,
  consensusIdenticalAggregation,
  ok,
  text,
  type ConfidentialHTTPSendRequester,
  type Runtime,
  Runner,
} from "@chainlink/cre-sdk";
import { z } from "zod";

// Config schema
const configSchema = z.object({
  schedule: z.string(),
  url: z.string(),
});

type Config = z.infer<typeof configSchema>;

// The fetch function receives a ConfidentialHTTPSendRequester, the config URL,
// and the API key (resolved via runtime.getSecret in the handler).
//
// In deployed DON execution, ConfidentialHTTPClient keeps request details
// (headers, body, URL) private per node — ideal for requests containing
// API keys or sensitive payloads. In local simulation via `cre simulate`,
// it behaves identically to HTTPClient.
//
// Production note: For deployed DON execution, this would use vaultDonSecrets
// with encryptOutput: true for AES-GCM encrypted responses inside the enclave.
const fetchPriceFeed = (
  sendRequester: ConfidentialHTTPSendRequester,
  url: string,
  apiKey: string
): string => {
  const response = sendRequester
    .sendRequest({
      url,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    })
    .result();

  if (!ok(response)) {
    throw new Error(
      `Confidential HTTP request failed with status: ${response.statusCode}`
    );
  }

  return text(response);
};

// Main workflow handler
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const confHTTPClient = new ConfidentialHTTPClient();

  // Retrieve the API key via runtime.getSecret (resolved from secrets.yaml → .env)
  const apiKey = runtime.getSecret({ id: "SUPABASE_ANON_KEY" });

  // consensusIdenticalAggregation ensures all nodes agree on the same output
  const responseBody = confHTTPClient
    .sendRequest(
      runtime,
      fetchPriceFeed,
      consensusIdenticalAggregation<string>()
    )(runtime.config.url, apiKey)
    .result();

  runtime.log(
    `[ConfHTTP] Price feed received (${responseBody.length} chars)`
  );
  return responseBody;
};

// Initialize workflow
const initWorkflow = (config: Config) => {
  return [
    handler(
      new CronCapability().trigger({
        schedule: config.schedule,
      }),
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}
