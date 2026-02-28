import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as secp256k1 from "https://esm.sh/@noble/secp256k1@2.1.0";
import { keccak_256 } from "https://esm.sh/@noble/hashes@1.4.0/sha3";
import { hmac } from "https://esm.sh/@noble/hashes@1.4.0/hmac";
import { sha256 } from "https://esm.sh/@noble/hashes@1.4.0/sha256";

// Required for @noble/secp256k1 v2 in Deno
secp256k1.etc.hmacSha256Sync = (k: Uint8Array, ...m: Uint8Array[]) => {
  const h = hmac.create(sha256, k);
  m.forEach((v) => h.update(v));
  return h.digest();
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EIP712_DOMAIN = {
  name: "CompliantPrivateTokenDemo",
  version: "0.0.1",
  chainId: 11155111,
  verifyingContract: "0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13",
};

const PRIVACY_VAULT_API = "https://convergence2026-token-api.cldev.cloud";

// --- Utility functions ---

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const padded = h.length % 2 ? "0" + h : h;
  const bytes = new Uint8Array(padded.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function padTo32(hex: string): string {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return h.padStart(64, "0");
}

function encodeUint256(value: number | bigint): string {
  return padTo32(BigInt(value).toString(16));
}

function keccak256Hex(hexData: string): string {
  return bytesToHex(keccak_256(hexToBytes(hexData)));
}

function typeHash(typeString: string): string {
  return bytesToHex(keccak_256(new TextEncoder().encode(typeString)));
}

function domainSeparator(): string {
  const DOMAIN_TYPE = "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";
  const domainTypeHash = typeHash(DOMAIN_TYPE);
  const nameHash = bytesToHex(keccak_256(new TextEncoder().encode(EIP712_DOMAIN.name)));
  const versionHash = bytesToHex(keccak_256(new TextEncoder().encode(EIP712_DOMAIN.version)));
  const chainIdHex = encodeUint256(EIP712_DOMAIN.chainId);
  const contractHex = padTo32(EIP712_DOMAIN.verifyingContract);
  const encoded = domainTypeHash.slice(2) + nameHash.slice(2) + versionHash.slice(2) + chainIdHex + contractHex;
  return keccak256Hex(encoded);
}

function deriveAddress(privateKeyHex: string): string {
  const pubKey = secp256k1.getPublicKey(hexToBytes(privateKeyHex), false);
  const pubKeyNoPrefix = pubKey.slice(1);
  const hash = keccak_256(pubKeyNoPrefix);
  return bytesToHex(hash.slice(-20));
}

async function signEip712(structHash: string, privateKeyHex: string): Promise<string> {
  const domSep = domainSeparator();
  const message = "1901" + domSep.slice(2) + structHash.slice(2);
  const messageHash = hexToBytes(keccak256Hex(message));
  const sig = secp256k1.sign(messageHash, hexToBytes(privateKeyHex));
  const r = sig.r.toString(16).padStart(64, "0");
  const s = sig.s.toString(16).padStart(64, "0");
  const v = (sig.recovery! + 27).toString(16).padStart(2, "0");
  return "0x" + r + s + v;
}

// --- EIP-712 Struct Hashing (matching official API docs) ---

function hashRetrieveBalances(account: string, timestamp: bigint): string {
  const TYPE = "Retrieve Balances(address account,uint256 timestamp)";
  const tHash = typeHash(TYPE);
  return keccak256Hex(tHash.slice(2) + padTo32(account) + encodeUint256(timestamp));
}

function hashListTransactions(account: string, timestamp: bigint, cursor: string, limit: bigint): string {
  const TYPE = "List Transactions(address account,uint256 timestamp,string cursor,uint256 limit)";
  const tHash = typeHash(TYPE);
  const cursorHash = bytesToHex(keccak_256(new TextEncoder().encode(cursor)));
  return keccak256Hex(tHash.slice(2) + padTo32(account) + encodeUint256(timestamp) + cursorHash.slice(2) + encodeUint256(limit));
}

function hashPrivateTransfer(sender: string, recipient: string, token: string, amount: bigint, flags: string[], timestamp: bigint): string {
  const TYPE = "Private Token Transfer(address sender,address recipient,address token,uint256 amount,string[] flags,uint256 timestamp)";
  const tHash = typeHash(TYPE);
  // Hash the flags array: keccak256 of concatenated keccak256 of each flag
  let flagsInnerHash: string;
  if (flags.length === 0) {
    flagsInnerHash = bytesToHex(keccak_256(new Uint8Array(0)));
  } else {
    const flagHashes = flags.map(f => bytesToHex(keccak_256(new TextEncoder().encode(f))).slice(2)).join("");
    flagsInnerHash = keccak256Hex(flagHashes);
  }
  return keccak256Hex(
    tHash.slice(2) +
    padTo32(sender) +
    padTo32(recipient) +
    padTo32(token) +
    encodeUint256(amount) +
    flagsInnerHash.slice(2) +
    encodeUint256(timestamp)
  );
}

function hashWithdraw(account: string, token: string, amount: bigint, timestamp: bigint): string {
  const TYPE = "Withdraw Tokens(address account,address token,uint256 amount,uint256 timestamp)";
  const tHash = typeHash(TYPE);
  return keccak256Hex(tHash.slice(2) + padTo32(account) + padTo32(token) + encodeUint256(amount) + encodeUint256(timestamp));
}

function hashGenerateShieldedAddress(account: string, timestamp: bigint): string {
  const TYPE = "Generate Shielded Address(address account,uint256 timestamp)";
  const tHash = typeHash(TYPE);
  return keccak256Hex(tHash.slice(2) + padTo32(account) + encodeUint256(timestamp));
}

// --- Helper to make API calls ---

async function callPrivacyAPI(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resp = await fetch(`${PRIVACY_VAULT_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Privacy Vault API error ${resp.status}: ${errText}`);
  }
  return await resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privateKeyHex = Deno.env.get("PRIVACY_VAULT_PRIVATE_KEY");
    if (!privateKeyHex) throw new Error("PRIVACY_VAULT_PRIVATE_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = user.id;
    const account = deriveAddress(privateKeyHex);
    const { action, ...params } = await req.json();
    const timestamp = BigInt(Math.floor(Date.now() / 1000));

    console.log(`[PrivacyVault] Action: ${action}, User: ${userId}, Account: ${account}`);

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case "generate-shielded-address": {
        const structHash = hashGenerateShieldedAddress(account, timestamp);
        const auth = await signEip712(structHash, privateKeyHex);
        const result = await callPrivacyAPI("/shielded-address", { account, timestamp: Number(timestamp), auth });
        const shieldedAddress = result.address as string;

        if (shieldedAddress) {
          await serviceClient.from("privacy_shielded_addresses").insert({
            user_id: userId, shielded_address: shieldedAddress, label: params.label || null,
          });
        }

        return new Response(
          JSON.stringify({ success: true, shielded_address: shieldedAddress, result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "private-transfer": {
        const { recipient, amount, token } = params;
        if (!recipient || !amount || !token) throw new Error("recipient, amount, and token are required");

        const amountBigInt = BigInt(amount);
        const flags: string[] = params.flags || [];
        const structHash = hashPrivateTransfer(account, recipient as string, token as string, amountBigInt, flags, timestamp);
        const auth = await signEip712(structHash, privateKeyHex);

        const result = await callPrivacyAPI("/private-transfer", {
          account, recipient, token, amount: amountBigInt.toString(), flags, timestamp: Number(timestamp), auth,
        });

        await serviceClient.from("agent_actions_log").insert({
          user_id: userId, action_type: "privacy-transfer",
          params: { recipient, amount, token, network: "ethereum-sepolia" },
          status: "executed", result,
        });

        return new Response(JSON.stringify({ success: true, result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "balances": {
        const structHash = hashRetrieveBalances(account, timestamp);
        const auth = await signEip712(structHash, privateKeyHex);
        const result = await callPrivacyAPI("/balances", { account, timestamp: Number(timestamp), auth });

        console.log("[PrivacyVault] Raw balances response:", JSON.stringify(result));
        const balancesArray = Array.isArray(result.balances) ? result.balances : [];

        return new Response(JSON.stringify({ success: true, balances: balancesArray }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "transactions": {
        const cursor = (params.cursor as string) || "";
        const limit = BigInt(params.limit as number || 20);
        const structHash = hashListTransactions(account, timestamp, cursor, limit);
        const auth = await signEip712(structHash, privateKeyHex);

        const body: Record<string, unknown> = { account, timestamp: Number(timestamp), auth, limit: Number(limit) };
        if (cursor) body.cursor = cursor;
        const result = await callPrivacyAPI("/transactions", body);

        return new Response(JSON.stringify({ success: true, transactions: result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "withdraw": {
        const { amount, token } = params;
        if (!amount || !token) throw new Error("amount and token are required");

        const amountBigInt = BigInt(amount);
        const structHash = hashWithdraw(account, token as string, amountBigInt, timestamp);
        const auth = await signEip712(structHash, privateKeyHex);

        const result = await callPrivacyAPI("/withdraw", {
          account, token, amount: amountBigInt.toString(), timestamp: Number(timestamp), auth,
        });

        await serviceClient.from("agent_actions_log").insert({
          user_id: userId, action_type: "privacy-withdraw",
          params: { amount, token, network: "ethereum-sepolia" },
          status: "executed", result,
        });

        return new Response(JSON.stringify({ success: true, result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list-addresses": {
        const { data: addresses } = await userClient
          .from("privacy_shielded_addresses").select("*")
          .eq("user_id", userId).order("created_at", { ascending: false });

        return new Response(JSON.stringify({ success: true, addresses: addresses || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("[PrivacyVault] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
