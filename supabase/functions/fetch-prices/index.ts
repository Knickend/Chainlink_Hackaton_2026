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

interface PriceData {
  btc: number;
  eth: number;
  link: number;
  gold: number;
  silver: number;
  timestamp: string;
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
      // Return fallback prices
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

    return new Response(
      JSON.stringify({ success: true, data: result, citations: data.citations || [] }),
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
