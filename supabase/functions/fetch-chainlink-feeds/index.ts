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

// Fallback public RPC (no API key needed)
const FALLBACK_RPCS = [
  'https://site1.moralis-nodes.com/sepolia/0719ea3244184b24b638e0f5686b7534',
  'https://site2.moralis-nodes.com/sepolia/0719ea3244184b24b638e0f5686b7534',
];

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

  // Fallback RPCs
  for (const rpc of FALLBACK_RPCS) {
    try {
      console.log(`Retrying ${f.pair} with fallback ${rpc}`);
      return await queryProvider(getProvider(rpc));
    } catch (err) {
      console.warn(`Fallback ${rpc} failed for ${f.pair}:`, String(err));
    }
  }

  return { pair: f.pair, network: f.network, address: f.address, error: 'All RPCs failed' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('fetch-chainlink-feeds: start');

    // ── Return cached response if still fresh ──────────────────────────
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL_MS) {
      console.log('fetch-chainlink-feeds: returning cached result');
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

    // ── Fetch all feeds concurrently ───────────────────────────────────
    const settled = await Promise.allSettled(feeds.map(fetchFeed));
    const results = settled.map((s) =>
      s.status === 'fulfilled' ? s.value : { error: String((s as PromiseRejectedResult).reason) }
    );

    // Cache successful results
    cachedResponse = { data: results, timestamp: Date.now() };

    // Upsert to price_cache
    try {
      const toUpsert = results
        .filter((r: any) => r && r.pair && r.answer !== undefined)
        .map((r: any) => ({ symbol: r.pair, price: r.answer, asset_type: 'chainlink', updated_at: new Date().toISOString() }));

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
