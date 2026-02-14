import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.2/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CDP_API_BASE = 'https://api.cdp.coinbase.com';

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

  const resp = await fetch(url, {
    method,
    headers,
    body: serializedBody,
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error(`[CDP] Error ${resp.status}: ${text}`);
    throw new Error(`CDP API error ${resp.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
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

        if (wallet?.wallet_address && wallet?.is_authenticated) {
          try {
            // Data API for token balances
            const balanceResp = await cdpRequest(
              'GET',
              `/platform/v2/evm/token-balances/base/${wallet.wallet_address}`
            ) as { balances?: Array<{ amount?: { value?: string }; token?: { decimals?: number } }> };

            if (balanceResp?.balances?.length) {
              const raw = balanceResp.balances[0];
              const decimals = raw.token?.decimals ?? 6;
              const amt = Number(raw.amount?.value ?? '0') / Math.pow(10, decimals);
              balance = amt.toFixed(2);
            } else {
              balance = '0.00';
            }
          } catch (err) {
            console.error('[AgentWallet] Balance fetch error:', err);
            balance = null;
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

        // The CDP account id is required for send-transaction
        const cdpAccountId = (wallet as any).cdp_account_id;
        if (!cdpAccountId) throw new Error('CDP account ID not found. Please reconnect your wallet.');

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

          // Server Wallets API — uses cdp_account_id in path
          const txResult = await cdpRequest(
            'POST',
            `/platform/v2/evm/accounts/${wallet.wallet_address}/send/transaction`,
            {
              network: 'base',
              transaction: {
                to: USDC_BASE,
                value: '0x0',
                data: calldata,
              },
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

        const cdpAccountId = (wallet as any).cdp_account_id;
        if (!cdpAccountId) throw new Error('CDP account ID not found. Please reconnect your wallet.');

        const fromAddress = TOKEN_MAP[from_token] || TOKEN_MAP[from_token.toUpperCase()];
        const toAddress = TOKEN_MAP[to_token] || TOKEN_MAP[to_token.toUpperCase()];

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

          // Trade API
          const swapResult = await cdpRequest('POST', '/platform/v2/evm/swaps', {
            network: 'base',
            fromToken: fromAddress,
            toToken: toAddress,
            fromAmount: rawAmount.toString(),
            takerAddress: wallet.wallet_address,
          }) as { transaction?: { to?: string; data?: string; value?: string }; swapId?: string };

          let txHash: string | null = null;
          if (swapResult?.transaction) {
            // Server Wallets API — uses cdp_account_id
            const txResult = await cdpRequest(
              'POST',
              `/platform/v2/evm/accounts/${wallet.wallet_address}/send/transaction`,
              {
                network: 'base',
                transaction: swapResult.transaction,
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
