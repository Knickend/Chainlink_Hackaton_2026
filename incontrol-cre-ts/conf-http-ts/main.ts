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
  owner: z.string(),
});

type Config = z.infer<typeof configSchema>;

// The fetch function receives a ConfidentialHTTPSendRequester and config.
// It makes a confidential GET request to the InControl price feed endpoint,
// injecting the API key from Vault DON secrets. The response is AES-GCM
// encrypted inside the enclave (encryptOutput: true), so only the caller
// holding the shared AES key can decrypt it.
const fetchPriceFeed = (
  sendRequester: ConfidentialHTTPSendRequester,
  config: Config
): string => {
  const response = sendRequester
    .sendRequest({
      request: {
        url: config.url,
        method: "GET",
        multiHeaders: {
          "Content-Type": { values: ["application/json"] },
          apikey: { values: ["{{.apiKey}}"] },
          Authorization: { values: ["Bearer {{.apiKey}}"] },
        },
      },
      vaultDonSecrets: [
        { key: "apiKey", owner: config.owner },
        { key: "san_marino_aes_gcm_encryption_key" },
      ],
      encryptOutput: true,
    })
    .result();

  if (!ok(response)) {
    throw new Error(
      `Confidential HTTP request failed with status: ${response.statusCode}`
    );
  }

  // Return the raw (encrypted) response body as a base64 string.
  // Because encryptOutput is true, the body is: nonce || ciphertext || tag
  // encoded as base64 by the enclave.
  return text(response);
};

// Main workflow handler
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const confHTTPClient = new ConfidentialHTTPClient();

  // consensusIdenticalAggregation ensures all nodes agree on the same
  // encrypted output (deterministic since the enclave produces it once).
  const encryptedBody = confHTTPClient
    .sendRequest(
      runtime,
      fetchPriceFeed,
      consensusIdenticalAggregation<string>()
    )(runtime.config)
    .result();

  runtime.log(
    `[ConfHTTP] Encrypted price feed received (${encryptedBody.length} chars)`
  );
  return encryptedBody;
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
