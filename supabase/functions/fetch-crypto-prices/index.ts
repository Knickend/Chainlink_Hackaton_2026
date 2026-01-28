import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-name, x-supabase-client-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// CoinGecko ID mapping for common cryptocurrencies
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  LINK: 'chainlink',
  SOL: 'solana',
  ADA: 'cardano',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  ATOM: 'cosmos',
  UNI: 'uniswap',
  AAVE: 'aave',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  SHIB: 'shiba-inu',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
  ALGO: 'algorand',
  XLM: 'stellar',
  VET: 'vechain',
  FIL: 'filecoin',
  TRX: 'tron',
  ETC: 'ethereum-classic',
  XMR: 'monero',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  INJ: 'injective-protocol',
  SUI: 'sui',
  SEI: 'sei-network',
  PEPE: 'pepe',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  FTM: 'fantom',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  CRO: 'crypto-com-chain',
  MKR: 'maker',
  SNX: 'havven',
  COMP: 'compound-governance-token',
  GRT: 'the-graph',
  LDO: 'lido-dao',
  RPL: 'rocket-pool',
  ENS: 'ethereum-name-service',
  IMX: 'immutable-x',
  RNDR: 'render-token',
  FET: 'fetch-ai',
  OCEAN: 'ocean-protocol',
  AGIX: 'singularitynet',
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface PriceResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No symbols provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching prices for symbols:', symbols);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedSymbols = symbols.map((s: string) => s.toUpperCase());
    
    // Check cache first
    const { data: cachedPrices, error: cacheError } = await supabase
      .from('price_cache')
      .select('*')
      .in('symbol', normalizedSymbols)
      .eq('asset_type', 'crypto');

    if (cacheError) {
      console.error('Cache read error:', cacheError);
    }

    const now = Date.now();
    const results: Record<string, PriceResult> = {};
    const symbolsToFetch: string[] = [];

    // Check which symbols have valid cache
    for (const symbol of normalizedSymbols) {
      const cached = cachedPrices?.find(p => p.symbol === symbol);
      if (cached) {
        const cacheAge = now - new Date(cached.updated_at).getTime();
        if (cacheAge < CACHE_TTL_MS) {
          results[symbol] = {
            symbol,
            price: Number(cached.price),
            change: Number(cached.change) || 0,
            changePercent: Number(cached.change_percent) || 0,
          };
          console.log(`Using cached price for ${symbol}: $${cached.price}`);
        } else {
          symbolsToFetch.push(symbol);
        }
      } else {
        symbolsToFetch.push(symbol);
      }
    }

    // Fetch fresh prices for symbols not in cache
    if (symbolsToFetch.length > 0) {
      console.log('Fetching fresh prices for:', symbolsToFetch);
      
      // Map symbols to CoinGecko IDs
      const coinGeckoIds: string[] = [];
      const symbolToIdMap: Record<string, string> = {};
      const unknownSymbols: string[] = [];
      
      for (const symbol of symbolsToFetch) {
        const geckoId = COINGECKO_IDS[symbol];
        if (geckoId) {
          coinGeckoIds.push(geckoId);
          symbolToIdMap[geckoId] = symbol;
        } else {
          unknownSymbols.push(symbol);
        }
      }

      // For unknown symbols, try to resolve via CoinGecko search
      for (const symbol of unknownSymbols) {
        try {
          const searchResponse = await fetch(
            `https://api.coingecko.com/api/v3/search?query=${symbol}`,
            { headers: { 'Accept': 'application/json' } }
          );
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const coin = searchData.coins?.find((c: any) => 
              c.symbol.toUpperCase() === symbol
            );
            
            if (coin) {
              coinGeckoIds.push(coin.id);
              symbolToIdMap[coin.id] = symbol;
              console.log(`Resolved ${symbol} to CoinGecko ID: ${coin.id}`);
            } else {
              console.warn(`Could not resolve symbol: ${symbol}`);
            }
          }
        } catch (err) {
          console.error(`Error searching for ${symbol}:`, err);
        }
      }

      // Fetch prices from CoinGecko
      if (coinGeckoIds.length > 0) {
        try {
          const ids = coinGeckoIds.join(',');
          const cgResponse = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
            { headers: { 'Accept': 'application/json' } }
          );

          if (cgResponse.ok) {
            const cgData = await cgResponse.json();
            console.log('CoinGecko response:', JSON.stringify(cgData));

            const cacheUpdates: Array<{
              symbol: string;
              price: number;
              change: number;
              change_percent: number;
              asset_type: string;
            }> = [];

            for (const [geckoId, priceData] of Object.entries(cgData)) {
              const symbol = symbolToIdMap[geckoId];
              if (symbol && priceData) {
                const data = priceData as { usd?: number; usd_24h_change?: number };
                const price = data.usd || 0;
                const changePercent = data.usd_24h_change || 0;
                
                if (price > 0) {
                  results[symbol] = {
                    symbol,
                    price,
                    change: 0, // CoinGecko simple endpoint doesn't provide absolute change
                    changePercent,
                  };
                  
                  cacheUpdates.push({
                    symbol,
                    price,
                    change: 0,
                    change_percent: changePercent,
                    asset_type: 'crypto',
                  });
                }
              }
            }

            // Update cache
            for (const update of cacheUpdates) {
              await supabase
                .from('price_cache')
                .upsert(
                  { ...update, updated_at: new Date().toISOString() },
                  { onConflict: 'symbol' }
                );
            }
            
            console.log('Cache updated for:', cacheUpdates.map(u => u.symbol).join(', '));
          } else {
            console.error('CoinGecko API error:', cgResponse.status, await cgResponse.text());
            
            // Fall back to cached values for failed symbols
            for (const symbol of symbolsToFetch) {
              const cached = cachedPrices?.find(p => p.symbol === symbol);
              if (cached && !results[symbol]) {
                results[symbol] = {
                  symbol,
                  price: Number(cached.price),
                  change: Number(cached.change) || 0,
                  changePercent: Number(cached.change_percent) || 0,
                };
                console.log(`Falling back to stale cache for ${symbol}`);
              }
            }
          }
        } catch (cgError) {
          console.error('CoinGecko fetch error:', cgError);
          
          // Fall back to cached values
          for (const symbol of symbolsToFetch) {
            const cached = cachedPrices?.find(p => p.symbol === symbol);
            if (cached && !results[symbol]) {
              results[symbol] = {
                symbol,
                price: Number(cached.price),
                change: Number(cached.change) || 0,
                changePercent: Number(cached.change_percent) || 0,
              };
            }
          }
        }
      }
    }

    console.log('Final results:', Object.keys(results).length, 'prices');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: results,
        cached: symbolsToFetch.length === 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch prices' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
