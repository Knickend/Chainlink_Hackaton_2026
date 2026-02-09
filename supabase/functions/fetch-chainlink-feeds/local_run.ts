import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.9.1/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-name, x-supabase-client-version',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('fetch-chainlink-feeds (local): start');

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

    // No overrides: fetch directly from configured RPCs

    const results: Array<any> = [];

    for (const f of feeds) {
      try {
        let provider;
        if (f.rpc && f.rpc.startsWith('ws')) {
          provider = new ethers.WebSocketProvider(f.rpc);
        } else {
          provider = new ethers.JsonRpcProvider(f.rpc);
        }
        const abi = [
          'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)',
          'function decimals() view returns (uint8)'
        ];
        const address = (f.address || '').toLowerCase();
        const contract = new ethers.Contract(address, abi, provider);

        const [decimals, latest] = await Promise.all([
          contract.decimals().catch(() => 8),
          contract.latestRoundData(),
        ]);

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

    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('fetch-chainlink-feeds (local) error', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
