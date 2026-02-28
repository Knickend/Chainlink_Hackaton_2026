/**
 * Privacy Vault CRE Workflow
 *
 * HTTP-triggered workflow that orchestrates privacy operations via the
 * Chainlink ACE Privacy Vault API (Convergence 2026). Uses
 * consensusIdenticalAggregation to ensure multi-node agreement on API
 * responses before returning results.
 *
 * Actions: generate-shielded-address, private-transfer, balances,
 *          transactions, withdraw
 */

import {
  HTTPCapability,
  HTTPClient,
  handler,
  consensusIdenticalAggregation,
  type Runtime,
  type HTTPPayload,
  Runner,
} from "@chainlink/cre-sdk";

type PrivacyVaultConfig = {
  authorizedEVMAddress: string;
  privacyVaultApiUrl: string;
  supabaseCallbackUrl: string;
};

interface PrivacyAction {
  action: string;
  params: Record<string, unknown>;
  signature: string;
  account: string;
}

/**
 * Decode the HTTP trigger payload into a PrivacyAction.
 */
function decodePayload(payload: HTTPPayload): PrivacyAction {
  const bodyBytes = payload.body;
  const bodyStr =
    typeof bodyBytes === "string"
      ? bodyBytes
      : new TextDecoder().decode(bodyBytes);
  return JSON.parse(bodyStr) as PrivacyAction;
}

/**
 * Map action names to Privacy Vault API endpoints.
 */
function getEndpoint(action: string): { method: string; path: string } {
  switch (action) {
    case "generate-shielded-address":
      return { method: "POST", path: "/api/shielded-address/generate" };
    case "private-transfer":
      return { method: "POST", path: "/api/transfer" };
    case "balances":
      return { method: "GET", path: "/api/balances" };
    case "transactions":
      return { method: "GET", path: "/api/transactions" };
    case "withdraw":
      return { method: "POST", path: "/api/withdraw" };
    default:
      throw new Error(`Unknown privacy vault action: ${action}`);
  }
}

const initWorkflow = (config: PrivacyVaultConfig) => {
  const trigger = new HTTPCapability().trigger({
    authorizedKeys: [
      {
        keyType: "KEY_TYPE_ECDSA_EVM",
        key: config.authorizedEVMAddress,
      },
    ],
  });

  const onHttpTrigger = (runtime: Runtime<PrivacyVaultConfig>): string => {
    // The HTTP trigger provides the payload via runtime
    // Decode the incoming request
    const httpClient = new HTTPClient();

    // Use consensusIdenticalAggregation: all CRE nodes must agree on the
    // exact same response from the Privacy Vault API.
    const result = runtime.runInNodeMode(
      (nodeRuntime) => {
        // Access the trigger payload from the runtime context
        const rawBody = (runtime as any).triggerEvent?.body;
        if (!rawBody) {
          return JSON.stringify({ error: "No trigger payload received" });
        }

        const bodyStr =
          typeof rawBody === "string"
            ? rawBody
            : new TextDecoder().decode(rawBody);
        const request = JSON.parse(bodyStr) as PrivacyAction;

        const endpoint = getEndpoint(request.action);
        const apiUrl = `${config.privacyVaultApiUrl}${endpoint.path}`;

        // Build request headers with EIP-712 signature
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Account": request.account,
          "X-Signature": request.signature,
        };

        // For GET requests, append account as query param
        let finalUrl = apiUrl;
        if (endpoint.method === "GET") {
          const separator = apiUrl.includes("?") ? "&" : "?";
          finalUrl = `${apiUrl}${separator}account=${request.account}`;
        }

        // Build the request body for POST actions
        let bodyBytes: Uint8Array | undefined;
        if (endpoint.method === "POST" && request.params) {
          const bodyJson = JSON.stringify({
            ...request.params,
            account: request.account,
            signature: request.signature,
          });
          bodyBytes = new TextEncoder().encode(bodyJson);
        }

        const response = httpClient.sendRequest(nodeRuntime, {
          url: finalUrl,
          method: endpoint.method,
          headers,
          body: bodyBytes,
          timeout: "30s",
        }).result();

        if (response.statusCode < 200 || response.statusCode >= 300) {
          const errText = new TextDecoder().decode(response.body);
          return JSON.stringify({
            error: `Privacy Vault API error ${response.statusCode}`,
            details: errText,
          });
        }

        return new TextDecoder().decode(response.body);
      },
      consensusIdenticalAggregation<string>(),
    )(config).result();

    runtime.log(
      `[PrivacyVault] Consensus result received (${result.length} chars)`
    );

    return result;
  };

  return [handler(trigger, onHttpTrigger)];
};

export async function main() {
  const runner = await Runner.newRunner<PrivacyVaultConfig>({
    configParser: (c) => {
      if (typeof c === "string") return JSON.parse(c);
      return c as unknown as PrivacyVaultConfig;
    },
  });
  await runner.run(initWorkflow);
}
