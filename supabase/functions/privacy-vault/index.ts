import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as secp256k1 from "https://esm.sh/@noble/secp256k1@2.1.0";
import { keccak_256 } from "https://esm.sh/@noble/hashes@1.4.0/sha3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// EIP-712 Domain for the Convergence Privacy Vault
const EIP712_DOMAIN = {
  name: "CompliantPrivateTokenDemo",
  version: "0.0.1",
  chainId: 11155111, // Ethereum Sepolia
  verifyingContract: "0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13",
};

const PRIVACY_VAULT_API = "https://convergence2026-token-api.cldev.cloud";

// --- EIP-712 Signing Utilities ---

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

function encodeBool(value: boolean): string {
  return padTo32(value ? "1" : "0");
}

/**
 * Compute keccak256 hash of hex-encoded data.
 */
function keccak256Hex(hexData: string): string {
  const bytes = hexToBytes(hexData);
  const hash = keccak_256(bytes);
  return bytesToHex(hash);
}

/**
 * EIP-712 type hash: keccak256 of the type string.
 */
function typeHash(typeString: string): string {
  const bytes = new TextEncoder().encode(typeString);
  return bytesToHex(keccak_256(bytes));
}

/**
 * EIP-712 domain separator.
 */
function domainSeparator(): string {
  const DOMAIN_TYPE = "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";
  const domainTypeHash = typeHash(DOMAIN_TYPE);

  const nameHash = bytesToHex(keccak_256(new TextEncoder().encode(EIP712_DOMAIN.name)));
  const versionHash = bytesToHex(keccak_256(new TextEncoder().encode(EIP712_DOMAIN.version)));
  const chainIdHex = encodeUint256(EIP712_DOMAIN.chainId);
  const contractHex = padTo32(EIP712_DOMAIN.verifyingContract);

  const encoded =
    domainTypeHash.slice(2) +
    nameHash.slice(2) +
    versionHash.slice(2) +
    chainIdHex +
    contractHex;

  return keccak256Hex(encoded);
}

/**
 * Derive the Ethereum address from a secp256k1 private key.
 */
function deriveAddress(privateKeyHex: string): string {
  const pubKey = secp256k1.getPublicKey(hexToBytes(privateKeyHex), false);
  // Remove the 0x04 prefix, take keccak256, last 20 bytes
  const pubKeyNoPrefix = pubKey.slice(1);
  const hash = keccak_256(pubKeyNoPrefix);
  const addressBytes = hash.slice(-20);
  return bytesToHex(addressBytes);
}

/**
 * Sign an EIP-712 struct hash with the private key.
 * Returns the signature as 0x{r}{s}{v} (65 bytes).
 */
async function signEip712(structHash: string, privateKeyHex: string): Promise<string> {
  const domSep = domainSeparator();
  // EIP-712: \x19\x01 || domainSeparator || structHash
  const message = "1901" + domSep.slice(2) + structHash.slice(2);
  const messageHash = hexToBytes(keccak256Hex(message));

  const sig = secp256k1.sign(messageHash, hexToBytes(privateKeyHex));
  const r = sig.r.toString(16).padStart(64, "0");
  const s = sig.s.toString(16).padStart(64, "0");
  const v = (sig.recovery! + 27).toString(16).padStart(2, "0");

  return "0x" + r + s + v;
}

// --- Action-specific EIP-712 struct hashing ---

function hashGenerateShieldedAddress(account: string): string {
  const TYPE = "GenerateShieldedAddress(address account)";
  const tHash = typeHash(TYPE);
  const encoded = tHash.slice(2) + padTo32(account);
  return keccak256Hex(encoded);
}

function hashPrivateTransfer(account: string, to: string, amount: bigint, tokenAddress: string): string {
  const TYPE = "PrivateTransfer(address account,address to,uint256 amount,address token)";
  const tHash = typeHash(TYPE);
  const encoded =
    tHash.slice(2) +
    padTo32(account) +
    padTo32(to) +
    encodeUint256(amount) +
    padTo32(tokenAddress);
  return keccak256Hex(encoded);
}

function hashGetBalances(account: string): string {
  const TYPE = "GetBalances(address account)";
  const tHash = typeHash(TYPE);
  const encoded = tHash.slice(2) + padTo32(account);
  return keccak256Hex(encoded);
}

function hashGetTransactions(account: string): string {
  const TYPE = "GetTransactions(address account)";
  const tHash = typeHash(TYPE);
  const encoded = tHash.slice(2) + padTo32(account);
  return keccak256Hex(encoded);
}

function hashWithdraw(account: string, amount: bigint, tokenAddress: string): string {
  const TYPE = "Withdraw(address account,uint256 amount,address token)";
  const tHash = typeHash(TYPE);
  const encoded =
    tHash.slice(2) +
    padTo32(account) +
    encodeUint256(amount) +
    padTo32(tokenAddress);
  return keccak256Hex(encoded);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privateKeyHex = Deno.env.get("PRIVACY_VAULT_PRIVATE_KEY");
    if (!privateKeyHex) {
      throw new Error("PRIVACY_VAULT_PRIVATE_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const account = deriveAddress(privateKeyHex);
    const { action, ...params } = await req.json();

    console.log(`[PrivacyVault] Action: ${action}, User: ${userId}, Account: ${account}`);

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case "generate-shielded-address": {
        const structHash = hashGenerateShieldedAddress(account);
        const signature = await signEip712(structHash, privateKeyHex);

        const resp = await fetch(`${PRIVACY_VAULT_API}/api/shielded-address/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account, signature }),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Privacy Vault API error ${resp.status}: ${errText}`);
        }

        const result = await resp.json();
        const shieldedAddress = result.shielded_address || result.shieldedAddress || result.address;

        if (shieldedAddress) {
          // Store in database
          await serviceClient.from("privacy_shielded_addresses").insert({
            user_id: userId,
            shielded_address: shieldedAddress,
            label: params.label || null,
          });
        }

        return new Response(
          JSON.stringify({ success: true, shielded_address: shieldedAddress, result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "private-transfer": {
        const { to, amount, token_address } = params;
        if (!to || !amount || !token_address) {
          throw new Error("to, amount, and token_address are required");
        }

        const amountBigInt = BigInt(Math.round(Number(amount) * 1_000_000)); // Assumes 6 decimals
        const structHash = hashPrivateTransfer(account, to, amountBigInt, token_address);
        const signature = await signEip712(structHash, privateKeyHex);

        const resp = await fetch(`${PRIVACY_VAULT_API}/api/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account,
            to,
            amount: amountBigInt.toString(),
            token: token_address,
            signature,
          }),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Privacy Vault API error ${resp.status}: ${errText}`);
        }

        const result = await resp.json();

        // Log the action
        await serviceClient.from("agent_actions_log").insert({
          user_id: userId,
          action_type: "privacy-transfer",
          params: { to, amount, token_address, network: "ethereum-sepolia" },
          status: "executed",
          result,
        });

        return new Response(
          JSON.stringify({ success: true, result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "balances": {
        const structHash = hashGetBalances(account);
        const signature = await signEip712(structHash, privateKeyHex);

        const resp = await fetch(
          `${PRIVACY_VAULT_API}/api/balances?account=${account}&signature=${signature}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Privacy Vault API error ${resp.status}: ${errText}`);
        }

        const result = await resp.json();
        return new Response(
          JSON.stringify({ success: true, balances: result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "transactions": {
        const structHash = hashGetTransactions(account);
        const signature = await signEip712(structHash, privateKeyHex);

        const resp = await fetch(
          `${PRIVACY_VAULT_API}/api/transactions?account=${account}&signature=${signature}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Privacy Vault API error ${resp.status}: ${errText}`);
        }

        const result = await resp.json();
        return new Response(
          JSON.stringify({ success: true, transactions: result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "withdraw": {
        const { amount, token_address } = params;
        if (!amount || !token_address) {
          throw new Error("amount and token_address are required");
        }

        const amountBigInt = BigInt(Math.round(Number(amount) * 1_000_000));
        const structHash = hashWithdraw(account, amountBigInt, token_address);
        const signature = await signEip712(structHash, privateKeyHex);

        const resp = await fetch(`${PRIVACY_VAULT_API}/api/withdraw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account,
            amount: amountBigInt.toString(),
            token: token_address,
            signature,
          }),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Privacy Vault API error ${resp.status}: ${errText}`);
        }

        const result = await resp.json();

        await serviceClient.from("agent_actions_log").insert({
          user_id: userId,
          action_type: "privacy-withdraw",
          params: { amount, token_address, network: "ethereum-sepolia" },
          status: "executed",
          result,
        });

        return new Response(
          JSON.stringify({ success: true, result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-addresses": {
        const { data: addresses } = await userClient
          .from("privacy_shielded_addresses")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        return new Response(
          JSON.stringify({ success: true, addresses: addresses || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[PrivacyVault] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
