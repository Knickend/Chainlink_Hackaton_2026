import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CDP_API_BASE = 'https://api.cdp.coinbase.com/platform/v2';

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

/**
 * Decode a PEM-encoded Ed25519 private key to raw 32-byte seed.
 * CDP keys come as PKCS8-wrapped Ed25519 keys (48 bytes total, last 32 are the seed).
 */
function decodeEd25519PrivateKey(pemOrBase64: string): Uint8Array {
  // Strip PEM headers if present
  const cleaned = pemOrBase64
    .replace(/-----BEGIN (EC |PRIVATE )?PRIVATE KEY-----/g, '')
    .replace(/-----END (EC |PRIVATE )?PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // PKCS8-wrapped Ed25519 key is 48 bytes; raw seed is last 32 bytes
  if (bytes.length === 48) {
    return bytes.slice(16);
  }
  // If already 32 bytes, use as-is
  if (bytes.length === 32) {
    return bytes;
  }
  // For longer DER-encoded keys, extract the last 32 bytes
  if (bytes.length > 32) {
    return bytes.slice(bytes.length - 32);
  }
  throw new Error(`Unexpected key length: ${bytes.length}`);
}

/**
 * Generate a CDP JWT for authenticating REST API requests.
 * Uses Ed25519 (EdDSA) signing via Web Crypto API.
 */
async function generateCdpJwt(
  apiKeyId: string,
  apiKeySecret: string,
  requestMethod: string,
  requestPath: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();

  const header = {
    alg: 'EdDSA',
    typ: 'JWT',
    kid: apiKeyId,
    nonce,
  };

  const uri = `${requestMethod.toUpperCase()} api.cdp.coinbase.com${requestPath}`;

  const payload = {
    sub: apiKeyId,
    iss: 'cdp',
    aud: ['cdp_service'],
    nbf: now,
    exp: now + 120, // 2 minute expiry
    uris: [uri],
  };

  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the Ed25519 private key
  const rawKey = decodeEd25519PrivateKey(apiKeySecret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'Ed25519' },
    false,
    ['sign'],
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'Ed25519',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

/**
 * Make an authenticated request to the CDP API.
 */
async function cdpRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const apiKeyId = Deno.env.get('CDP_API_KEY_ID');
  const apiKeySecret = Deno.env.get('CDP_API_KEY_SECRET');
  if (!apiKeyId || !apiKeySecret) throw new Error('CDP API keys not configured');

  const jwt = await generateCdpJwt(apiKeyId, apiKeySecret, method, `/platform/v2${path}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`,
  };

  const url = `${CDP_API_BASE}${path}`;
  console.log(`[CDP] ${method} ${url}`);

  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
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

// --- USDC Contract Address on Base ---
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
    // Authenticate user via Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Check Pro subscription
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
      // ===== WALLET CREATION (replaces email OTP — server-managed CDP account) =====
      case 'auth-start': {
        const { email } = params;
        if (!email) throw new Error('Email is required');

        // Create a unique account name for this user
        const accountName = `incontrol-${user.id.slice(0, 8)}`;

        // Create (or get existing) CDP EVM account on Base
        let account: { address?: string } | null = null;

        try {
          // Try to get existing account by name
          const existing = await cdpRequest('GET', `/evm/accounts/${accountName}`) as { address?: string };
          account = existing;
          console.log(`[AgentWallet] Found existing CDP account: ${existing.address}`);
        } catch {
          // Account doesn't exist, create a new one
          console.log(`[AgentWallet] Creating new CDP account: ${accountName}`);
          const created = await cdpRequest('POST', '/evm/accounts', { name: accountName }) as { address?: string };
          account = created;
          console.log(`[AgentWallet] Created CDP account: ${created.address}`);
        }

        if (!account?.address) throw new Error('Failed to create CDP wallet account');

        // Upsert wallet record with real address
        await userClient.from('agent_wallets').upsert({
          user_id: user.id,
          wallet_email: email,
          wallet_address: account.address,
          is_authenticated: true, // Server-managed wallets are immediately active
        }, { onConflict: 'user_id' });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Wallet connected successfully',
            wallet_address: account.address,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'auth-verify': {
        // With server-managed CDP wallets, auth-verify is a no-op (wallet is created on auth-start)
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
            // Fetch USDC balance from CDP
            const balanceResp = await cdpRequest(
              'GET',
              `/evm/token-balances/${wallet.wallet_address}?network=base&tokens=${USDC_BASE}`
            ) as { balances?: Array<{ amount?: string; decimals?: number }> };

            if (balanceResp?.balances?.length) {
              const raw = balanceResp.balances[0];
              const decimals = raw.decimals ?? 6;
              const amt = Number(raw.amount ?? '0') / Math.pow(10, decimals);
              balance = amt.toFixed(2);
            } else {
              balance = '0.00';
            }
          } catch (err) {
            console.error('[AgentWallet] Balance fetch error:', err);
            balance = null; // Will show as "Unable to fetch" in UI
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

        // Validate limits
        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!wallet?.is_authenticated) throw new Error('Wallet not authenticated');
        if (!wallet.enabled_skills?.includes('send-usdc')) throw new Error('Send USDC skill is disabled');
        if (amount > wallet.spending_limit_per_tx) throw new Error(`Amount exceeds per-transaction limit of $${wallet.spending_limit_per_tx}`);

        // Check daily limit
        const now = new Date();
        let dailySpent = wallet.daily_spent || 0;
        if (wallet.daily_reset_at && new Date(wallet.daily_reset_at) < new Date(now.toISOString().split('T')[0])) {
          dailySpent = 0;
        }
        if (dailySpent + amount > wallet.spending_limit_daily) {
          throw new Error(`Amount would exceed daily limit of $${wallet.spending_limit_daily}`);
        }

        // Log the action as pending
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
          // USDC has 6 decimals; convert dollar amount to smallest unit
          const usdcAmount = BigInt(Math.round(amount * 1_000_000));

          // Build ERC-20 transfer calldata
          // transfer(address,uint256) selector = 0xa9059cbb
          const recipientPadded = recipient.replace('0x', '').padStart(64, '0');
          const amountHex = usdcAmount.toString(16).padStart(64, '0');
          const calldata = `0xa9059cbb${recipientPadded}${amountHex}`;

          // Send transaction via CDP Wallet API v2
          const txResult = await cdpRequest(
            'POST',
            `/evm/accounts/${wallet.wallet_address}/send/transaction`,
            {
              network: 'base',
              transaction: {
                to: USDC_BASE,
                value: '0x0',
                data: calldata,
              },
            }
          ) as { transactionHash?: string };

          // Update log with success
          await serviceClient
            .from('agent_actions_log')
            .update({
              status: 'executed',
              result: txResult,
            })
            .eq('id', logEntry?.id);

          // Update daily spent
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
          // Update log with failure
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

        const fromAddress = TOKEN_MAP[from_token] || TOKEN_MAP[from_token.toUpperCase()];
        const toAddress = TOKEN_MAP[to_token] || TOKEN_MAP[to_token.toUpperCase()];

        if (!fromAddress) throw new Error(`Unsupported token: ${from_token}. Supported: USDC, ETH, WETH`);
        if (!toAddress) throw new Error(`Unsupported token: ${to_token}. Supported: USDC, ETH, WETH`);

        // Log the action as pending
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
          // Determine decimals for the from_token
          const decimals = from_token.toUpperCase() === 'USDC' ? 6 : 18;
          const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));

          // Create a swap quote via CDP Trade API
          const swapResult = await cdpRequest('POST', '/evm/swaps', {
            network: 'base',
            fromToken: fromAddress,
            toToken: toAddress,
            fromAmount: rawAmount.toString(),
            takerAddress: wallet.wallet_address,
          }) as { transaction?: { to?: string; data?: string; value?: string }; swapId?: string };

          // If the swap returns a transaction to sign, send it
          let txHash: string | null = null;
          if (swapResult?.transaction) {
            const txResult = await cdpRequest(
              'POST',
              `/evm/accounts/${wallet.wallet_address}/send/transaction`,
              {
                network: 'base',
                transaction: swapResult.transaction,
              }
            ) as { transactionHash?: string };
            txHash = txResult?.transactionHash ?? null;
          }

          await serviceClient
            .from('agent_actions_log')
            .update({
              status: 'executed',
              result: { swapResult, txHash },
            })
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
        const { amount } = params;
        if (!amount) throw new Error('Amount is required');

        const { data: wallet } = await userClient
          .from('agent_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!wallet?.is_authenticated) throw new Error('Wallet not authenticated');
        if (!wallet.enabled_skills?.includes('fund')) throw new Error('Fund wallet skill is disabled');

        // Log the action
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
          // Generate Coinbase Onramp URL for the user
          // The CDP Onramp API provides a redirect URL for users to fund their wallets
          const onrampResult = await cdpRequest('POST', '/onramp/sessions', {
            purchaseAmount: { value: amount.toString(), currency: 'USD' },
            paymentMethod: 'CARD',
            destinationAddress: wallet.wallet_address,
            destinationNetwork: 'base',
            destinationAsset: 'USDC',
          }) as { sessionUrl?: string; sessionId?: string };

          await serviceClient
            .from('agent_actions_log')
            .update({
              status: 'executed',
              result: { sessionId: onrampResult?.sessionId },
            })
            .eq('id', logEntry?.id);

          return new Response(
            JSON.stringify({
              success: true,
              message: `Onramp session created for $${amount}`,
              onramp_url: onrampResult?.sessionUrl ?? null,
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
