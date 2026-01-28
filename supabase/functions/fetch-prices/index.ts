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
const SYMBOLS = ['BTC', 'ETH', 'LINK', 'GOLD', 'SILVER'];

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
      .in('symbol', SYMBOLS);

    if (!cacheError && cachedPrices && cachedPrices.length === SYMBOLS.length) {
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

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching live prices from Perplexity...');

    // BATCH JSON prompt for all prices
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        temperature: 0,
        max_tokens: 150,
        messages: [
          {
            role: 'system',
            content: 'You are a financial data API. Return ONLY valid JSON with current USD prices. No markdown, no explanation.'
          },
          {
            role: 'user',
            content: 'Return current USD prices as JSON: {"btc": <Bitcoin>, "eth": <Ethereum>, "link": <Chainlink>, "gold": <Gold per troy oz>, "silver": <Silver per troy oz>}'
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      
      // Fallback to cached prices on API failure
      if (cachedPrices && cachedPrices.length > 0) {
        console.log('API failed, returning cached prices as fallback');
        const result: PriceData = {
          btc: cachedPrices.find(p => p.symbol === 'BTC')?.price || 0,
          eth: cachedPrices.find(p => p.symbol === 'ETH')?.price || 0,
          link: cachedPrices.find(p => p.symbol === 'LINK')?.price || 0,
          gold: cachedPrices.find(p => p.symbol === 'GOLD')?.price || 0,
          silver: cachedPrices.find(p => p.symbol === 'SILVER')?.price || 0,
          timestamp: new Date().toISOString(),
        };
        return new Response(
          JSON.stringify({ success: true, data: result, cached: true, fallback: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `API request failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Log raw Perplexity response for debugging
    console.log('Raw Perplexity response:', content);

    if (!content) {
      console.error('No content in Perplexity response');
      
      // Fallback to cached prices
      if (cachedPrices && cachedPrices.length > 0) {
        const result: PriceData = {
          btc: cachedPrices.find(p => p.symbol === 'BTC')?.price || 0,
          eth: cachedPrices.find(p => p.symbol === 'ETH')?.price || 0,
          link: cachedPrices.find(p => p.symbol === 'LINK')?.price || 0,
          gold: cachedPrices.find(p => p.symbol === 'GOLD')?.price || 0,
          silver: cachedPrices.find(p => p.symbol === 'SILVER')?.price || 0,
          timestamp: new Date().toISOString(),
        };
        return new Response(
          JSON.stringify({ success: true, data: result, cached: true, fallback: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON response
    let prices: Record<string, number>;
    try {
      // Handle if content is already parsed or is a string
      prices = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (parseError) {
      console.error('Failed to parse prices JSON:', parseError, 'Content:', content);
      
      // Fallback to cached prices on parse failure
      if (cachedPrices && cachedPrices.length > 0) {
        console.log('Parse failed, returning cached prices as fallback');
        const result: PriceData = {
          btc: cachedPrices.find(p => p.symbol === 'BTC')?.price || 0,
          eth: cachedPrices.find(p => p.symbol === 'ETH')?.price || 0,
          link: cachedPrices.find(p => p.symbol === 'LINK')?.price || 0,
          gold: cachedPrices.find(p => p.symbol === 'GOLD')?.price || 0,
          silver: cachedPrices.find(p => p.symbol === 'SILVER')?.price || 0,
          timestamp: new Date().toISOString(),
        };
        return new Response(
          JSON.stringify({ success: true, data: result, cached: true, fallback: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse price data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    const result: PriceData = {
      btc: validatePrice(prices.btc, 'BTC'),
      eth: validatePrice(prices.eth, 'ETH'),
      link: validatePrice(prices.link, 'LINK'),
      gold: validatePrice(prices.gold, 'GOLD'),
      silver: validatePrice(prices.silver, 'SILVER'),
      timestamp: new Date().toISOString(),
    };

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
