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
            content: 'You are a financial data assistant. Return ONLY valid JSON with no additional text. All prices should be in USD.'
          },
          {
            role: 'user',
            content: `Get the current prices for: Bitcoin (BTC), Ethereum (ETH), Chainlink (LINK), Gold (per troy ounce), and Silver (per troy ounce).
            
Return ONLY a JSON object in this exact format with no markdown or explanation:
{"btc": NUMBER, "eth": NUMBER, "link": NUMBER, "gold": NUMBER, "silver": NUMBER}

Replace NUMBER with the actual current USD price as a number (no quotes, no currency symbols).`
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
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
      prices = {
        btc: 96000,
        eth: 3200,
        link: 22,
        gold: 2650,
        silver: 30,
      };
    }

    const result: PriceData = {
      btc: Number(prices.btc) || 96000,
      eth: Number(prices.eth) || 3200,
      link: Number(prices.link) || 22,
      gold: Number(prices.gold) || 2650,
      silver: Number(prices.silver) || 30,
      timestamp: new Date().toISOString(),
    };

    console.log('Returning prices:', result);

    // Update cache in background
    const cacheUpdates = [
      { symbol: 'BTC', price: result.btc, asset_type: 'crypto' },
      { symbol: 'ETH', price: result.eth, asset_type: 'crypto' },
      { symbol: 'LINK', price: result.link, asset_type: 'crypto' },
      { symbol: 'GOLD', price: result.gold, asset_type: 'commodity' },
      { symbol: 'SILVER', price: result.silver, asset_type: 'commodity' },
    ];

    for (const update of cacheUpdates) {
      await supabase
        .from('price_cache')
        .upsert(
          { ...update, updated_at: new Date().toISOString() },
          { onConflict: 'symbol' }
        );
    }

    console.log('Cache updated');

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
