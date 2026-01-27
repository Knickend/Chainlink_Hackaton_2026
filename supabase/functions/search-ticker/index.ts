import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // Allow Supabase client metadata headers used by supabase-js in the browser.
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

interface TickerResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string' || query.length < 1) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required (min 1 character)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedQuery = query.trim().slice(0, 50);

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Search service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for ticker: "${sanitizedQuery}"`);

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
            content: 'You are a financial data assistant. Return ONLY valid JSON arrays with no additional text or markdown formatting.'
          },
          {
            role: 'user',
            content: `Search for stocks and ETFs matching "${sanitizedQuery}". Return up to 5 results.

Return ONLY a JSON array in this exact format with no markdown:
[{"symbol": "AAPL", "name": "Apple Inc.", "type": "Stock", "exchange": "NASDAQ", "price": 178.50, "change": 2.30, "changePercent": 1.31}]

Include:
- symbol: the ticker symbol (uppercase)
- name: full company/fund name
- type: "Stock" or "ETF"
- exchange: primary exchange (NYSE, NASDAQ, etc.)
- price: current price in USD (number)
- change: price change today in USD (number, can be negative)
- changePercent: percentage change today (number, can be negative)

If no matches found, return an empty array: []`
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Search request failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in Perplexity response');
      return new Response(
        JSON.stringify({ success: true, data: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Raw Perplexity response:', content);

    // Extract JSON from response
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

    let results: TickerResult[];
    try {
      results = JSON.parse(jsonStr);
      if (!Array.isArray(results)) {
        results = [];
      }
    } catch (parseError) {
      console.error('Failed to parse ticker results:', parseError);
      results = [];
    }

    // Validate and sanitize results
    const validatedResults = results.slice(0, 5).map((r) => ({
      symbol: String(r.symbol || '').toUpperCase().slice(0, 10),
      name: String(r.name || '').slice(0, 100),
      type: r.type === 'ETF' ? 'ETF' : 'Stock',
      exchange: String(r.exchange || '').slice(0, 20),
      price: typeof r.price === 'number' ? r.price : undefined,
      change: typeof r.change === 'number' ? r.change : undefined,
      changePercent: typeof r.changePercent === 'number' ? r.changePercent : undefined,
    })).filter((r) => r.symbol && r.name);

    console.log('Returning results:', validatedResults);

    return new Response(
      JSON.stringify({ success: true, data: validatedResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching tickers:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
