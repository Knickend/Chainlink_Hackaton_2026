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

// Sanity check bounds for prices (reject obvious outliers)
// These are generous ranges that should catch AI hallucinations
const PRICE_BOUNDS = {
  btc: { min: 20000, max: 500000 },   // Bitcoin: $20k-$500k
  eth: { min: 500, max: 50000 },      // Ethereum: $500-$50k
  link: { min: 1, max: 500 },         // Chainlink: $1-$500
  gold: { min: 1500, max: 4000 },     // Gold: $1500-$4000/oz
  silver: { min: 15, max: 100 },      // Silver: $15-$100/oz
};

function isPriceValid(key: keyof typeof PRICE_BOUNDS, value: number | null | undefined): boolean {
  if (value === null || value === undefined || isNaN(value)) return false;
  const bounds = PRICE_BOUNDS[key];
  return value >= bounds.min && value <= bounds.max;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const symbols = ['BTC', 'ETH', 'LINK', 'GOLD', 'SILVER'];
    const { data: cachedPrices, error: cacheError } = await supabase
      .from('price_cache')
      .select('*')
      .in('symbol', symbols);

    if (!cacheError && cachedPrices && cachedPrices.length === symbols.length) {
      const oldestUpdate = Math.min(...cachedPrices.map(p => new Date(p.updated_at).getTime()));
      const isCacheValid = Date.now() - oldestUpdate < CACHE_TTL_MS;

      if (isCacheValid) {
        console.log('Returning cached prices');
        const result: PriceData = {
          btc: cachedPrices.find(p => p.symbol === 'BTC')?.price || 96000,
          eth: cachedPrices.find(p => p.symbol === 'ETH')?.price || 3200,
          link: cachedPrices.find(p => p.symbol === 'LINK')?.price || 22,
          gold: cachedPrices.find(p => p.symbol === 'GOLD')?.price || 2650,
          silver: cachedPrices.find(p => p.symbol === 'SILVER')?.price || 30,
          timestamp: new Date(oldestUpdate).toISOString(),
        };
        return new Response(
          JSON.stringify({ success: true, data: result, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching live prices from Perplexity...');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a financial data API. You MUST return ONLY a valid JSON object with numeric values. Never return null. If you cannot find an exact price, use the most recent known price. No explanations, no markdown, just JSON.'
          },
          {
            role: 'user',
            content: `What are the current market prices in USD for these assets right now?
1. Bitcoin (BTC) - cryptocurrency
2. Ethereum (ETH) - cryptocurrency  
3. Chainlink (LINK) - cryptocurrency
4. Gold - spot price per troy ounce
5. Silver - spot price per troy ounce

Respond with ONLY this JSON format, replacing X with actual numeric prices:
{"btc":X,"eth":X,"link":X,"gold":X,"silver":X}

IMPORTANT: All values must be numbers (not null, not strings). Use the latest available price for each asset.`
          }
        ],
        temperature: 0,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `API request failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in Perplexity response');
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Raw Perplexity response:', content);

    // Extract JSON from the response (handle markdown code blocks if present)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    let prices: Partial<PriceData>;
    try {
      prices = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse prices JSON:', parseError, 'Content:', jsonStr);
      prices = {};
    }

    // Get cached prices to use as fallback for invalid values
    const { data: fallbackPrices } = await supabase
      .from('price_cache')
      .select('*')
      .in('symbol', ['BTC', 'ETH', 'LINK', 'GOLD', 'SILVER']);

    const getCachedPrice = (symbol: string, defaultVal: number): number => {
      const cached = fallbackPrices?.find(p => p.symbol === symbol);
      return cached ? Number(cached.price) : defaultVal;
    };

    // Validate each price and use cached/default if invalid
    const btcRaw = Number(prices.btc);
    const ethRaw = Number(prices.eth);
    const linkRaw = Number(prices.link);
    const goldRaw = Number(prices.gold);
    const silverRaw = Number(prices.silver);

    const btcValid = isPriceValid('btc', btcRaw);
    const ethValid = isPriceValid('eth', ethRaw);
    const linkValid = isPriceValid('link', linkRaw);
    const goldValid = isPriceValid('gold', goldRaw);
    const silverValid = isPriceValid('silver', silverRaw);

    // Log any rejected values
    if (!btcValid) console.warn(`BTC price ${btcRaw} rejected (bounds: ${PRICE_BOUNDS.btc.min}-${PRICE_BOUNDS.btc.max})`);
    if (!ethValid) console.warn(`ETH price ${ethRaw} rejected (bounds: ${PRICE_BOUNDS.eth.min}-${PRICE_BOUNDS.eth.max})`);
    if (!linkValid) console.warn(`LINK price ${linkRaw} rejected (bounds: ${PRICE_BOUNDS.link.min}-${PRICE_BOUNDS.link.max})`);
    if (!goldValid) console.warn(`GOLD price ${goldRaw} rejected (bounds: ${PRICE_BOUNDS.gold.min}-${PRICE_BOUNDS.gold.max})`);
    if (!silverValid) console.warn(`SILVER price ${silverRaw} rejected (bounds: ${PRICE_BOUNDS.silver.min}-${PRICE_BOUNDS.silver.max})`);

    const result: PriceData = {
      btc: btcValid ? btcRaw : getCachedPrice('BTC', 90000),
      eth: ethValid ? ethRaw : getCachedPrice('ETH', 3200),
      link: linkValid ? linkRaw : getCachedPrice('LINK', 22),
      gold: goldValid ? goldRaw : getCachedPrice('GOLD', 2650),
      silver: silverValid ? silverRaw : getCachedPrice('SILVER', 30),
      timestamp: new Date().toISOString(),
    };

    console.log('Returning prices:', result);

    // Only update cache for valid prices
    const cacheUpdates: Array<{ symbol: string; price: number; asset_type: string }> = [];
    if (btcValid) cacheUpdates.push({ symbol: 'BTC', price: result.btc, asset_type: 'crypto' });
    if (ethValid) cacheUpdates.push({ symbol: 'ETH', price: result.eth, asset_type: 'crypto' });
    if (linkValid) cacheUpdates.push({ symbol: 'LINK', price: result.link, asset_type: 'crypto' });
    if (goldValid) cacheUpdates.push({ symbol: 'GOLD', price: result.gold, asset_type: 'commodity' });
    if (silverValid) cacheUpdates.push({ symbol: 'SILVER', price: result.silver, asset_type: 'commodity' });

    for (const update of cacheUpdates) {
      await supabase
        .from('price_cache')
        .upsert(
          { ...update, updated_at: new Date().toISOString() },
          { onConflict: 'symbol' }
        );
    }

    console.log('Cache updated for valid prices:', cacheUpdates.map(u => u.symbol).join(', ') || 'none');

    return new Response(
      JSON.stringify({ success: true, data: result, citations: data.citations || [], cached: false }),
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
