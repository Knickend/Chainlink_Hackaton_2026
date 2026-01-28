import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': [
    'authorization',
    'x-client-info',
    'apikey',
    'content-type',
    'x-supabase-client-platform',
    'x-supabase-client-name',
    'x-supabase-client-version',
  ].join(', '),
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface PriceData {
  btc: number;
  eth: number;
  link: number;
  gold: number;
  silver: number;
  timestamp: string;
}

// Tiered cache TTLs
const CRYPTO_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes for crypto (free CoinGecko API)
const COMMODITY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes for commodities (paid Perplexity API)

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'LINK'];
const COMMODITY_SYMBOLS = ['GOLD', 'SILVER'];
const ALL_SYMBOLS = [...CRYPTO_SYMBOLS, ...COMMODITY_SYMBOLS];

// CoinGecko ID mapping
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  LINK: 'chainlink',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all cached prices
    const { data: cachedPrices, error: cacheError } = await supabase
      .from('price_cache')
      .select('*')
      .in('symbol', ALL_SYMBOLS);

    if (cacheError) {
      console.error('Cache read error:', cacheError);
    }

    // Helper to get cached price
    const getCachedPrice = (symbol: string): number => {
      return cachedPrices?.find(p => p.symbol === symbol)?.price || 0;
    };

    // Check cache validity per tier
    const now = Date.now();
    
    const cryptoCached = cachedPrices?.filter(p => CRYPTO_SYMBOLS.includes(p.symbol)) || [];
    const commodityCached = cachedPrices?.filter(p => COMMODITY_SYMBOLS.includes(p.symbol)) || [];
    
    const cryptoOldest = cryptoCached.length > 0 
      ? Math.min(...cryptoCached.map(p => new Date(p.updated_at).getTime()))
      : 0;
    const commodityOldest = commodityCached.length > 0
      ? Math.min(...commodityCached.map(p => new Date(p.updated_at).getTime()))
      : 0;

    const cryptoCacheValid = cryptoCached.length === CRYPTO_SYMBOLS.length && 
      (now - cryptoOldest) < CRYPTO_CACHE_TTL_MS;
    const commodityCacheValid = commodityCached.length === COMMODITY_SYMBOLS.length && 
      (now - commodityOldest) < COMMODITY_CACHE_TTL_MS;

    // If both caches are valid, return cached data
    if (cryptoCacheValid && commodityCacheValid) {
      console.log('Returning fully cached prices (crypto: 15min, commodity: 30min)');
      const result: PriceData = {
        btc: getCachedPrice('BTC'),
        eth: getCachedPrice('ETH'),
        link: getCachedPrice('LINK'),
        gold: getCachedPrice('GOLD'),
        silver: getCachedPrice('SILVER'),
        timestamp: new Date(Math.min(cryptoOldest, commodityOldest)).toISOString(),
      };
      return new Response(
        JSON.stringify({ success: true, data: result, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate price > 0 before using, fallback to cached
    const validatePrice = (value: unknown, symbol: string): number => {
      const num = Number(value);
      if (num > 0 && isFinite(num)) {
        return num;
      }
      console.warn(`Invalid price for ${symbol}: ${value}, using cached`);
      return getCachedPrice(symbol);
    };

    // ============ FETCH CRYPTO FROM COINGECKO (if cache expired) ============
    let cryptoPrices: Record<string, number> = {
      btc: getCachedPrice('BTC'),
      eth: getCachedPrice('ETH'),
      link: getCachedPrice('LINK'),
    };

    if (!cryptoCacheValid) {
      console.log('Crypto cache expired (15min TTL), fetching from CoinGecko...');
      
      try {
        const coinIds = Object.values(COINGECKO_IDS).join(',');
        const cgResponse = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (cgResponse.ok) {
          const cgData = await cgResponse.json();
          console.log('CoinGecko response:', JSON.stringify(cgData));
          
          cryptoPrices = {
            btc: validatePrice(cgData.bitcoin?.usd, 'BTC'),
            eth: validatePrice(cgData.ethereum?.usd, 'ETH'),
            link: validatePrice(cgData.chainlink?.usd, 'LINK'),
          };
        } else {
          console.error('CoinGecko API error:', cgResponse.status, await cgResponse.text());
        }
      } catch (cgError) {
        console.error('CoinGecko fetch error:', cgError);
      }
    } else {
      console.log('Using cached crypto prices (within 15min TTL)');
    }

    // ============ FETCH COMMODITIES FROM PERPLEXITY (if cache expired) ============
    let commodityPrices: Record<string, number> = {
      gold: getCachedPrice('GOLD'),
      silver: getCachedPrice('SILVER'),
    };

    if (!commodityCacheValid) {
      const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
      if (apiKey) {
        console.log('Commodity cache expired (30min TTL), fetching from Perplexity...');
        
        try {
          const pResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'sonar',
              temperature: 0,
              max_tokens: 100,
              messages: [
                {
                  role: 'system',
                  content: 'You are a financial data API. Return ONLY valid JSON. No markdown, no explanation.'
                },
                {
                  role: 'user',
                  content: 'Return current USD prices as JSON: {"gold": <Gold per troy oz>, "silver": <Silver per troy oz>}'
                }
              ],
            }),
          });

          if (pResponse.ok) {
            const pData = await pResponse.json();
            const content = pData.choices?.[0]?.message?.content;
            console.log('Perplexity response:', content);

            if (content) {
              try {
                const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                commodityPrices = {
                  gold: validatePrice(parsed.gold, 'GOLD'),
                  silver: validatePrice(parsed.silver, 'SILVER'),
                };
              } catch (parseErr) {
                console.error('Failed to parse Perplexity response:', parseErr);
              }
            }
          } else {
            console.error('Perplexity API error:', pResponse.status, await pResponse.text());
          }
        } catch (pError) {
          console.error('Perplexity fetch error:', pError);
        }
      } else {
        console.log('PERPLEXITY_API_KEY not configured, using cached commodity prices');
      }
    } else {
      console.log('Using cached commodity prices (within 30min TTL)');
    }

    // ============ COMBINE RESULTS ============
    const result: PriceData = {
      btc: cryptoPrices.btc,
      eth: cryptoPrices.eth,
      link: cryptoPrices.link,
      gold: commodityPrices.gold,
      silver: commodityPrices.silver,
      timestamp: new Date().toISOString(),
    };

    console.log('Final prices:', result);

    // Update cache only for refreshed tiers with valid prices
    const cacheUpdates: Array<{ symbol: string; price: number; asset_type: string }> = [];
    
    if (!cryptoCacheValid) {
      if (result.btc > 0) cacheUpdates.push({ symbol: 'BTC', price: result.btc, asset_type: 'crypto' });
      if (result.eth > 0) cacheUpdates.push({ symbol: 'ETH', price: result.eth, asset_type: 'crypto' });
      if (result.link > 0) cacheUpdates.push({ symbol: 'LINK', price: result.link, asset_type: 'crypto' });
    }
    
    if (!commodityCacheValid) {
      if (result.gold > 0) cacheUpdates.push({ symbol: 'GOLD', price: result.gold, asset_type: 'commodity' });
      if (result.silver > 0) cacheUpdates.push({ symbol: 'SILVER', price: result.silver, asset_type: 'commodity' });
    }

    for (const update of cacheUpdates) {
      await supabase
        .from('price_cache')
        .upsert(
          { ...update, updated_at: new Date().toISOString() },
          { onConflict: 'symbol' }
        );
    }

    console.log('Cache updated for:', cacheUpdates.map(u => u.symbol).join(', ') || 'none (all cached)');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result, 
        cached: cryptoCacheValid && commodityCacheValid,
        refreshed: {
          crypto: !cryptoCacheValid,
          commodities: !commodityCacheValid
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching prices:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch prices' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
