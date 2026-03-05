import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-name, x-supabase-client-version',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// ── In-memory cache (per-isolate) ──────────────────────────────────────
const CACHE_TTL_MS = 30_000; // 30 seconds
let cachedResponse: { data: any[]; timestamp: number } | null = null;

// Network-aware fallback RPCs (loaded from secrets)
function getFallbackRpcs(): Record<string, string[]> {
  const sepoliaRpc = Deno.env.get('MORALIS_RPC_SEPOLIA');
  const baseRpc = Deno.env.get('MORALIS_RPC_BASE');
  return {
    sepolia: sepoliaRpc
      ? [sepoliaRpc, sepoliaRpc.replace('site1.', 'site2.')]
      : [],
    base: baseRpc
      ? [baseRpc, baseRpc.replace('site1.', 'site2.')]
      : [],
  };
}

const ABI = [
  'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)',
  'function decimals() view returns (uint8)',
];

// ── Shared provider pool (reuse across feeds in one cycle) ─────────────
const providerCache = new Map<string, ethers.JsonRpcProvider>();

function getProvider(rpcUrl: string): ethers.JsonRpcProvider {
  let provider = providerCache.get(rpcUrl);
  if (!provider) {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    providerCache.set(rpcUrl, provider);
  }
  return provider;
}

// ── Fetch a single feed, with fallback on error ────────────────────────
async function fetchFeed(
  f: { pair: string; network: string; rpc: string; address: string }
): Promise<any> {
  const address = ethers.getAddress(f.address.toLowerCase());

  async function queryProvider(provider: ethers.JsonRpcProvider) {
    const contract = new ethers.Contract(address, ABI, provider);
    const [decimals, latest] = await Promise.all([
      contract.decimals().catch(() => 8),
      contract.latestRoundData(),
    ]);
    const answerRaw = BigInt(latest[1].toString());
    const updatedAt = Number(latest[3]) || Date.now() / 1000;
    const answer = Number(answerRaw) / Math.pow(10, Number(decimals || 8));
    return {
      pair: f.pair,
      network: f.network,
      address: f.address,
      answer,
      decimals: Number(decimals || 8),
      updatedAt: new Date(updatedAt * 1000).toISOString(),
    };
  }

  // Try primary RPC first
  try {
    return await queryProvider(getProvider(f.rpc));
  } catch (primaryErr) {
    console.warn(`Primary RPC failed for ${f.pair}:`, String(primaryErr));
  }

  // Fallback RPCs (network-aware)
  const fallbacks = getFallbackRpcs()[f.network] || [];
  for (const rpc of fallbacks) {
    try {
      console.log(`Retrying ${f.pair} with fallback ${rpc}`);
      return await queryProvider(getProvider(rpc));
    } catch (err) {
      console.warn(`Fallback ${rpc} failed for ${f.pair}:`, String(err));
    }
  }

  return { pair: f.pair, network: f.network, address: f.address, error: 'All RPCs failed' };
}

// ── Background refresh: fetch on-chain and upsert to DB ────────────────
async function backgroundRefresh(
  feeds: Array<{ pair: string; network: string; rpc: string; address: string }>,
  supabase: any
) {
  try {
    const settled = await Promise.allSettled(feeds.map(fetchFeed));
    const results = settled.map((s) =>
      s.status === 'fulfilled' ? s.value : { error: String((s as PromiseRejectedResult).reason) }
    );

    // Update in-memory cache
    cachedResponse = { data: results, timestamp: Date.now() };

    // Upsert to price_cache (use network:pair as symbol, store errors with price=-1)
    const toUpsert = results
      .filter((r: any) => r && r.pair)
      .map((r: any) => ({
        symbol: `${r.network}:${r.pair}`,
        price: r.error ? -1 : r.answer,
        asset_type: 'chainlink',
        updated_at: new Date().toISOString(),
      }));

    if (toUpsert.length > 0) {
      for (const u of toUpsert) {
        await supabase.from('price_cache').upsert({ ...u }, { onConflict: 'symbol' });
      }
    }
    console.log('Background chainlink refresh complete:', toUpsert.length, 'feeds updated');
  } catch (err) {
    console.error('Background chainlink refresh error:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('fetch-chainlink-feeds: start');

    // ── Return in-memory cached response if still fresh ────────────────
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL_MS) {
      console.log('fetch-chainlink-feeds: returning in-memory cached result');
      return new Response(JSON.stringify({ success: true, data: cachedResponse.data, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse configured feeds
    const raw = Deno.env.get('CHAINLINK_FEEDS') || '[]';
    let feeds: Array<{ pair: string; network: string; rpc: string; address: string }> = [];
    try {
      feeds = JSON.parse(raw);
    } catch (e) {
      console.warn('Invalid CHAINLINK_FEEDS JSON:', e);
      feeds = [];
    }

    if (!feeds || feeds.length === 0) {
      return new Response(JSON.stringify({ success: true, data: [], message: 'no-feeds-configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Try DB cache first for fast response ───────────────────────────
    try {
      const { data: dbCached } = await supabase
        .from('price_cache')
        .select('symbol, price, updated_at')
        .eq('asset_type', 'chainlink');

      if (dbCached && dbCached.length > 0) {
        console.log('fetch-chainlink-feeds: returning DB cached result, refreshing in background');
        const dbResults = dbCached.map((row: any) => {
          const sym = row.symbol as string;
          const colonIdx = sym.indexOf(':');
          const network = colonIdx > -1 ? sym.substring(0, colonIdx) : 'sepolia';
          const pair = colonIdx > -1 ? sym.substring(colonIdx + 1) : sym;
          const price = Number(row.price);
          return {
            pair,
            network,
            address: '',
            ...(price === -1 ? { error: 'All RPCs failed' } : { answer: price }),
            updatedAt: row.updated_at,
          };
        });

        // Fire-and-forget background refresh
        backgroundRefresh(feeds, supabase).catch(console.error);

        return new Response(JSON.stringify({ success: true, data: dbResults, cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (dbErr) {
      console.warn('DB cache read failed, falling back to RPC:', dbErr);
    }

    // ── No DB cache (first ever call) — blocking RPC fetch ─────────────
    console.log('fetch-chainlink-feeds: no DB cache, doing blocking RPC fetch');
    const settled = await Promise.allSettled(feeds.map(fetchFeed));
    const results = settled.map((s) =>
      s.status === 'fulfilled' ? s.value : { error: String((s as PromiseRejectedResult).reason) }
    );

    // Cache successful results
    cachedResponse = { data: results, timestamp: Date.now() };

    // Upsert to price_cache
    try {
      const toUpsert = results
        .filter((r: any) => r && r.pair)
        .map((r: any) => ({
          symbol: `${r.network}:${r.pair}`,
          price: r.error ? -1 : r.answer,
          asset_type: 'chainlink',
          updated_at: new Date().toISOString(),
        }));

      if (toUpsert.length > 0) {
        for (const u of toUpsert) {
          await supabase.from('price_cache').upsert({ ...u }, { onConflict: 'symbol' });
        }
      }
    } catch (cacheErr) {
      console.error('cache upsert error', cacheErr);
    }

    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('fetch-chainlink-feeds error', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
