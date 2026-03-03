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
const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const VAULT_CONTRACT = EIP712_DOMAIN.verifyingContract;
const CHAIN_ID = BigInt(EIP712_DOMAIN.chainId);

const TOKEN_DECIMALS: Record<string, number> = {
  "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238": 6,  // USDC
  "0x779877a7b0d9e8603169ddbd7836e478b4624789": 18, // LINK
  "0x7b79995e5f793a07bc00c21412e50ecae098e7f9": 18, // WETH
  "0x0000000000000000000000000000000000000000": 18, // ETH
};

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

// --- EIP-712 Struct Hashing ---

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
  let flagsInnerHash: string;
  if (flags.length === 0) {
    flagsInnerHash = bytesToHex(keccak_256(new Uint8Array(0)));
  } else {
    const flagHashes = flags.map(f => bytesToHex(keccak_256(new TextEncoder().encode(f))).slice(2)).join("");
    flagsInnerHash = keccak256Hex(flagHashes);
  }
  return keccak256Hex(
    tHash.slice(2) + padTo32(sender) + padTo32(recipient) + padTo32(token) +
    encodeUint256(amount) + flagsInnerHash.slice(2) + encodeUint256(timestamp)
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

// --- RLP Encoding for Raw Ethereum Transactions ---

function rlpEncodeLength(len: number, offset: number): Uint8Array {
  if (len < 56) {
    return new Uint8Array([len + offset]);
  }
  const hexLen = len.toString(16);
  const lenBytes = hexToBytes(hexLen.length % 2 ? "0" + hexLen : hexLen);
  return new Uint8Array([offset + 55 + lenBytes.length, ...lenBytes]);
}

function rlpEncodeItem(data: Uint8Array): Uint8Array {
  if (data.length === 1 && data[0] < 0x80) {
    return data;
  }
  const prefix = rlpEncodeLength(data.length, 0x80);
  const result = new Uint8Array(prefix.length + data.length);
  result.set(prefix);
  result.set(data, prefix.length);
  return result;
}

function rlpEncodeList(items: Uint8Array[]): Uint8Array {
  const encoded = items.map(rlpEncodeItem);
  let totalLen = 0;
  encoded.forEach(e => totalLen += e.length);
  const prefix = rlpEncodeLength(totalLen, 0xc0);
  const result = new Uint8Array(prefix.length + totalLen);
  result.set(prefix);
  let offset = prefix.length;
  encoded.forEach(e => { result.set(e, offset); offset += e.length; });
  return result;
}

function bigIntToBytes(val: bigint): Uint8Array {
  if (val === 0n) return new Uint8Array(0);
  let hex = val.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return hexToBytes(hex);
}

// --- Raw Transaction Signing (Legacy Type 0, EIP-155) ---

async function getNonce(address: string): Promise<bigint> {
  const resp = await fetch(SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionCount", params: [address, "pending"], id: 1 }),
  });
  const data = await resp.json();
  return BigInt(data.result || "0x0");
}

async function getGasPrice(): Promise<bigint> {
  const resp = await fetch(SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 1 }),
  });
  const data = await resp.json();
  return BigInt(data.result || "0x0");
}

function signRawTransaction(
  nonce: bigint, gasPrice: bigint, gasLimit: bigint,
  to: string, value: bigint, data: string,
  privateKeyHex: string
): string {
  // For contract creation, to should be "" or "0x" -> empty bytes
  const toBytes = (!to || to === "" || to === "0x") ? new Uint8Array(0) : hexToBytes(to);
  const dataBytes = data === "0x" ? new Uint8Array(0) : hexToBytes(data);

  // EIP-155 signing: hash [nonce, gasPrice, gasLimit, to, value, data, chainId, 0, 0]
  const signingFields = [
    bigIntToBytes(nonce),
    bigIntToBytes(gasPrice),
    bigIntToBytes(gasLimit),
    toBytes,
    bigIntToBytes(value),
    dataBytes,
    bigIntToBytes(CHAIN_ID),
    new Uint8Array(0), // 0
    new Uint8Array(0), // 0
  ];

  const rlpEncoded = rlpEncodeList(signingFields);
  const txHash = keccak_256(rlpEncoded);
  const sig = secp256k1.sign(txHash, hexToBytes(privateKeyHex));
  const r = sig.r;
  const s = sig.s;
  const v = CHAIN_ID * 2n + 35n + BigInt(sig.recovery!);

  // Build signed tx: [nonce, gasPrice, gasLimit, to, value, data, v, r, s]
  const signedFields = [
    bigIntToBytes(nonce),
    bigIntToBytes(gasPrice),
    bigIntToBytes(gasLimit),
    toBytes,
    bigIntToBytes(value),
    dataBytes,
    bigIntToBytes(v),
    bigIntToBytes(r),
    bigIntToBytes(s),
  ];

  return bytesToHex(rlpEncodeList(signedFields));
}

async function sendRawTransaction(signedTx: string): Promise<string> {
  const resp = await fetch(SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_sendRawTransaction", params: [signedTx], id: 1 }),
  });
  const data = await resp.json();
  if (data.error) {
    throw new Error(`eth_sendRawTransaction failed: ${JSON.stringify(data.error)}`);
  }
  return data.result as string;
}

async function waitForReceipt(txHash: string, maxAttempts = 30): Promise<Record<string, unknown>> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const resp = await fetch(SEPOLIA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionReceipt", params: [txHash], id: 1 }),
    });
    const data = await resp.json();
    if (data.result) return data.result;
  }
  throw new Error(`Transaction ${txHash} not mined after ${maxAttempts * 2}s`);
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

        const decimals = TOKEN_DECIMALS[(token as string).toLowerCase()] ?? 18;
        const amountNum = Number(amount);
        const amountBigInt = BigInt(Math.round(amountNum * (10 ** decimals)));
        const flags: string[] = params.flags || [];
        const structHash = hashPrivateTransfer(account, recipient as string, token as string, amountBigInt, flags, timestamp);
        const auth = await signEip712(structHash, privateKeyHex);

        let result;
        try {
          result = await callPrivacyAPI("/private-transfer", {
            account, recipient, token, amount: amountBigInt.toString(), flags, timestamp: Number(timestamp), auth,
          });
        } catch (e) {
          if (e instanceof Error && e.message.includes("account not found")) {
            throw new Error("Your privacy vault account has not been onboarded yet. Please generate a shielded address and deposit tokens into the privacy protocol before making transfers.");
          }
          throw e;
        }

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

      case "deposit": {
        // Automated on-chain deposit: for native ETH, wrap to WETH first, then approve+deposit WETH
        const { amount, token } = params;
        if (!amount || !token) throw new Error("amount and token are required");

        const isNativeETH = (token as string).toLowerCase() === "0x0000000000000000000000000000000000000000";
        const WETH_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
        // For native ETH deposits, we wrap to WETH then deposit WETH
        const effectiveToken = isNativeETH ? WETH_ADDRESS : (token as string);
        const decimals = TOKEN_DECIMALS[effectiveToken.toLowerCase()] ?? 18;
        const amountBigInt = BigInt(Math.round(Number(amount) * (10 ** decimals)));
        const accountAddr = "0x" + deriveAddress(privateKeyHex).slice(2);

        console.log(`[PrivacyVault] On-chain deposit: token=${token}, effectiveToken=${effectiveToken}, amount=${amountBigInt}, account=${accountAddr}, native=${isNativeETH}`);

        // Pre-check: call checkDepositAllowed(depositor, token, amount) view function
        // selector: keccak256("checkDepositAllowed(address,address,uint256)") first 4 bytes
        const checkSelector = bytesToHex(keccak_256(new TextEncoder().encode("checkDepositAllowed(address,address,uint256)"))).slice(0, 10);
        const checkData = checkSelector + padTo32(accountAddr) + padTo32(effectiveToken) + encodeUint256(amountBigInt);
        
        const checkResp = await fetch(SEPOLIA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: VAULT_CONTRACT, data: checkData }, "latest"], id: 1 }),
        });
        const checkResult = await checkResp.json();
        
        // Robust revert detection for eth_call
        const isRevert = (result: string | undefined): boolean => {
          if (!result || result === "0x") return true;
          // Error(string) selector
          if (result.startsWith("0x08c379a2")) return true;
          // Panic(uint256) selector
          if (result.startsWith("0x4e487b71")) return true;
          return false;
        };
        
        const decodeRevertReason = (result: string): string => {
          if (!result || result === "0x") return "Empty result (call reverted with no reason)";
          if (result.startsWith("0x08c379a2") && result.length >= 138) {
            try {
              // Decode Error(string): skip selector (4 bytes) + offset (32 bytes) + length (32 bytes) = 68 bytes = 136 hex chars + "0x"
              const lenHex = result.slice(74, 138);
              const strLen = parseInt(lenHex, 16);
              const strHex = result.slice(138, 138 + strLen * 2);
              const bytes = new Uint8Array(strLen);
              for (let i = 0; i < strLen; i++) {
                bytes[i] = parseInt(strHex.slice(i * 2, i * 2 + 2), 16);
              }
              return new TextDecoder().decode(bytes);
            } catch { return "Revert with undecodable Error(string)"; }
          }
          if (result.startsWith("0x4e487b71")) return "Panic error";
          return "Unknown revert data";
        };

        if (checkResult.error) {
          const errMsg = typeof checkResult.error === 'object' ? JSON.stringify(checkResult.error) : String(checkResult.error);
          console.error(`[PrivacyVault] checkDepositAllowed JSON-RPC error:`, errMsg);
          throw new Error(`Deposit not allowed by policy engine. Your account (${accountAddr}) may need to be whitelisted for this token on the ACE policy engine. RPC error: ${errMsg}`);
        }
        
        if (isRevert(checkResult.result)) {
          const reason = decodeRevertReason(checkResult.result || "0x");
          console.error(`[PrivacyVault] checkDepositAllowed reverted. Result: ${checkResult.result}, Reason: ${reason}`);
          throw new Error(`Deposit denied by policy engine. Your account (${accountAddr}) may need to be whitelisted for token ${effectiveToken}. Revert reason: ${reason}`);
        }
        
        console.log(`[PrivacyVault] checkDepositAllowed passed, result: ${checkResult.result}`);

        // Get nonce and gas price
        const [nonce, gasPrice] = await Promise.all([getNonce(accountAddr), getGasPrice()]);
        const bufferedGasPrice = gasPrice * 12n / 10n;

        let currentNonce = nonce;
        let wrapTxHash: string | undefined;
        let approveTxHash: string | undefined;
        let depositTxHash: string;

        if (isNativeETH) {
          // Step 1: Wrap ETH → WETH by calling WETH.deposit() (selector 0xd0e30db0) with value
          const wrapData = "0xd0e30db0";
          const wrapTx = signRawTransaction(currentNonce, bufferedGasPrice, 60000n, WETH_ADDRESS, amountBigInt, wrapData, privateKeyHex);
          wrapTxHash = await sendRawTransaction(wrapTx);
          console.log(`[PrivacyVault] Wrap ETH→WETH tx sent: ${wrapTxHash}`);

          const wrapReceipt = await waitForReceipt(wrapTxHash);
          if ((wrapReceipt.status as string) !== "0x1") {
            throw new Error(`Wrap ETH→WETH transaction reverted: ${wrapTxHash}`);
          }
          console.log(`[PrivacyVault] Wrap tx mined successfully`);
          currentNonce += 1n;
        }

        // Step 2: Approve vault to spend the token
        const approveData = "0x095ea7b3" + padTo32(VAULT_CONTRACT) + encodeUint256(amountBigInt);
        const approveTx = signRawTransaction(currentNonce, bufferedGasPrice, 100000n, effectiveToken, 0n, approveData, privateKeyHex);
        approveTxHash = await sendRawTransaction(approveTx);
        console.log(`[PrivacyVault] Approve tx sent: ${approveTxHash}`);

        const approveReceipt = await waitForReceipt(approveTxHash);
        if ((approveReceipt.status as string) !== "0x1") {
          throw new Error(`Approve transaction reverted: ${approveTxHash}`);
        }
        console.log(`[PrivacyVault] Approve tx mined successfully`);
        currentNonce += 1n;

        // Step 3: deposit(token, amount) on the Vault contract
        const depositData = "0x47e7ef24" + padTo32(effectiveToken) + encodeUint256(amountBigInt);
        const depositTx = signRawTransaction(currentNonce, bufferedGasPrice, 200000n, VAULT_CONTRACT, 0n, depositData, privateKeyHex);
        depositTxHash = await sendRawTransaction(depositTx);
        console.log(`[PrivacyVault] Deposit tx sent: ${depositTxHash}`);

        const depositReceipt = await waitForReceipt(depositTxHash);
        if ((depositReceipt.status as string) !== "0x1") {
          throw new Error(`Deposit transaction reverted on-chain: ${depositTxHash}. The ACE policy engine likely rejected the deposit. Your account may need to be whitelisted for this token. Check the policy engine associated with this token via Token Registration.`);
        }
        console.log(`[PrivacyVault] Deposit tx mined successfully`);

        await serviceClient.from("agent_actions_log").insert({
          user_id: userId, action_type: "privacy-deposit",
          params: { amount, token: effectiveToken, network: "ethereum-sepolia", wrap_tx: wrapTxHash, approve_tx: approveTxHash, deposit_tx: depositTxHash },
          status: "executed",
          result: { wrap_tx: wrapTxHash, approve_tx: approveTxHash, deposit_tx: depositTxHash },
        });

        return new Response(JSON.stringify({
          success: true,
          method: "on-chain",
          ...(wrapTxHash ? { wrap_tx: wrapTxHash } : {}),
          approve_tx: approveTxHash,
          deposit_tx: depositTxHash,
          network: "ethereum-sepolia",
          message: isNativeETH
            ? "SepoliaETH wrapped to WETH and deposited on-chain. The indexer may take ~30 seconds to credit your privacy vault balance."
            : "Deposit completed on-chain. The indexer may take ~30 seconds to credit your privacy vault balance.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "onboard-status": {
        // Check if the account is onboarded by querying the /balances API
        try {
          const structHash = hashRetrieveBalances(account, timestamp);
          const auth = await signEip712(structHash, privateKeyHex);
          await callPrivacyAPI("/balances", { account, timestamp: Number(timestamp), auth });
          return new Response(JSON.stringify({ success: true, onboarded: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          const notOnboarded = msg.includes("404") || msg.includes("account not found") || msg.includes("not found");
          return new Response(JSON.stringify({ success: true, onboarded: !notOnboarded }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      case "withdraw": {
        // Two-step withdrawal: 1) get ticket from API, 2) redeem on-chain via withdrawWithTicket
        const { amount, token } = params;
        if (!amount || !token) throw new Error("amount and token are required");

        const decimals = TOKEN_DECIMALS[(token as string).toLowerCase()] ?? 18;
        const amountBigInt = BigInt(Math.round(Number(amount) * (10 ** decimals)));
        const structHash = hashWithdraw(account, token as string, amountBigInt, timestamp);
        const auth = await signEip712(structHash, privateKeyHex);

        // Step 1: Request withdrawal ticket from API
        const ticketResult = await callPrivacyAPI("/withdraw", {
          account, token, amount: amountBigInt.toString(), timestamp: Number(timestamp), auth,
        });

        console.log(`[PrivacyVault] Withdrawal ticket received:`, JSON.stringify(ticketResult));

        const ticket = ticketResult.ticket as string;
        if (!ticket) {
          throw new Error("No withdrawal ticket received from API");
        }

        // Step 2: Redeem on-chain via withdrawWithTicket(token, amount, ticket)
        const accountAddr = "0x" + deriveAddress(privateKeyHex).slice(2);
        const [wNonce, wGasPrice] = await Promise.all([getNonce(accountAddr), getGasPrice()]);
        const wBufferedGasPrice = wGasPrice * 12n / 10n;

        // withdrawWithTicket(address token, uint256 amount, bytes calldata ticket)
        const withdrawSelector = bytesToHex(keccak_256(new TextEncoder().encode("withdrawWithTicket(address,uint256,bytes)"))).slice(0, 10);
        // ABI encode: token (32) + amount (32) + offset to bytes (32) + bytes length (32) + bytes data (padded)
        const ticketBytes = hexToBytes(ticket);
        const ticketLen = ticketBytes.length;
        const ticketPadded = ticketLen % 32 === 0 ? ticketLen : ticketLen + (32 - ticketLen % 32);
        let ticketHex = bytesToHex(ticketBytes).slice(2);
        ticketHex = ticketHex.padEnd(ticketPadded * 2, "0");

        const withdrawData = withdrawSelector
          + padTo32(token as string)               // token address
          + encodeUint256(amountBigInt)             // amount
          + encodeUint256(96)                       // offset to bytes (3 * 32 = 96)
          + encodeUint256(ticketLen)                // bytes length
          + ticketHex;                              // bytes data (padded to 32)

        const withdrawTx = signRawTransaction(wNonce, wBufferedGasPrice, 300000n, VAULT_CONTRACT, 0n, "0x" + withdrawData.slice(2), privateKeyHex);
        const withdrawTxHash = await sendRawTransaction(withdrawTx);
        console.log(`[PrivacyVault] withdrawWithTicket tx sent: ${withdrawTxHash}`);

        const withdrawReceipt = await waitForReceipt(withdrawTxHash);
        if ((withdrawReceipt.status as string) !== "0x1") {
          throw new Error(`Withdrawal on-chain redemption reverted: ${withdrawTxHash}. The ticket may have expired or the policy engine rejected it.`);
        }
        console.log(`[PrivacyVault] withdrawWithTicket tx mined successfully`);

        await serviceClient.from("agent_actions_log").insert({
          user_id: userId, action_type: "privacy-withdraw",
          params: { amount, token, network: "ethereum-sepolia" },
          status: "executed", result: { ...ticketResult, withdraw_tx: withdrawTxHash },
        });

        return new Response(JSON.stringify({ success: true, withdraw_tx: withdrawTxHash, ticket_id: ticketResult.id, result: ticketResult }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list-addresses": {
        const { data: addresses } = await userClient
          .from("privacy_shielded_addresses").select("*")
          .eq("user_id", userId).order("created_at", { ascending: false });

        return new Response(JSON.stringify({ success: true, addresses: addresses || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "onchain-balance": {
        const { address } = params;
        if (!address) throw new Error("address is required");

        const rpcResp = await fetch(SEPOLIA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 1,
          }),
        });
        const rpcData = await rpcResp.json();
        const weiHex = rpcData.result || "0x0";
        const wei = BigInt(weiHex);
        const ethBalance = Number(wei) / 1e18;

        return new Response(JSON.stringify({ success: true, address, balance_eth: ethBalance, balance_wei: wei.toString() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "onchain-erc20-balance": {
        const { address, token, decimals: dec } = params;
        if (!address || !token) throw new Error("address and token are required");

        const decimals = Number(dec) || 18;
        const addrNoPre = (address as string).startsWith("0x") ? (address as string).slice(2) : (address as string);
        const callData = "0x70a08231" + addrNoPre.toLowerCase().padStart(64, "0");

        const rpcResp = await fetch(SEPOLIA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", method: "eth_call", params: [{ to: token, data: callData }, "latest"], id: 1,
          }),
        });
        const rpcData = await rpcResp.json();
        const rawHex = rpcData.result || "0x0";
        const rawBig = BigInt(rawHex);
        const balance = Number(rawBig) / Math.pow(10, decimals);

        return new Response(JSON.stringify({ success: true, address, token, balance, balance_raw: rawBig.toString() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "check-registration": {
        // Check if a token is registered on the vault contract by calling sPolicyEngines(address)
        const { token } = params;
        if (!token) throw new Error("token is required");

        // selector: keccak256("sPolicyEngines(address)") first 4 bytes
        const selectorBytes = keccak_256(new TextEncoder().encode("sPolicyEngines(address)"));
        const selector = bytesToHex(selectorBytes).slice(0, 10); // 0x + 8 hex chars
        const callData = selector + padTo32(token as string);

        const rpcResp = await fetch(SEPOLIA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", method: "eth_call",
            params: [{ to: VAULT_CONTRACT, data: callData }, "latest"], id: 1,
          }),
        });
        const rpcData = await rpcResp.json();
        const result = rpcData.result || "0x" + "0".repeat(64);
        // If result is all zeros → not registered
        const isRegistered = result !== "0x" + "0".repeat(64) && result !== "0x";
        const policyEngine = "0x" + result.slice(26); // last 20 bytes

        console.log(`[PrivacyVault] check-registration: token=${token}, registered=${isRegistered}, policyEngine=${policyEngine}`);

        return new Response(JSON.stringify({ success: true, token, registered: isRegistered, policy_engine: policyEngine }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "check-deposit-allowed": {
        // Standalone diagnostic: check if a deposit would be allowed by the policy engine
        const { token: cdaToken, amount: cdaAmount } = params;
        if (!cdaToken) throw new Error("token is required");

        const cdaEffective = (cdaToken as string).toLowerCase() === "0x0000000000000000000000000000000000000000"
          ? "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9" : (cdaToken as string);
        const cdaDecimals = TOKEN_DECIMALS[cdaEffective.toLowerCase()] ?? 18;
        const cdaAmountBigInt = BigInt(Math.round(Number(cdaAmount || 1) * (10 ** cdaDecimals)));
        const cdaAccountAddr = "0x" + deriveAddress(privateKeyHex).slice(2);

        const cdaSelector = bytesToHex(keccak_256(new TextEncoder().encode("checkDepositAllowed(address,address,uint256)"))).slice(0, 10);
        const cdaData = cdaSelector + padTo32(cdaAccountAddr) + padTo32(cdaEffective) + encodeUint256(cdaAmountBigInt);

        const cdaResp = await fetch(SEPOLIA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: VAULT_CONTRACT, data: cdaData }, "latest"], id: 1 }),
        });
        const cdaResult = await cdaResp.json();

        let allowed = true;
        let reason = "Deposit allowed";

        if (cdaResult.error) {
          allowed = false;
          reason = `RPC error: ${typeof cdaResult.error === 'object' ? JSON.stringify(cdaResult.error) : String(cdaResult.error)}`;
        } else {
          const r = cdaResult.result;
          if (!r || r === "0x" || r.startsWith("0x08c379a2") || r.startsWith("0x4e487b71")) {
            allowed = false;
            if (r && r.startsWith("0x08c379a2") && r.length >= 138) {
              try {
                const lenHex = r.slice(74, 138);
                const strLen = parseInt(lenHex, 16);
                const strHex = r.slice(138, 138 + strLen * 2);
                const bytes = new Uint8Array(strLen);
                for (let i = 0; i < strLen; i++) bytes[i] = parseInt(strHex.slice(i * 2, i * 2 + 2), 16);
                reason = `Policy engine denied: ${new TextDecoder().decode(bytes)}`;
              } catch { reason = "Policy engine denied deposit (undecodable reason)"; }
            } else {
              reason = "Policy engine denied deposit. Your account may need to be whitelisted.";
            }
          }
        }

        console.log(`[PrivacyVault] check-deposit-allowed: token=${cdaToken}, allowed=${allowed}, reason=${reason}`);

        return new Response(JSON.stringify({ success: true, allowed, reason, account: cdaAccountAddr, token: cdaEffective }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "register": {
        // Register a token on the vault contract: register(address token, address policyEngine)
        const { token, policyEngine } = params;
        if (!token) throw new Error("token is required");

        const policyAddr = (policyEngine as string) || "0x0000000000000000000000000000000000000000";

        // selector: keccak256("register(address,address)") first 4 bytes
        const selectorBytes = keccak_256(new TextEncoder().encode("register(address,address)"));
        const selector = bytesToHex(selectorBytes).slice(0, 10);
        const registerData = selector + padTo32(token as string) + padTo32(policyAddr);

        const accountAddr = "0x" + deriveAddress(privateKeyHex).slice(2);
        const [nonce, gasPrice] = await Promise.all([getNonce(accountAddr), getGasPrice()]);
        const bufferedGasPrice = gasPrice * 12n / 10n;

        console.log(`[PrivacyVault] register: token=${token}, policyEngine=${policyAddr}, account=${accountAddr}`);

        const signedTx = signRawTransaction(nonce, bufferedGasPrice, 150000n, VAULT_CONTRACT, 0n, registerData, privateKeyHex);
        const txHash = await sendRawTransaction(signedTx);
        console.log(`[PrivacyVault] register tx sent: ${txHash}`);

        const receipt = await waitForReceipt(txHash);
        const success = (receipt.status as string) === "0x1";

        if (!success) {
          throw new Error(`Registration transaction reverted: ${txHash}. The token may already be registered by another account.`);
        }

        console.log(`[PrivacyVault] register tx mined successfully: ${txHash}`);

        await serviceClient.from("agent_actions_log").insert({
          user_id: userId, action_type: "privacy-register-token",
          params: { token, policyEngine: policyAddr, network: "ethereum-sepolia" },
          status: "executed", result: { tx_hash: txHash },
        });

        return new Response(JSON.stringify({ success: true, tx_hash: txHash, token, policy_engine: policyAddr }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "deploy-policy-engine": {
        // Deploy a new ERC1967Proxy pointing to the existing PolicyEngine implementation
        // with initialize(uint8 defaultResult = 0 = Allowed)
        const EXISTING_PROXY = "0xa4e2ced7d7727078aa5d7bc154a00c1950551b00";
        const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
        const CREATION_TX_HASH = "0x9f93e85c5cb43c3fc38455ea790c1de1f812da4ebfa2c9d8f3295fe247863e98";

        // Step 1: Read the implementation address from the existing proxy
        const storageResp = await fetch(SEPOLIA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getStorageAt", params: [EXISTING_PROXY, IMPL_SLOT, "latest"], id: 1 }),
        });
        const storageData = await storageResp.json();
        if (!storageData.result || storageData.result === "0x" + "0".repeat(64)) {
          throw new Error("Could not read implementation address from existing proxy");
        }
        const implAddress = "0x" + storageData.result.slice(26);
        console.log(`[PrivacyVault] deploy-policy-engine: implementation address = ${implAddress}`);

        // Step 2: Fetch the creation tx to extract the creation bytecode
        const txResp = await fetch(SEPOLIA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionByHash", params: [CREATION_TX_HASH], id: 1 }),
        });
        const txData = await txResp.json();
        if (!txData.result?.input) {
          throw new Error("Could not fetch creation transaction input data");
        }
        const fullInput = txData.result.input as string; // 0x-prefixed hex

        // Step 3: Extract creation bytecode by stripping original constructor args
        // Original constructor: ERC1967Proxy(address implementation, bytes memory _data)
        // _data was initialize(uint8) = 36 bytes
        // ABI encoding: 32 (addr) + 32 (offset=64) + 32 (length=36) + 64 (data padded) = 160 bytes = 320 hex chars
        const CONSTRUCTOR_ARGS_HEX_LEN = 320;
        const creationCode = fullInput.slice(0, fullInput.length - CONSTRUCTOR_ARGS_HEX_LEN);
        console.log(`[PrivacyVault] deploy-policy-engine: creation code length = ${(creationCode.length - 2) / 2} bytes`);

        // Step 4: Build our constructor args
        // initialize(uint8) selector
        const initSelector = bytesToHex(keccak_256(new TextEncoder().encode("initialize(uint8)"))).slice(0, 10);
        // _data = initSelector + abi.encode(uint8(0)) = 4 + 32 = 36 bytes
        const initData = initSelector.slice(2) + encodeUint256(0); // 8 + 64 = 72 hex chars = 36 bytes
        // Pad initData to 64 bytes (next multiple of 32): 36 bytes → 64 bytes = 128 hex chars
        const initDataPadded = initData.padEnd(128, "0");

        // ABI encode (address impl, bytes _data):
        // word 0: impl address padded
        // word 1: offset to bytes = 0x40 (64)
        // word 2: bytes length = 0x24 (36)
        // word 3-4: bytes data padded to 64 bytes
        const constructorArgs = padTo32(implAddress) + encodeUint256(64) + encodeUint256(36) + initDataPadded;

        const deployData = creationCode + constructorArgs;
        console.log(`[PrivacyVault] deploy-policy-engine: total deploy data length = ${(deployData.length - 2) / 2} bytes`);

        // Step 5: Sign and send contract creation transaction
        const accountAddr = "0x" + deriveAddress(privateKeyHex).slice(2);
        const [nonce, gasPrice] = await Promise.all([getNonce(accountAddr), getGasPrice()]);
        const bufferedGasPrice = gasPrice * 12n / 10n;

        // Contract creation: to = "" (empty)
        const signedTx = signRawTransaction(nonce, bufferedGasPrice, 2000000n, "", 0n, deployData, privateKeyHex);
        const txHash = await sendRawTransaction(signedTx);
        console.log(`[PrivacyVault] deploy-policy-engine: tx sent: ${txHash}`);

        const receipt = await waitForReceipt(txHash, 40);
        if ((receipt.status as string) !== "0x1") {
          throw new Error(`Policy engine deployment transaction reverted: ${txHash}`);
        }

        const deployedAddress = receipt.contractAddress as string;
        console.log(`[PrivacyVault] deploy-policy-engine: deployed at ${deployedAddress}, tx: ${txHash}`);

        await serviceClient.from("agent_actions_log").insert({
          user_id: userId, action_type: "deploy-policy-engine",
          params: { implementation: implAddress, network: "ethereum-sepolia" },
          status: "executed", result: { policy_engine: deployedAddress, tx_hash: txHash },
        });

        return new Response(JSON.stringify({
          success: true, policy_engine: deployedAddress, tx_hash: txHash,
          implementation: implAddress, network: "ethereum-sepolia",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "re-register-token": {
        // Register a token with a custom policy engine (for tokens not yet registered)
        const { token: reRegToken, policyEngine: reRegPE } = params;
        if (!reRegToken || !reRegPE) throw new Error("token and policyEngine are required");

        // First check if already registered
        const checkSelector = bytesToHex(keccak_256(new TextEncoder().encode("sPolicyEngines(address)"))).slice(0, 10);
        const checkData = checkSelector + padTo32(reRegToken as string);
        const checkResp = await fetch(SEPOLIA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: VAULT_CONTRACT, data: checkData }, "latest"], id: 1 }),
        });
        const checkResult = await checkResp.json();
        const existingPE = checkResult.result || "0x" + "0".repeat(64);
        const alreadyRegistered = existingPE !== "0x" + "0".repeat(64) && existingPE !== "0x";

        if (alreadyRegistered) {
          const currentPE = "0x" + existingPE.slice(26);
          return new Response(JSON.stringify({
            success: false,
            error: `Token is already registered with policy engine ${currentPE}. Registration is first-come-first-served and cannot be changed.`,
            current_policy_engine: currentPE,
          }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Register with our custom PE
        const regSelector = bytesToHex(keccak_256(new TextEncoder().encode("register(address,address)"))).slice(0, 10);
        const regData = regSelector + padTo32(reRegToken as string) + padTo32(reRegPE as string);

        const accountAddr = "0x" + deriveAddress(privateKeyHex).slice(2);
        const [nonce, gasPrice] = await Promise.all([getNonce(accountAddr), getGasPrice()]);
        const bufferedGasPrice = gasPrice * 12n / 10n;

        console.log(`[PrivacyVault] re-register-token: token=${reRegToken}, policyEngine=${reRegPE}, account=${accountAddr}`);

        const signedTx = signRawTransaction(nonce, bufferedGasPrice, 150000n, VAULT_CONTRACT, 0n, regData, privateKeyHex);
        const txHash = await sendRawTransaction(signedTx);
        console.log(`[PrivacyVault] re-register-token tx sent: ${txHash}`);

        const receipt = await waitForReceipt(txHash);
        if ((receipt.status as string) !== "0x1") {
          throw new Error(`Token registration reverted: ${txHash}. The token may already be registered.`);
        }

        await serviceClient.from("agent_actions_log").insert({
          user_id: userId, action_type: "privacy-register-token-custom-pe",
          params: { token: reRegToken, policyEngine: reRegPE, network: "ethereum-sepolia" },
          status: "executed", result: { tx_hash: txHash },
        });

        return new Response(JSON.stringify({
          success: true, tx_hash: txHash, token: reRegToken, policy_engine: reRegPE,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
