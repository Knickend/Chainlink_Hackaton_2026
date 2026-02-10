import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-name, x-supabase-client-version',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Expected environment variable: CHAINLINK_FEEDS
// Example value (JSON string):
// [{"pair":"EUR/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0x..."}, ...]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('fetch-chainlink-feeds: start');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse configured feeds from env var; fallback to empty list
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

    const results: Array<any> = [];

    for (const f of feeds) {
      try {
        const provider = new ethers.JsonRpcProvider(f.rpc);
        const abi = [
          'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)',
          'function decimals() view returns (uint8)'
        ];
        const contract = new ethers.Contract(ethers.getAddress(f.address.toLowerCase()), abi, provider);

        // Call decimals and latestRoundData
        const [decimals, latest] = await Promise.all([
          contract.decimals().catch(() => 8),
          contract.latestRoundData(),
        ]);

        // latestRoundData -> [roundId, answer, startedAt, updatedAt, answeredInRound]
        const answerRaw = BigInt(latest[1].toString());
        const updatedAt = Number(latest[3]) || Date.now() / 1000;
        const answer = Number(answerRaw) / Math.pow(10, Number(decimals || 8));

        results.push({
          pair: f.pair,
          network: f.network,
          address: f.address,
          answer,
          decimals: Number(decimals || 8),
          updatedAt: new Date(updatedAt * 1000).toISOString(),
        });
      } catch (err) {
        console.error('feed error', f, err);
        results.push({ pair: f.pair, network: f.network, address: f.address, error: String(err) });
      }
    }

    // Optionally cache results in Supabase price_cache table
    try {
      const toUpsert = results
        .filter(r => r && r.pair && r.answer !== undefined)
        .map(r => ({ symbol: r.pair, price: r.answer, asset_type: 'chainlink', updated_at: new Date().toISOString() }));

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
