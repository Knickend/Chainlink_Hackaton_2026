import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@^2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CDP_API_BASE = 'https://api.cdp.coinbase.com';
const USDC_BASE = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const ETH_BASE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// --- Minimal CDP JWT (Ed25519) for GET requests ---
const ED25519_PKCS8_PREFIX = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
  0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(str: string): string {
  return base64UrlEncode(new TextEncoder().encode(str));
}

function decodeEd25519PrivateKey(pemOrBase64: string): ArrayBuffer {
  const cleaned = pemOrBase64
    .replace(/-----BEGIN[^-]*-----/g, '').replace(/-----END[^-]*-----/g, '').replace(/\s/g, '');
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

  if (bytes.length === 48) return bytes.buffer;
  if (bytes.length === 32) {
    const pkcs8 = new Uint8Array(48);
    pkcs8.set(ED25519_PKCS8_PREFIX, 0);
    pkcs8.set(bytes, 16);
    return pkcs8.buffer;
  }
  if (bytes.length === 64) {
    const seed = bytes.slice(0, 32);
    const pkcs8 = new Uint8Array(48);
    pkcs8.set(ED25519_PKCS8_PREFIX, 0);
    pkcs8.set(seed, 16);
    return pkcs8.buffer;
  }
  const seed = bytes.slice(0, 32);
  const pkcs8 = new Uint8Array(48);
  pkcs8.set(ED25519_PKCS8_PREFIX, 0);
  pkcs8.set(seed, 16);
  return pkcs8.buffer;
}

async function generateCdpJwt(apiKeyId: string, apiKeySecret: string, method: string, path: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, '0')).join('');
  const pathOnly = path.split('?')[0];
  const uri = `${method} api.cdp.coinbase.com${pathOnly}`;

  const header = { alg: 'EdDSA', typ: 'JWT', kid: apiKeyId, nonce };
  const payload = { sub: apiKeyId, iss: 'cdp', aud: ['cdp_service'], nbf: now, exp: now + 120, uri };

  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const pkcs8Key = decodeEd25519PrivateKey(apiKeySecret);
  const cryptoKey = await crypto.subtle.importKey('pkcs8', pkcs8Key, { name: 'Ed25519' }, false, ['sign']);
  const signature = await crypto.subtle.sign('Ed25519', cryptoKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function cdpGet(path: string): Promise<unknown> {
  const apiKeyId = Deno.env.get('CDP_API_KEY_ID')!;
  const apiKeySecret = Deno.env.get('CDP_API_KEY_SECRET')!;
  const jwt = await generateCdpJwt(apiKeyId, apiKeySecret, 'GET', path);

  const resp = await fetch(`${CDP_API_BASE}${path}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`CDP ${resp.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

// Parse token amount from CDP balance response
function parseTokenAmount(entry: Record<string, any>, defaultDecimals: number): number {
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
}

async function sendDepositEmail(resend: Resend, email: string, token: string, received: number, newBalance: number, walletAddress: string) {
  const timestamp = new Date().toUTCString();
  const subject = `InControl: ${token} Deposit Received`;
  const baseScanUrl = `https://sepolia.basescan.org/address/${walletAddress}`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 16px;color:#111;">💰 Deposit Received</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#888;">Token</td><td style="padding:8px 0;font-weight:600;">${token}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Amount Received</td><td style="padding:8px 0;font-weight:600;color:#10b981;">+${received.toFixed(token === 'ETH' ? 6 : 2)} ${token}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">New Balance</td><td style="padding:8px 0;font-weight:600;">${newBalance.toFixed(token === 'ETH' ? 6 : 2)} ${token}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Wallet</td><td style="padding:8px 0;"><a href="${baseScanUrl}" style="color:#6366f1;text-decoration:none;font-family:monospace;font-size:13px;">${walletAddress.slice(0, 10)}…${walletAddress.slice(-8)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#888;">Time</td><td style="padding:8px 0;">${timestamp}</td></tr>
      </table>
      <p style="margin:24px 0 0;color:#888;font-size:13px;">You received this because transaction notifications are enabled in your InControl settings.</p>
    </div>`;

  await resend.emails.send({
    from: 'InControl <noreply@incontrol.finance>',
    to: [email],
    subject,
    html,
  });
  console.log(`[CheckBalance] Deposit email sent to ${email}: +${received} ${token}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const resend = resendKey ? new Resend(resendKey) : null;

  // Verify cron secret or service role key
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const isAuthorized = token && (token === cronSecret || token === serviceRoleKey);
  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Fetch all wallets with notifications enabled
    const { data: wallets, error } = await serviceClient
      .from('agent_wallets')
      .select('id, user_id, wallet_address, wallet_email, notify_transactions, last_known_balance, last_known_eth_balance')
      .eq('notify_transactions', true)
      .not('wallet_address', 'is', null);

    if (error) throw error;
    if (!wallets?.length) {
      console.log('[CheckBalance] No wallets with notifications enabled');
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[CheckBalance] Processing ${wallets.length} wallet(s)`);
    let notified = 0;

    for (const wallet of wallets) {
      try {
        const balanceResp = await cdpGet(`/platform/v2/evm/token-balances/base-sepolia/${wallet.wallet_address}`) as Record<string, any>;
        const tokenList = (balanceResp?.token_balances ?? balanceResp?.balances ?? []) as Array<Record<string, any>>;

        // Parse USDC
        const usdcEntry = tokenList.find((t: any) => {
          const symbol = (t?.token?.symbol || t?.symbol || '').toUpperCase();
          const addr = (t?.token?.contractAddress || t?.token?.contract_address || t?.contract_address || '').toLowerCase();
          return symbol === 'USDC' || addr === USDC_BASE.toLowerCase();
        });
        const currentUsdc = usdcEntry ? parseTokenAmount(usdcEntry, 6) : 0;

        // Parse ETH
        const ethEntry = tokenList.find((t: any) => {
          const symbol = (t?.token?.symbol || t?.symbol || '').toUpperCase();
          const addr = (t?.token?.contractAddress || t?.token?.contract_address || t?.contract_address || '').toLowerCase();
          return symbol === 'ETH' || addr === ETH_BASE.toLowerCase() || addr === '';
        });
        const currentEth = ethEntry ? parseTokenAmount(ethEntry, 18) : 0;

        const lastUsdc = Number(wallet.last_known_balance) || 0;
        const lastEth = Number(wallet.last_known_eth_balance) || 0;
        const isFirstRun = lastUsdc === 0 && lastEth === 0;

        console.log(`[CheckBalance] Wallet ${wallet.wallet_address?.slice(0, 10)}: USDC ${lastUsdc} -> ${currentUsdc}, ETH ${lastEth} -> ${currentEth}${isFirstRun ? ' (first run, seeding)' : ''}`);

        // Send notifications (skip first run to avoid false positives)
        if (!isFirstRun && resend && wallet.wallet_email) {
          const receivedUsdc = currentUsdc - lastUsdc;
          const receivedEth = currentEth - lastEth;

          if (receivedUsdc > 0.01) {
            await sendDepositEmail(resend, wallet.wallet_email, 'USDC', receivedUsdc, currentUsdc, wallet.wallet_address!);
            notified++;
          }
          if (receivedEth > 0.0001) {
            await sendDepositEmail(resend, wallet.wallet_email, 'ETH', receivedEth, currentEth, wallet.wallet_address!);
            notified++;
          }
        }

        // Always update stored balances
        await serviceClient
          .from('agent_wallets')
          .update({
            last_known_balance: currentUsdc,
            last_known_eth_balance: currentEth,
          })
          .eq('id', wallet.id);
      } catch (walletErr) {
        console.error(`[CheckBalance] Error for wallet ${wallet.wallet_address}:`, walletErr);
      }
    }

    // Log to cron_job_logs
    await serviceClient.from('cron_job_logs').insert({
      job_name: 'check-wallet-balance',
      status: 'success',
      processed_count: wallets.length,
      succeeded_count: notified,
      details: { wallets_checked: wallets.length, notifications_sent: notified },
    });

    console.log(`[CheckBalance] Done. Checked ${wallets.length}, notified ${notified}`);
    return new Response(
      JSON.stringify({ processed: wallets.length, notified }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[CheckBalance] Fatal error:', err);

    await serviceClient.from('cron_job_logs').insert({
      job_name: 'check-wallet-balance',
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
    }).catch(() => {});

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
