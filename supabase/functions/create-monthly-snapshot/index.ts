import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AssetsBreakdown {
  banking: number;
  crypto: number;
  stocks: number;
  commodities: number;
  realestate: number;
}

// Static forex rates (fallback when live rates unavailable)
const FOREX_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CHF: 1.13,
  JPY: 0.0064,
  CAD: 0.74,
  AUD: 0.65,
  CNY: 0.14,
  INR: 0.012,
  SGD: 0.74,
  HKD: 0.13,
  NZD: 0.60,
  SEK: 0.095,
  NOK: 0.093,
  DKK: 0.145,
  ZAR: 0.055,
  BRL: 0.20,
  MXN: 0.058,
  KRW: 0.00073,
  THB: 0.029,
  COP: 0.00024,
};

// Get live forex rates from price_cache (USD→Currency rates)
async function getLiveForexRates(supabase: any): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('price_cache')
    .select('symbol, price')
    .eq('asset_type', 'forex');
  
  const rates: Record<string, number> = { USD: 1 };
  if (data) {
    for (const row of data) {
      // price_cache stores USD→Currency rate, we need Currency→USD
      rates[row.symbol] = 1 / Number(row.price);
    }
  }
  return rates;
}

// Convert any currency to USD
function convertToUSD(
  amount: number, 
  currency: string, 
  forexRates: Record<string, number>,
  btcPrice: number
): number {
  const curr = (currency || 'USD').trim().toUpperCase();
  
  // Handle Bitcoin currencies
  if (curr === 'SATS') {
    return (amount / 100_000_000) * btcPrice;
  }
  if (curr === 'BTC') {
    return amount * btcPrice;
  }
  
  // Handle fiat - prioritize live rates, fallback to static
  const rate = forexRates[curr] || FOREX_RATES_TO_USD[curr] || 1;
  return amount * rate;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token to get user_id
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Creating snapshot for user: ${userId}`);

    // Parse request body for optional month override
    let targetMonth: Date;
    try {
      const body = await req.json();
      if (body.month) {
        targetMonth = new Date(body.month);
      } else {
        targetMonth = new Date();
      }
    } catch {
      targetMonth = new Date();
    }

    // Normalize to first of month
    targetMonth.setDate(1);
    targetMonth.setHours(0, 0, 0, 0);
    const snapshotMonth = targetMonth.toISOString().split('T')[0];

    console.log(`Target snapshot month: ${snapshotMonth}`);

    // Create service role client for data fetching
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch live forex rates and BTC price for currency conversion
    const forexRates = await getLiveForexRates(serviceClient);
    const { data: btcCache } = await serviceClient
      .from('price_cache')
      .select('price')
      .eq('symbol', 'BTC')
      .single();
    const btcPrice = btcCache?.price ? Number(btcCache.price) : 96000;

    console.log(`Using BTC price: ${btcPrice}, Forex rates loaded: ${Object.keys(forexRates).length}`);

    // Fetch current assets
    const { data: assets, error: assetsError } = await serviceClient
      .from('assets')
      .select('*')
      .eq('user_id', userId);

    if (assetsError) {
      console.error('Assets fetch error:', assetsError);
      throw assetsError;
    }

    // Fetch current income
    const { data: income, error: incomeError } = await serviceClient
      .from('income')
      .select('*')
      .eq('user_id', userId);

    if (incomeError) {
      console.error('Income fetch error:', incomeError);
      throw incomeError;
    }

    // Fetch current expenses
    const { data: expenses, error: expensesError } = await serviceClient
      .from('expenses')
      .select('*')
      .eq('user_id', userId);

    if (expensesError) {
      console.error('Expenses fetch error:', expensesError);
      throw expensesError;
    }

    // Fetch current debts
    const { data: debts, error: debtsError } = await serviceClient
      .from('debts')
      .select('*')
      .eq('user_id', userId);

    if (debtsError) {
      console.error('Debts fetch error:', debtsError);
      throw debtsError;
    }

    // Calculate totals with proper currency conversion to USD
    const totalAssets = (assets || []).reduce((sum, asset) => {
      if (asset.category === 'banking') {
        // For banking assets, use native currency amount (quantity) and convert to USD
        const nativeAmount = Number(asset.quantity ?? asset.value ?? 0);
        const currency = (asset.symbol || 'USD').trim().toUpperCase();
        return sum + convertToUSD(nativeAmount, currency, forexRates, btcPrice);
      }
      // For non-banking assets, value is already in USD
      return sum + Number(asset.value || 0);
    }, 0);
    
    const totalDebt = (debts || []).reduce((sum, d) => {
      const currency = (d.currency || 'USD').trim().toUpperCase();
      return sum + convertToUSD(Number(d.principal_amount || 0), currency, forexRates, btcPrice);
    }, 0);
    
    const netWorth = totalAssets - totalDebt;
    
    // Calculate income with proper currency conversion (all income, recurring + one-time)
    const totalIncome = (income || []).reduce((sum, i) => {
      const currency = (i.currency || 'USD').trim().toUpperCase();
      return sum + convertToUSD(Number(i.amount || 0), currency, forexRates, btcPrice);
    }, 0);
    
    // Calculate expenses with proper currency conversion (all expenses, recurring + one-time)
    const totalExpenses = (expenses || []).reduce((sum, e) => {
      const currency = (e.currency || 'USD').trim().toUpperCase();
      return sum + convertToUSD(Number(e.amount || 0), currency, forexRates, btcPrice);
    }, 0);

    // Calculate monthly debt payments with proper currency conversion
    const monthlyDebtPayments = (debts || []).reduce((sum, d) => {
      if (!d.monthly_payment) return sum;
      const currency = (d.currency || 'USD').trim().toUpperCase();
      return sum + convertToUSD(Number(d.monthly_payment), currency, forexRates, btcPrice);
    }, 0);

    // Calculate breakdown by category
    const assetsBreakdown: AssetsBreakdown = {
      banking: 0,
      crypto: 0,
      stocks: 0,
      commodities: 0,
      realestate: 0,
    };

    for (const asset of (assets || [])) {
      const category = asset.category as keyof AssetsBreakdown;
      if (category in assetsBreakdown) {
        if (category === 'banking') {
          // Use native currency amount for banking assets
          const nativeAmount = Number(asset.quantity ?? asset.value ?? 0);
          const currency = (asset.symbol || 'USD').trim().toUpperCase();
          assetsBreakdown[category] += convertToUSD(nativeAmount, currency, forexRates, btcPrice);
        } else {
          assetsBreakdown[category] += Number(asset.value || 0);
        }
      }
    }

    console.log(`Calculated values - Net Worth: ${netWorth}, Assets: ${totalAssets}, Debt: ${totalDebt}, Income: ${totalIncome}, Expenses: ${totalExpenses}, Debt Payments: ${monthlyDebtPayments}`);

    // Upsert snapshot (update if exists for this month)
    const { data: snapshot, error: snapshotError } = await serviceClient
      .from('portfolio_snapshots')
      .upsert({
        user_id: userId,
        snapshot_month: snapshotMonth,
        net_worth: netWorth,
        total_assets: totalAssets,
        total_debt: totalDebt,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        monthly_debt_payments: monthlyDebtPayments,
        assets_breakdown: assetsBreakdown,
      }, {
        onConflict: 'user_id,snapshot_month'
      })
      .select()
      .single();

    if (snapshotError) {
      console.error('Snapshot upsert error:', snapshotError);
      throw snapshotError;
    }

    console.log(`Snapshot created/updated successfully: ${snapshot.id}`);

    return new Response(
      JSON.stringify({ success: true, snapshot }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating snapshot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create snapshot';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
