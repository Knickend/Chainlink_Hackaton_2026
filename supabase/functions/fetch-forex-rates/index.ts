import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-name, x-supabase-client-version',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Supported currencies (excluding USD as it's the base)
const SUPPORTED_CURRENCIES = [
  'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'CNY', 'INR', 'SGD', 'HKD',
  'NZD', 'SEK', 'NOK', 'DKK', 'ZAR', 'BRL', 'MXN', 'KRW', 'THB', 'COP'
];

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for forex rates

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching forex rates...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cachedRates, error: cacheError } = await supabase
      .from('price_cache')
      .select('*')
      .eq('asset_type', 'forex');

    if (cacheError) {
      console.error('Cache read error:', cacheError);
    }

    const now = Date.now();
    const results: Record<string, number> = { USD: 1 }; // USD is always 1
    let isCached = true;
    let oldestUpdate = now;

    // Check if we have valid cache for all currencies
    let needsFetch = false;
    
    if (cachedRates && cachedRates.length > 0) {
      for (const currency of SUPPORTED_CURRENCIES) {
        const cached = cachedRates.find(p => p.symbol === currency);
        if (cached) {
          const cacheAge = now - new Date(cached.updated_at).getTime();
          if (cacheAge < CACHE_TTL_MS) {
            // Cache is valid, use it
            results[currency] = Number(cached.price);
            oldestUpdate = Math.min(oldestUpdate, new Date(cached.updated_at).getTime());
          } else {
            needsFetch = true;
          }
        } else {
          needsFetch = true;
        }
      }
    } else {
      needsFetch = true;
    }

    // If cache is stale or missing, fetch fresh rates
    if (needsFetch) {
      console.log('Fetching fresh forex rates from Frankfurter API...');
      isCached = false;
      
      try {
        const currencyList = SUPPORTED_CURRENCIES.join(',');
        const response = await fetch(
          `https://api.frankfurter.app/latest?from=USD&to=${currencyList}`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('Frankfurter API response:', JSON.stringify(data));

          if (data.rates) {
            const cacheUpdates: Array<{
              symbol: string;
              price: number;
              asset_type: string;
            }> = [];

            for (const [currency, rate] of Object.entries(data.rates)) {
              const numRate = Number(rate);
              if (numRate > 0) {
                // Store the rate as USD -> Currency (how many units of currency per 1 USD)
                results[currency] = numRate;
                
                cacheUpdates.push({
                  symbol: currency,
                  price: numRate,
                  asset_type: 'forex',
                });
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
            
            console.log('Forex cache updated for:', cacheUpdates.map(u => u.symbol).join(', '));
            oldestUpdate = now;
          }
        } else {
          console.error('Frankfurter API error:', response.status, await response.text());
          
          // Fall back to any cached values we have
          if (cachedRates) {
            for (const cached of cachedRates) {
              if (!results[cached.symbol] || results[cached.symbol] === undefined) {
                results[cached.symbol] = Number(cached.price);
              }
            }
          }
          isCached = true;
        }
      } catch (apiError) {
        console.error('Frankfurter API fetch error:', apiError);
        
        // Fall back to cached values
        if (cachedRates) {
          for (const cached of cachedRates) {
            if (!results[cached.symbol] || results[cached.symbol] === undefined) {
              results[cached.symbol] = Number(cached.price);
            }
          }
        }
        isCached = true;
      }
    } else {
      console.log('Using cached forex rates');
    }

    console.log('Final forex results:', Object.keys(results).length, 'currencies');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: results,
        timestamp: new Date(oldestUpdate).toISOString(),
        cached: isCached,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching forex rates:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch forex rates' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
