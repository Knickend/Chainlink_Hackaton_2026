import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.2/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CDP_API_BASE = 'https://api.cdp.coinbase.com';

// --- Minimal RLP encoder for EIP-1559 transactions ---
function rlpEncodeLength(len: number, offset: number): Uint8Array {
  if (len < 56) return new Uint8Array([len + offset]);
  const hexLen = len.toString(16);
  const lenBytes = hexToBytes(hexLen.length % 2 ? '0' + hexLen : hexLen);
  return new Uint8Array([offset + 55 + lenBytes.length, ...lenBytes]);
}

function rlpEncode(input: Uint8Array | Uint8Array[]): Uint8Array {
  if (input instanceof Uint8Array) {
    if (input.length === 1 && input[0] < 0x80) return input;
    return concat(rlpEncodeLength(input.length, 0x80), input);
  }
  const encoded = input.map(rlpEncode);
  const body = concat(...encoded);
  return concat(rlpEncodeLength(body.length, 0xc0), body);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  const padded = h.length % 2 ? '0' + h : h;
  const bytes = new Uint8Array(padded.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Encode an unsigned EIP-1559 tx as 0x02 || RLP([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList]).
 *  CDP fills in nonce, gas fields — we pass them as empty so CDP estimates. */
function encodeEip1559Tx(opts: { chainId: number; to: string; value: string; data: string }): string {
  const chainIdBytes = opts.chainId === 0 ? new Uint8Array([]) : hexToBytes(opts.chainId.toString(16));
  const toBytes = hexToBytes(opts.to);
  const valueBytes = opts.value === '0' || opts.value === '0x0' || opts.value === '0x' || !opts.value
    ? new Uint8Array([])
    : hexToBytes(opts.value.startsWith('0x') ? opts.value.slice(2) : opts.value);
  const dataBytes = !opts.data || opts.data === '0x' ? new Uint8Array([]) : hexToBytes(opts.data);
  const empty = new Uint8Array([]);

  // [chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList]
  // CDP fills nonce + gas, so we pass empty for those. accessList = empty array → rlpEncode([])
  const fields: Uint8Array[] = [chainIdBytes, empty, empty, empty, empty, toBytes, valueBytes, dataBytes];

  // Encode fields, then append encoded empty accessList
  const encodedFields = fields.map(rlpEncode);
  const emptyAccessList = rlpEncode([]); // 0xc0
  const allEncoded = [...encodedFields, emptyAccessList];
  const body = concat(...allEncoded);
  const listEncoded = concat(rlpEncodeLength(body.length, 0xc0), body);

  // Prepend 0x02 type byte
  const typed = new Uint8Array([0x02, ...listEncoded]);
  return bytesToHex(typed);
}

// --- CDP JWT Authentication (Ed25519) ---

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeString(str: string): string {
  return base64UrlEncode(new TextEncoder().encode(str));
}

// PKCS8 prefix for Ed25519 (ASN.1 wrapper for a 32-byte seed)
const ED25519_PKCS8_PREFIX = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
  0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

function decodeEd25519PrivateKey(pemOrBase64: string): ArrayBuffer {
  const cleaned = pemOrBase64
    .replace(/-----BEGIN[^-]*-----/g, '')
    .replace(/-----END[^-]*-----/g, '')
    .replace(/\s/g, '');

  console.log(`[CDP Key] Cleaned base64 length: ${cleaned.length}`);

  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  console.log(`[CDP Key] Decoded byte array length: ${bytes.length}`);
  console.log(`[CDP Key] First 4 bytes: ${Array.from(bytes.slice(0, 4)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);

  if (bytes.length === 48) {
    console.log(`[CDP Key] Path: 48-byte PKCS8 (direct use)`);
    return bytes.buffer;
  }
  if (bytes.length === 32) {
    console.log(`[CDP Key] Path: 32-byte raw seed (wrapping in PKCS8)`);
    const pkcs8 = new Uint8Array(48);
    pkcs8.set(ED25519_PKCS8_PREFIX, 0);
    pkcs8.set(bytes, 16);
    return pkcs8.buffer;
  }
  if (bytes.length === 64) {
    console.log(`[CDP Key] Path: 64-byte keypair (first 32 = private seed, last 32 = public key)`);
    const seed = bytes.slice(0, 32);
    const pkcs8 = new Uint8Array(48);
    pkcs8.set(ED25519_PKCS8_PREFIX, 0);
    pkcs8.set(seed, 16);
    return pkcs8.buffer;
  }
  if (bytes.length > 32) {
    console.log(`[CDP Key] Path: ${bytes.length}-byte key (extracting first 32 bytes as seed)`);
    const seed = bytes.slice(0, 32);
    const pkcs8 = new Uint8Array(48);
    pkcs8.set(ED25519_PKCS8_PREFIX, 0);
    pkcs8.set(seed, 16);
    return pkcs8.buffer;
  }
  throw new Error(`Unexpected key length: ${bytes.length}`);
}

async function generateCdpJwt(
  apiKeyId: string,
  apiKeySecret: string,
  requestMethod: string,
  requestPath: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const header = {
    alg: 'EdDSA',
    typ: 'JWT',
    kid: apiKeyId,
    nonce,
  };

  const uri = `${requestMethod} api.cdp.coinbase.com${requestPath}`;

  const payload = {
    sub: apiKeyId,
    iss: 'cdp',
    aud: ['cdp_service'],
    nbf: now,
    exp: now + 120,
    uri,
  };

  console.log(`[CDP JWT] Full payload:`, JSON.stringify(payload));

  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const pkcs8Key = decodeEd25519PrivateKey(apiKeySecret);
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Key,
      { name: 'Ed25519' },
      false,
      ['sign'],
    );
    console.log(`[CDP Key] importKey SUCCESS — algorithm: ${JSON.stringify(cryptoKey.algorithm)}, type: ${cryptoKey.type}`);
  } catch (importErr) {
    console.error(`[CDP Key] importKey FAILED:`, importErr);
    throw importErr;
  }

  const signature = await crypto.subtle.sign(
    'Ed25519',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

async function cdpRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const apiKeyId = Deno.env.get('CDP_API_KEY_ID');
  const apiKeySecret = Deno.env.get('CDP_API_KEY_SECRET');
  const walletSecret = Deno.env.get('CDP_WALLET_SECRET');
  if (!apiKeyId || !apiKeySecret) throw new Error('CDP API keys not configured');
  if (!walletSecret) throw new Error('CDP_WALLET_SECRET not configured');

  console.log(`[CDP Request] API Key ID prefix: ${apiKeyId.slice(0, 8)}...`);

  const fullPath = path;

  // Pre-serialize body once so the exact same string is used for both
  // the reqHash in X-Wallet-Auth AND the HTTP request body.
  const serializedBody = body ? JSON.stringify(sortObjectKeys(body)) : undefined;

  const jwt = await generateCdpJwt(apiKeyId, apiKeySecret, method, fullPath);

  const upperMethod = method.toUpperCase();
  const needsWalletAuth = upperMethod === 'POST' || upperMethod === 'DELETE';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`,
  };

  if (needsWalletAuth) {
    const walletAuthJwt = await generateWalletAuthJwt(
      walletSecret, upperMethod, fullPath, serializedBody
    );
    if (walletAuthJwt && walletAuthJwt.trim().length > 0) {
      headers['X-Wallet-Auth'] = walletAuthJwt;
      console.log('[CDP] X-Wallet-Auth attached');
    } else {
      console.error('[CDP] WARNING: walletAuthJwt generation returned empty!');
      throw new Error('Failed to generate X-Wallet-Auth JWT');
    }
  } else {
    console.log('[CDP] GET request, no X-Wallet-Auth needed');
  }

  const url = `${CDP_API_BASE}${fullPath}`;
  console.log(`[CDP CALL] ${method} ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method,
      headers,
      body: serializedBody,
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
      throw new Error(`CDP API timeout after 30s: ${method} ${path}`);
    }
    throw fetchErr;
  }
  clearTimeout(timeout);

  const contentType = resp.headers.get('content-type') || '';
  const text = await resp.text();

  if (!contentType.includes('application/json') && (text.trim().startsWith('<!') || text.includes('<html'))) {
    console.error(`[CDP] HTML response (status ${resp.status}) for ${method} ${path}`);
    throw new Error(`CDP API returned HTML instead of JSON (status ${resp.status}). This usually indicates a server error or rate limiting.`);
  }

  if (!resp.ok) {
    console.error(`[CDP] Error ${resp.status}: ${text.substring(0, 500)}`);
    throw new Error(`CDP API error ${resp.status}: ${text.substring(0, 500)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// --- Auto-heal: resolve cdp_account_id if missing ---
async function resolveCdpAccountId(
  wallet: Record<string, any>,
  userId: string,
  serviceClient: any,
): Promise<string> {
  if (wallet.cdp_account_id) return wallet.cdp_account_id;
  if (!wallet.wallet_address) throw new Error('No wallet address found. Please reconnect your wallet.');

  console.log(`[AgentWallet] Auto-healing cdp_account_id for ${wallet.wallet_address}`);
  const listResp = await cdpRequest('GET', '/platform/v2/evm/accounts') as { accounts?: Array<Record<string, any>> };
  const accounts = listResp?.accounts || [];
  console.log(`[AgentWallet] CDP accounts list (${accounts.length}):`, JSON.stringify(accounts[0] || {}, null, 0));

  // CDP v2 uses "name" as the account identifier, not "id"
  let match = accounts.find(
    (a: any) => a.address?.toLowerCase() === wallet.wallet_address?.toLowerCase()
  );
  if (!match) {
    const expectedName = `incontrol-${userId}`;
    match = accounts.find((a: any) => a.name === expectedName);
  }
  const accountId = match?.name || match?.id;
  if (!accountId) {
    console.error('[AgentWallet] Could not find CDP account. Wallet address:', wallet.wallet_address);
    throw new Error('CDP account ID not found. Please reconnect your wallet.');
  }

  await serviceClient.from('agent_wallets').update({ cdp_account_id: accountId }).eq('user_id', userId);
  wallet.cdp_account_id = accountId;
  console.log(`[AgentWallet] Auto-healed cdp_account_id: ${accountId}`);
  return accountId;
}

// --- Wallet Auth JWT (ES256 / ECDSA P-256) ---

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>).sort().reduce((acc, key) => {
      acc[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
      return acc;
    }, {} as Record<string, unknown>);
  }
  return obj;
}

// decodeEcdsaPrivateKey removed — using jose's importPKCS8 instead

async function generateWalletAuthJwt(
  walletSecret: string,
  requestMethod: string,
  requestPath: string,
  serializedBody?: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jti = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const uri = `${requestMethod} api.cdp.coinbase.com${requestPath}`;

  const payload: Record<string, unknown> = {
    iat: now,
    nbf: now,
    exp: now + 120,
    jti,
    uris: [uri],
  };

  // Body is already pre-serialized (sorted keys) by cdpRequest
  if (serializedBody) {
    const bodyBytes = new TextEncoder().encode(serializedBody);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bodyBytes);
    const hashArray = new Uint8Array(hashBuffer);
    payload.reqHash = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  console.log(`[WalletAuth] Secret prefix: ${walletSecret.slice(0, 8)}...`);
  console.log(`[WalletAuth] Secret input length: ${walletSecret.length} chars`);
  console.log(`[WalletAuth] JWT payload:`, JSON.stringify(payload));

  // Use jose's importPKCS8 for reliable PEM-to-CryptoKey conversion
  const cleanedSecret = walletSecret
    .replace(/-----BEGIN[^-]*-----/g, '')
    .replace(/-----END[^-]*-----/g, '')
    .replace(/\s/g, '');
  const pem = `-----BEGIN PRIVATE KEY-----\n${cleanedSecret}\n-----END PRIVATE KEY-----`;

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await importPKCS8(pem, 'ES256');
    console.log(`[WalletAuth] importPKCS8 SUCCESS`);
  } catch (importErr) {
    console.error(`[WalletAuth] importPKCS8 FAILED:`, importErr);
    throw new Error(`Failed to import Wallet Secret via importPKCS8: ${importErr}`);
  }

  // Use jose SignJWT — matches CDP's official reference implementation
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .sign(cryptoKey);

  console.log(`[WalletAuth] jose JWT generated, length: ${jwt.length}`);

  // Decode and log JWT parts for diagnostics
  const [headerB64, payloadB64] = jwt.split('.');
  const decodedHeader = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
  const decodedPayload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  console.log('[WalletAuth] Decoded JWT header:', JSON.stringify(decodedHeader));
  console.log('[WalletAuth] Decoded JWT payload:', JSON.stringify(decodedPayload));

  return jwt;
}

// --- Token Addresses on Base ---
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_BASE = '0x4200000000000000000000000000000000000006';
const ETH_BASE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const TOKEN_MAP: Record<string, string> = {
  'USDC': USDC_BASE,
  'usdc': USDC_BASE,
  'WETH': WETH_BASE,
  'weth': WETH_BASE,
  'ETH': ETH_BASE,
  'eth': ETH_BASE,
};

// For swaps, CDP requires WETH address instead of native ETH placeholder
const SWAP_TOKEN_MAP: Record<string, string> = {
  'USDC': USDC_BASE,
  'usdc': USDC_BASE,
  'WETH': WETH_BASE,
  'weth': WETH_BASE,
  'ETH': WETH_BASE,  // Swap API needs WETH, not native ETH address
  'eth': WETH_BASE,
};

// --- Main Handler ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: sub } = await userClient
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub || sub.tier !== 'pro') {
      return new Response(
        JSON.stringify({ error: 'Pro subscription required for Agent features' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();
    console.log(`[AgentWallet] Action: ${action}, User: ${user.id}`);

    switch (action) {
      // ===== WALLET CREATION =====
      case 'auth-start': {
        const { email } = params;
        if (!email) throw new Error('Email is required');

        const accountName = `incontrol-${user.id.slice(0, 8)}`;

        // Always POST -- CDP uses `name` as idempotency key and returns
        // the existing account if one with that name already exists.
        console.log(`[AgentWallet] Creating/getting CDP account: ${accountName}`);
        const created = await cdpRequest(
          'POST',
          '/platform/v2/evm/accounts',
          { name: accountName },
        ) as { address?: string; id?: string };

        if (!created?.address) throw new Error('Failed to create CDP wallet account');

        // Persist address AND the CDP account id (needed for send-transaction paths)
        await userClient.from('agent_wallets').upsert({
          user_id: user.id,
          wallet_email: email,
          wallet_address: created.address,
          cdp_account_id: created.id ?? null,
          is_authenticated: true,
        }, { onConflict: 'user_id' });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Wallet connected successfully',
            wallet_address: created.address,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'auth-verify': {
        return new Response(
          JSON.stringify({ success: true, message: 'Wallet already authenticated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        await userClient
          .from('agent_wallets')
          .update({ is_authenticated: false })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ success: true, message: 'Wallet disconnected' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ===== STATUS & BALANCE =====
      case 'status': {
        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        let balance: string | null = null;
        let ethBalance: string | null = null;

        // Auto-heal: if cdp_account_id is missing, re-fetch it from CDP
        if (wallet?.wallet_address && wallet?.is_authenticated && !wallet?.cdp_account_id) {
          try {
            await resolveCdpAccountId(wallet as any, user.id, serviceClient);
          } catch (e) {
            console.error('[AgentWallet] Failed to backfill cdp_account_id:', e);
          }
        }

        if (wallet?.wallet_address && wallet?.is_authenticated) {
          try {
            const balanceResp = await cdpRequest(
              'GET',
              `/platform/v2/evm/token-balances/base/${wallet.wallet_address}`
            ) as Record<string, unknown>;

            console.log('[AgentWallet] Raw balance response:', JSON.stringify(balanceResp).slice(0, 2000));

            const tokenList = (balanceResp?.token_balances ?? balanceResp?.balances ?? []) as Array<Record<string, any>>;

            // Helper to parse a token amount from CDP response
            const parseTokenAmount = (entry: Record<string, any>, defaultDecimals: number): number => {
              const amountObj = entry.amount;
              const tokenObj = entry.token;
              if (typeof amountObj === 'string') return parseFloat(amountObj);
              if (typeof amountObj === 'number') return amountObj;
              if (amountObj?.amount !== undefined) {
                const decimals = amountObj?.decimals ?? tokenObj?.decimals ?? defaultDecimals;
                return Number(amountObj.amount) / Math.pow(10, decimals);
              }
              if (amountObj?.value !== undefined) {
                const decimals = amountObj?.decimals ?? tokenObj?.decimals ?? defaultDecimals;
                return Number(amountObj.value) / Math.pow(10, decimals);
              }
              return 0;
            };

            // Find USDC
            const usdcEntry = tokenList.find((t: any) => {
              const symbol = (t?.token?.symbol || t?.symbol || '').toUpperCase();
              const addr = (t?.token?.contractAddress || t?.token?.contract_address || t?.contract_address || '').toLowerCase();
              return symbol === 'USDC' || addr === USDC_BASE.toLowerCase();
            });
            balance = usdcEntry ? parseTokenAmount(usdcEntry, 6).toFixed(2) : '0.00';

            // Find ETH (native token — symbol ETH, or no contract address)
            const ethEntry = tokenList.find((t: any) => {
              const symbol = (t?.token?.symbol || t?.symbol || '').toUpperCase();
              const addr = (t?.token?.contractAddress || t?.token?.contract_address || t?.contract_address || '').toLowerCase();
              return symbol === 'ETH' || addr === ETH_BASE.toLowerCase() || addr === '';
            });
            ethBalance = ethEntry ? parseTokenAmount(ethEntry, 18).toFixed(6) : '0.000000';

            console.log(`[AgentWallet] Parsed balances — USDC: ${balance}, ETH: ${ethBalance}`);
          } catch (err) {
            console.error('[AgentWallet] Balance fetch error:', err);
          }
        }

        return new Response(
          JSON.stringify({
            connected: wallet?.is_authenticated ?? false,
            wallet_address: wallet?.wallet_address ?? null,
            wallet_email: wallet?.wallet_email ?? null,
            enabled_skills: wallet?.enabled_skills ?? [],
            spending_limit_per_tx: wallet?.spending_limit_per_tx ?? 50,
            spending_limit_daily: wallet?.spending_limit_daily ?? 200,
            daily_spent: wallet?.daily_spent ?? 0,
            balance,
            eth_balance: ethBalance,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ===== SKILL MANAGEMENT =====
      case 'update-skills': {
        const { enabled_skills } = params;
        if (!Array.isArray(enabled_skills)) throw new Error('enabled_skills must be an array');

        const validSkills = ['send-usdc', 'trade', 'fund'];
        const filtered = enabled_skills.filter((s: string) => validSkills.includes(s));

        await userClient
          .from('agent_wallets')
          .update({ enabled_skills: filtered })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ success: true, enabled_skills: filtered }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-limits': {
        const { spending_limit_per_tx, spending_limit_daily } = params;
        const updates: Record<string, number> = {};
        if (spending_limit_per_tx !== undefined) updates.spending_limit_per_tx = Number(spending_limit_per_tx);
        if (spending_limit_daily !== undefined) updates.spending_limit_daily = Number(spending_limit_daily);

        await userClient
          .from('agent_wallets')
          .update(updates)
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ success: true, ...updates }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ===== DEFI ACTIONS =====
      case 'send': {
        const { amount, recipient } = params;
        if (!amount || !recipient) throw new Error('Amount and recipient are required');

        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!wallet?.is_authenticated) throw new Error('Wallet not authenticated');
        if (!wallet.enabled_skills?.includes('send-usdc')) throw new Error('Send USDC skill is disabled');
        if (amount > wallet.spending_limit_per_tx) throw new Error(`Amount exceeds per-transaction limit of $${wallet.spending_limit_per_tx}`);

        // Auto-heal CDP account ID if missing
        const cdpAccountId = await resolveCdpAccountId(wallet as any, user.id, serviceClient);

        const now = new Date();
        let dailySpent = wallet.daily_spent || 0;
        if (wallet.daily_reset_at && new Date(wallet.daily_reset_at) < new Date(now.toISOString().split('T')[0])) {
          dailySpent = 0;
        }
        if (dailySpent + amount > wallet.spending_limit_daily) {
          throw new Error(`Amount would exceed daily limit of $${wallet.spending_limit_daily}`);
        }

        const { data: logEntry } = await serviceClient
          .from('agent_actions_log')
          .insert({
            user_id: user.id,
            action_type: 'send',
            params: { amount, recipient, token: 'USDC', network: 'base' },
            status: 'pending',
          })
          .select()
          .single();

        try {
          const usdcAmount = BigInt(Math.round(amount * 1_000_000));
          const recipientPadded = recipient.replace('0x', '').padStart(64, '0');
          const amountHex = usdcAmount.toString(16).padStart(64, '0');
          const calldata = `0xa9059cbb${recipientPadded}${amountHex}`;

          // Encode as EIP-1559 RLP string — Base chainId = 8453
          const rlpTx = encodeEip1559Tx({ chainId: 8453, to: USDC_BASE, value: '0', data: calldata });
          console.log('[AgentWallet] Send TX RLP (first 80 chars):', rlpTx.slice(0, 80));

          const txResult = await cdpRequest(
            'POST',
            `/platform/v2/evm/accounts/${wallet.wallet_address}/send/transaction`,
            {
              network: 'base',
              transaction: rlpTx,
            }
          ) as { transactionHash?: string };

          await serviceClient
            .from('agent_actions_log')
            .update({ status: 'executed', result: txResult })
            .eq('id', logEntry?.id);

          await userClient
            .from('agent_wallets')
            .update({
              daily_spent: dailySpent + amount,
              daily_reset_at: new Date(now.toISOString().split('T')[0] + 'T00:00:00Z').toISOString(),
            })
            .eq('user_id', user.id);

          return new Response(
            JSON.stringify({
              success: true,
              message: `Sent ${amount} USDC to ${recipient} on Base`,
              tx_hash: txResult?.transactionHash ?? null,
              log_id: logEntry?.id,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (err) {
          await serviceClient
            .from('agent_actions_log')
            .update({
              status: 'failed',
              error_message: err instanceof Error ? err.message : 'Unknown error',
            })
            .eq('id', logEntry?.id);
          throw err;
        }
      }

      case 'trade-quote': {
        const { amount, from_token, to_token } = params;
        if (!amount || !from_token || !to_token) throw new Error('Amount, from_token and to_token are required');

        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!wallet?.is_authenticated) throw new Error('Wallet not authenticated');

        const fromAddress = SWAP_TOKEN_MAP[from_token] || SWAP_TOKEN_MAP[from_token.toUpperCase()];
        const toAddress = SWAP_TOKEN_MAP[to_token] || SWAP_TOKEN_MAP[to_token.toUpperCase()];
        if (!fromAddress || !toAddress) throw new Error(`Unsupported token pair`);

        const decimals = from_token.toUpperCase() === 'USDC' ? 6 : 18;
        const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));

        const queryParams = new URLSearchParams({
          network: 'base',
          fromToken: fromAddress,
          toToken: toAddress,
          fromAmount: rawAmount.toString(),
          taker: wallet.wallet_address!,
          slippageBps: '100',  // query param — string is fine for GET
        });

        console.log(`[AgentWallet] Price quote params:`, queryParams.toString());
        const quoteResult = await cdpRequest('GET', `/platform/v2/evm/swaps/quote?${queryParams.toString()}`) as Record<string, any>;

        const toDecimals = to_token.toUpperCase() === 'USDC' ? 6 : 18;
        const toAmountRaw = quoteResult?.toAmount || '0';
        const toAmountNum = Number(BigInt(toAmountRaw)) / Math.pow(10, toDecimals);

        return new Response(
          JSON.stringify({
            success: true,
            from_amount: amount,
            from_token,
            to_amount: toAmountNum,
            to_token,
            gas: quoteResult?.gas,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'trade': {
        const { amount, from_token, to_token } = params;
        if (!amount || !from_token || !to_token) throw new Error('Amount, from_token and to_token are required');

        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!wallet?.is_authenticated) throw new Error('Wallet not authenticated');
        if (!wallet.enabled_skills?.includes('trade')) throw new Error('Trade skill is disabled');
        if (amount > wallet.spending_limit_per_tx) throw new Error(`Amount exceeds per-transaction limit of $${wallet.spending_limit_per_tx}`);

        const cdpAccountId = await resolveCdpAccountId(wallet as any, user.id, serviceClient);

        const fromAddress = SWAP_TOKEN_MAP[from_token] || SWAP_TOKEN_MAP[from_token.toUpperCase()];
        const toAddress = SWAP_TOKEN_MAP[to_token] || SWAP_TOKEN_MAP[to_token.toUpperCase()];

        if (!fromAddress) throw new Error(`Unsupported token: ${from_token}. Supported: USDC, ETH, WETH`);
        if (!toAddress) throw new Error(`Unsupported token: ${to_token}. Supported: USDC, ETH, WETH`);

        const { data: logEntry } = await serviceClient
          .from('agent_actions_log')
          .insert({
            user_id: user.id,
            action_type: 'trade',
            params: { amount, from_token, to_token, network: 'base' },
            status: 'pending',
          })
          .select()
          .single();

        try {
          const decimals = from_token.toUpperCase() === 'USDC' ? 6 : 18;
          const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));

          // Trade API — slippageBps must be string per CDP docs
          const swapBody = {
            fromToken: fromAddress,
            toToken: toAddress,
            fromAmount: rawAmount.toString(),
            taker: wallet.wallet_address,
            slippageBps: 100,
            network: 'base',
          };
          console.log(`[AgentWallet] === SWAP REQUEST ===`);
          console.log(`[AgentWallet] POST /platform/v2/evm/swaps`);
          console.log(`[AgentWallet] Body:`, JSON.stringify(swapBody, null, 2));
          console.log(`[AgentWallet] fromToken: ${fromAddress} (${from_token})`);
          console.log(`[AgentWallet] toToken: ${toAddress} (${to_token})`);
          console.log(`[AgentWallet] fromAmount: ${rawAmount.toString()} (raw), ${amount} (human)`);
          console.log(`[AgentWallet] taker: ${wallet.wallet_address}`);
          
          const swapStartTime = Date.now();
          let swapResult: { transaction?: { to?: string; data?: string; value?: string }; swapId?: string; permit?: any };
          try {
            swapResult = await cdpRequest('POST', '/platform/v2/evm/swaps', swapBody) as any;
            console.log(`[AgentWallet] === SWAP RESPONSE (${Date.now() - swapStartTime}ms) ===`);
            console.log(`[AgentWallet] Response:`, JSON.stringify(swapResult).slice(0, 500));
          } catch (swapErr) {
            console.error(`[AgentWallet] === SWAP FAILED (${Date.now() - swapStartTime}ms) ===`);
            console.error(`[AgentWallet] Error:`, swapErr instanceof Error ? swapErr.message : swapErr);
            throw swapErr;
          }

          let txHash: string | null = null;
          if (swapResult?.transaction) {
            const swapTx = swapResult.transaction;
            const rlpTx = encodeEip1559Tx({
              chainId: 8453,
              to: swapTx.to || '',
              value: swapTx.value || '0',
              data: swapTx.data || '0x',
            });
            const txResult = await cdpRequest(
              'POST',
              `/platform/v2/evm/accounts/${wallet.wallet_address}/send/transaction`,
              {
                network: 'base',
                transaction: rlpTx,
              }
            ) as { transactionHash?: string };
            txHash = txResult?.transactionHash ?? null;
          }

          await serviceClient
            .from('agent_actions_log')
            .update({ status: 'executed', result: { swapResult, txHash } })
            .eq('id', logEntry?.id);

          return new Response(
            JSON.stringify({
              success: true,
              message: `Swapped ${amount} ${from_token} for ${to_token} on Base`,
              tx_hash: txHash,
              log_id: logEntry?.id,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (err) {
          await serviceClient
            .from('agent_actions_log')
            .update({
              status: 'failed',
              error_message: err instanceof Error ? err.message : 'Unknown error',
            })
            .eq('id', logEntry?.id);
          throw err;
        }
      }

      case 'fund': {
        const amount = Number(params.amount);
        if (!amount || isNaN(amount)) throw new Error('Valid amount is required');

        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!wallet?.is_authenticated) throw new Error('Wallet not authenticated');
        if (!wallet.enabled_skills?.includes('fund')) throw new Error('Fund wallet skill is disabled');

        const { data: logEntry } = await serviceClient
          .from('agent_actions_log')
          .insert({
            user_id: user.id,
            action_type: 'fund',
            params: { amount, method: 'coinbase-onramp', wallet_address: wallet.wallet_address },
            status: 'pending',
          })
          .select()
          .single();

        try {
          // Platform API for onramp
          console.log('[AgentWallet] Fund amount:', params.amount, '-> paymentAmount (as number):', amount);
          const onrampResult = await cdpRequest('POST', '/platform/v2/onramp/sessions', {
            purchaseCurrency: 'USDC',
            destinationNetwork: 'base',
            destinationAddress: wallet.wallet_address,
            paymentAmount: amount.toFixed(2),
            paymentCurrency: 'USD',
            paymentMethod: 'CARD',
          });

          console.log('[AgentWallet] Onramp raw response:', JSON.stringify(onrampResult));

          // CDP returns { session: { onrampUrl, ... } }
          const session = (onrampResult as any)?.session;
          const onrampUrl = session?.onrampUrl
            || (onrampResult as any)?.sessionUrl
            || (onrampResult as any)?.redirect_url
            || (typeof onrampResult === 'string' ? onrampResult : null);

          const sessionId = session?.id
            || (onrampResult as any)?.sessionId
            || (onrampResult as any)?.id;

          await serviceClient
            .from('agent_actions_log')
            .update({ status: 'executed', result: { sessionId, onramp_url: onrampUrl } })
            .eq('id', logEntry?.id);

          return new Response(
            JSON.stringify({
              success: true,
              message: `Onramp session created for $${amount}`,
              onramp_url: onrampUrl ?? null,
              log_id: logEntry?.id,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (err) {
          await serviceClient
            .from('agent_actions_log')
            .update({
              status: 'failed',
              error_message: err instanceof Error ? err.message : 'Unknown error',
            })
            .eq('id', logEntry?.id);
          throw err;
        }
      }

      // ===== ACTIVITY LOG =====
      case 'get-logs': {
        const { data: logs } = await userClient
          .from('agent_actions_log')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        return new Response(
          JSON.stringify({ logs: logs || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[AgentWallet] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
