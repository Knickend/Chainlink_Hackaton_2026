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

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
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

    // Check cache first
    const { data: cachedPrices, error: cacheError } = await supabase
      .from('price_cache')
      .select('*')
      .in('symbol', ALL_SYMBOLS);

    if (!cacheError && cachedPrices && cachedPrices.length === ALL_SYMBOLS.length) {
      const oldestUpdate = Math.min(...cachedPrices.map(p => new Date(p.updated_at).getTime()));
      const isCacheValid = Date.now() - oldestUpdate < CACHE_TTL_MS;

      if (isCacheValid) {
        console.log('Returning cached prices');
        const result: PriceData = {
          btc: cachedPrices.find(p => p.symbol === 'BTC')?.price || 0,
          eth: cachedPrices.find(p => p.symbol === 'ETH')?.price || 0,
          link: cachedPrices.find(p => p.symbol === 'LINK')?.price || 0,
          gold: cachedPrices.find(p => p.symbol === 'GOLD')?.price || 0,
          silver: cachedPrices.find(p => p.symbol === 'SILVER')?.price || 0,
          timestamp: new Date(oldestUpdate).toISOString(),
        };
        return new Response(
          JSON.stringify({ success: true, data: result, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Helper to get cached price
    const getCachedPrice = (symbol: string): number => {
      return cachedPrices?.find(p => p.symbol === symbol)?.price || 0;
    };

    // Validate price > 0 before using, fallback to cached
    const validatePrice = (value: unknown, symbol: string): number => {
      const num = Number(value);
      if (num > 0 && isFinite(num)) {
        return num;
      }
      console.warn(`Invalid price for ${symbol}: ${value}, using cached`);
      return getCachedPrice(symbol);
    };

    // ============ FETCH CRYPTO FROM COINGECKO ============
    console.log('Fetching crypto prices from CoinGecko...');
    
    let cryptoPrices: Record<string, number> = {
      btc: getCachedPrice('BTC'),
      eth: getCachedPrice('ETH'),
      link: getCachedPrice('LINK'),
    };

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

    // ============ FETCH COMMODITIES FROM PERPLEXITY ============
    let commodityPrices: Record<string, number> = {
      gold: getCachedPrice('GOLD'),
      silver: getCachedPrice('SILVER'),
    };

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (apiKey) {
      console.log('Fetching commodity prices from Perplexity...');
      
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

    console.log('Validated prices:', result);

    // Update cache only for valid prices (> 0)
    const cacheUpdates: Array<{ symbol: string; price: number; asset_type: string }> = [];
    if (result.btc > 0) cacheUpdates.push({ symbol: 'BTC', price: result.btc, asset_type: 'crypto' });
    if (result.eth > 0) cacheUpdates.push({ symbol: 'ETH', price: result.eth, asset_type: 'crypto' });
    if (result.link > 0) cacheUpdates.push({ symbol: 'LINK', price: result.link, asset_type: 'crypto' });
    if (result.gold > 0) cacheUpdates.push({ symbol: 'GOLD', price: result.gold, asset_type: 'commodity' });
    if (result.silver > 0) cacheUpdates.push({ symbol: 'SILVER', price: result.silver, asset_type: 'commodity' });

    for (const update of cacheUpdates) {
      await supabase
        .from('price_cache')
        .upsert(
          { ...update, updated_at: new Date().toISOString() },
          { onConflict: 'symbol' }
        );
    }

    console.log('Cache updated for:', cacheUpdates.map(u => u.symbol).join(', ') || 'none');

    return new Response(
      JSON.stringify({ success: true, data: result, cached: false }),
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
