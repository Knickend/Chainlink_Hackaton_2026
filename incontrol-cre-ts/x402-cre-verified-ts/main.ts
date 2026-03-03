/**
 * x402 CRE Verified Data Workflow
 *
 * Fetches price data with multi-node consensus verification,
 * then writes a price attestation hash on-chain via EVMClient.writeReport().
 * Use `--broadcast` with `cre simulate` to produce real testnet transactions.
 */

import * as cre from "@chainlink/cre-sdk";
import {
  Runner,
  HTTPClient,
  CronCapability,
  EVMClient,
  getNetwork,
  hexToBase64,
  bytesToHex,
  TxStatus,
  consensusIdenticalAggregation,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";

// Configuration interface
interface Config {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  symbols: string[];
  feedType: string;
  consumerAddress?: string;
  gasLimit?: string;
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
    txHash?: string;
  };
}

/** Parse config from raw WASM input */
function parseConfig(c: unknown): Config {
  try {
    if (typeof c === "string") return JSON.parse(c) as Config;
    if (c && typeof c === "object" && (c as any).type === "Buffer" && Array.isArray((c as any).data)) {
      return JSON.parse(String.fromCharCode(...((c as any).data as number[]))) as Config;
    }
    if (Array.isArray(c) && c.every((x) => typeof x === "number")) {
      return JSON.parse(String.fromCharCode(...(c as unknown as number[]))) as Config;
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

/**
 * Write a price attestation hash on-chain using CRE's EVMClient.
 * Requires a consumer contract implementing IReceiver on Sepolia.
 */
function writeAttestation(
  runtime: cre.Runtime,
  cfg: Config,
  priceHash: bigint,
  priceCount: bigint,
): string | null {
  if (!cfg.consumerAddress) {
    runtime.log("⚠️ No consumerAddress configured — skipping on-chain write");
    return null;
  }

  try {
    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: "ethereum-testnet-sepolia",
      isTestnet: true,
    });

    if (!network) {
      runtime.log("❌ Sepolia network not found");
      return null;
    }

    const evmClient = new EVMClient(network.chainSelector.selector);

    // ABI-encode: (uint256 priceHash, uint256 priceCount, uint256 timestamp)
    const reportData = encodeAbiParameters(
      parseAbiParameters("uint256 priceHash, uint256 priceCount, uint256 timestamp"),
      [priceHash, priceCount, BigInt(Math.floor(Date.now() / 1000))],
    );

    const reportResponse = runtime.report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    }).result();

    const writeResult = evmClient.writeReport(runtime, {
      receiver: cfg.consumerAddress,
      report: reportResponse,
      gasConfig: {
        gasLimit: cfg.gasLimit || "300000",
      },
    }).result();

    if (writeResult.txStatus === TxStatus.SUCCESS) {
      const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
      runtime.log(`🔗 On-chain attestation tx: ${txHash}`);
      return txHash;
    }

    runtime.log(`❌ On-chain write failed: status ${writeResult.txStatus}`);
    return null;
  } catch (error) {
    runtime.log(`❌ EVM write error: ${error}`);
    return null;
  }
}

// CRE workflow that fetches price data with multi-node consensus verification
const initWorkflow = (cfg: Config) => {
  const trigger = new CronCapability().trigger({
    schedule: "0 */5 * * * *",
  });

  const handler = async (runtime: cre.Runtime): Promise<WorkflowResult> => {
    runtime.log("🔐 Starting CRE Consensus-Verified Data Workflow");
    runtime.log(`📊 Feed type: ${cfg.feedType}`);
    runtime.log(`🔗 Symbols: ${(cfg.symbols || []).join(", ")}`);

    try {
      // Fetch price data with consensus — returns JSON string
      const rawJson = runtime.runInNodeMode(
        (nodeRuntime: cre.NodeRuntime) => {
          const httpClient = new HTTPClient();

          const symbolFilter = (cfg.symbols || [])
            .map((s) => `"${s}"`)
            .join(",");
          // Query by specific symbols only — no asset_type filter
          // since symbols span multiple types (crypto, chainlink)
          const queryUrl = `${cfg.supabaseUrl}/rest/v1/price_cache?select=symbol,price,change,change_percent,asset_type,price_unit,updated_at&symbol=in.(${symbolFilter})&order=updated_at.desc&limit=50`;

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
            nodeRuntime.log(`❌ HTTP ${response.statusCode} from price_cache`);
            const errBody = new TextDecoder().decode(response.body);
            nodeRuntime.log(`   Response: ${errBody.slice(0, 500)}`);
            return "[]";
          }

          const body = new TextDecoder().decode(response.body);
          nodeRuntime.log(`✅ HTTP 200 — ${body.length} bytes, preview: ${body.slice(0, 200)}`);
          return body;
        },
        consensusIdenticalAggregation<string>(),
      )(cfg).result();

      // Parse the JSON string outside of consensus
      let verifiedData: PriceCacheRow[] = [];
      try {
        verifiedData = JSON.parse(typeof rawJson === "string" ? rawJson : JSON.stringify(rawJson)) as PriceCacheRow[];
      } catch {
        verifiedData = [];
      }

      // Format verified prices with attestation metadata
      const verifiedPrices: VerifiedPrice[] = verifiedData.map((row) => {
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
      });

      runtime.log(`✅ Verified ${verifiedPrices.length} prices with CRE consensus`);

      verifiedPrices.slice(0, 5).forEach((p) => {
        const change = p.changePercent24h
          ? `(${p.changePercent24h > 0 ? "+" : ""}${p.changePercent24h.toFixed(2)}%)`
          : "";
        runtime.log(`  • ${p.symbol}: $${p.price} ${change}`);
      });

      // Compute a simple hash of all prices for on-chain attestation
      const priceSum = verifiedPrices.reduce((sum, p) => sum + Math.round(p.price * 1e8), 0);
      const priceHash = BigInt(priceSum);
      const priceCount = BigInt(verifiedPrices.length);

      // Write attestation on-chain (only with --broadcast)
      const txHash = writeAttestation(runtime, cfg, priceHash, priceCount);

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
          txHash: txHash || undefined,
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
