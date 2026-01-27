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
  priceUnit?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Search service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse optional asset type filter from request body
    const body = await req.json().catch(() => ({}));
    const { query: rawQuery, assetType } = body;
    const query = rawQuery || body.query;
    
    if (!query || typeof query !== 'string' || query.length < 1) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required (min 1 character)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedQuery = query.trim().slice(0, 50);
    const searchType = assetType === 'crypto' ? 'crypto' : assetType === 'commodities' ? 'commodities' : 'stocks';
    
    console.log(`Searching for ${searchType}: "${sanitizedQuery}"`);

    const systemPrompt = 'You are a financial data assistant. Return ONLY valid JSON arrays with no additional text or markdown formatting.';
    
    let userPrompt: string;
    
    if (searchType === 'crypto') {
      userPrompt = `Search for cryptocurrencies matching "${sanitizedQuery}". Return up to 8 results.

Return ONLY a JSON array in this exact format with no markdown:
[{"symbol": "BTC", "name": "Bitcoin", "type": "Crypto", "exchange": "Crypto", "price": 97000.00, "change": 1500.00, "changePercent": 1.57}]

Include popular cryptocurrencies that match the query by name or symbol. Examples: Bitcoin (BTC), Ethereum (ETH), Chainlink (LINK), Solana (SOL), Cardano (ADA), Polkadot (DOT), Avalanche (AVAX), Polygon (MATIC), etc.

Include:
- symbol: the ticker symbol (uppercase, e.g., BTC, ETH, SOL)
- name: full cryptocurrency name
- type: always "Crypto"
- exchange: always "Crypto"
- price: current price in USD (number)
- change: 24h price change in USD (number, can be negative)
- changePercent: 24h percentage change (number, can be negative)

If no matches found, return an empty array: []`;
    } else if (searchType === 'commodities') {
      userPrompt = `Search for commodities matching "${sanitizedQuery}". Return up to 8 results.

Return ONLY a JSON array in this exact format with no markdown:
[{"symbol": "GOLD", "name": "Gold", "type": "Commodity", "exchange": "COMEX", "price": 2650.00, "change": 15.00, "changePercent": 0.57, "priceUnit": "per oz"}]

Include precious metals, industrial metals, energy, and agricultural commodities. Common examples:
- Precious metals: Gold (GOLD/XAU), Silver (SILVER/XAG), Platinum (PLATINUM/XPT), Palladium (PALLADIUM/XPD)
- Industrial metals: Copper (COPPER), Aluminum (ALUMINUM), Nickel (NICKEL), Zinc (ZINC), Lead (LEAD)
- Energy: Crude Oil (WTI/CRUDE), Brent Crude (BRENT), Natural Gas (NATGAS)
- Agricultural: Wheat (WHEAT), Corn (CORN), Soybeans (SOYBEAN), Coffee (COFFEE), Sugar (SUGAR), Cotton (COTTON)

Include:
- symbol: the ticker symbol (uppercase, e.g., GOLD, SILVER, COPPER, WTI)
- name: full commodity name
- type: always "Commodity"
- exchange: the primary exchange (COMEX, NYMEX, CBOT, ICE, LME, etc.)
- price: current price in USD per troy ounce for metals, per barrel for oil, per unit for others (number)
- change: price change today in USD (number, can be negative)
- changePercent: percentage change today (number, can be negative)
- priceUnit: the unit the price is quoted in (e.g., "per oz", "per barrel", "per lb", "per bushel")

If no matches found, return an empty array: []`;
    } else {
      userPrompt = `Search for stocks and ETFs matching "${sanitizedQuery}". Return up to 5 results.

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

If no matches found, return an empty array: []`;
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
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
    const validatedResults = results.slice(0, 8).map((r) => ({
      symbol: String(r.symbol || '').toUpperCase().slice(0, 10),
      name: String(r.name || '').slice(0, 100),
      type: r.type === 'ETF' ? 'ETF' : (r.type === 'Crypto' ? 'Crypto' : (r.type === 'Commodity' ? 'Commodity' : 'Stock')),
      exchange: String(r.exchange || '').slice(0, 20),
      price: typeof r.price === 'number' ? r.price : undefined,
      change: typeof r.change === 'number' ? r.change : undefined,
      changePercent: typeof r.changePercent === 'number' ? r.changePercent : undefined,
      priceUnit: typeof r.priceUnit === 'string' ? r.priceUnit.slice(0, 20) : undefined,
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
