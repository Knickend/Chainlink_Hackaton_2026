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
}

interface SnapshotResult {
  user_id: string;
  success: boolean;
  error?: string;
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    let isAuthorized = false;
    let triggeredBy = 'unknown';

    // Check if it's the service role key (from cron job)
    if (token === supabaseServiceKey) {
      isAuthorized = true;
      triggeredBy = 'cron';
      console.log('Authorized with service role key (cron job)');
    } else {
      // Check if it's a valid admin user JWT
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      
      if (!userError && user) {
        // Check if user has admin role
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
        const { data: roleData } = await serviceClient
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        
        if (roleData) {
          isAuthorized = true;
          triggeredBy = 'admin';
          console.log(`Authorized as admin user: ${user.id}`);
        }
      }
    }

    if (!isAuthorized) {
      console.log('Unauthorized: Not service role or admin user');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin or service role required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting bulk snapshot creation (triggered by: ${triggeredBy})`);

    // Create service role client for data fetching (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch live forex rates and BTC price for currency conversion
    const forexRates = await getLiveForexRates(supabase);
    const { data: btcCache } = await supabase
      .from('price_cache')
      .select('price')
      .eq('symbol', 'BTC')
      .single();
    const btcPrice = btcCache?.price ? Number(btcCache.price) : 96000;

    console.log(`Using BTC price: ${btcPrice}, Forex rates loaded: ${Object.keys(forexRates).length}`);

    // Get current month (first of month)
    const now = new Date();
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
    const snapshotMonth = now.toISOString().split('T')[0];

    console.log(`Creating snapshots for month: ${snapshotMonth}`);

    // Fetch all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id');

    if (profilesError) {
      console.error('Failed to fetch profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No user profiles found');
      return new Response(
        JSON.stringify({ processed: 0, succeeded: 0, failed: 0, message: 'No users to process' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${profiles.length} user profiles to process`);

    const results: SnapshotResult[] = [];
    let succeeded = 0;
    let failed = 0;

    // Process each user
    for (const profile of profiles) {
      const userId = profile.user_id;
      
      try {
        console.log(`Processing user: ${userId}`);

        // Fetch user's financial data in parallel
        const [assetsResult, debtsResult, incomeResult, expensesResult] = await Promise.all([
          supabase.from('assets').select('*').eq('user_id', userId),
          supabase.from('debts').select('*').eq('user_id', userId),
          supabase.from('income').select('*').eq('user_id', userId),
          supabase.from('expenses').select('*').eq('user_id', userId),
        ]);

        if (assetsResult.error) throw assetsResult.error;
        if (debtsResult.error) throw debtsResult.error;
        if (incomeResult.error) throw incomeResult.error;
        if (expensesResult.error) throw expensesResult.error;

        const assets = assetsResult.data || [];
        const debts = debtsResult.data || [];
        const income = incomeResult.data || [];
        const expenses = expensesResult.data || [];

        // Calculate totals with proper currency conversion to USD
        const totalAssets = assets.reduce((sum, a) => sum + Number(a.value || 0), 0);
        
        const totalDebt = debts.reduce((sum, d) => {
          const currency = (d.currency || 'USD').trim().toUpperCase();
          return sum + convertToUSD(Number(d.principal_amount || 0), currency, forexRates, btcPrice);
        }, 0);
        
        const netWorth = totalAssets - totalDebt;
        
        // Calculate income with proper currency conversion (all income, recurring + one-time)
        const totalIncome = income.reduce((sum, i) => {
          const currency = (i.currency || 'USD').trim().toUpperCase();
          return sum + convertToUSD(Number(i.amount || 0), currency, forexRates, btcPrice);
        }, 0);
        
        // Calculate expenses with proper currency conversion (all expenses, recurring + one-time)
        const totalExpenses = expenses.reduce((sum, e) => {
          const currency = (e.currency || 'USD').trim().toUpperCase();
          return sum + convertToUSD(Number(e.amount || 0), currency, forexRates, btcPrice);
        }, 0);

        // Calculate monthly debt payments with proper currency conversion
        const monthlyDebtPayments = debts.reduce((sum, d) => {
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
        };

        for (const asset of assets) {
          const category = asset.category as keyof AssetsBreakdown;
          if (category in assetsBreakdown) {
            assetsBreakdown[category] += Number(asset.value || 0);
          }
        }

        console.log(`User ${userId} - Net Worth: ${netWorth}, Assets: ${totalAssets}, Debt: ${totalDebt}, Income: ${totalIncome}`);

        // Upsert snapshot (update if exists for this month)
        const { error: snapshotError } = await supabase
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
          });

        if (snapshotError) throw snapshotError;

        results.push({ user_id: userId, success: true });
        succeeded++;
        console.log(`Successfully created snapshot for user: ${userId}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to create snapshot for user ${userId}:`, errorMessage);
        results.push({ user_id: userId, success: false, error: errorMessage });
        failed++;
      }
    }

    const summary = {
      processed: profiles.length,
      succeeded,
      failed,
      snapshot_month: snapshotMonth,
      timestamp: new Date().toISOString(),
    };

    console.log('Bulk snapshot creation completed:', summary);

    // Log execution to cron_job_logs
    const status = failed === 0 ? 'success' : (succeeded > 0 ? 'partial' : 'failed');
    await supabase.from('cron_job_logs').insert({
      job_name: 'create-bulk-snapshots',
      status,
      processed_count: profiles.length,
      succeeded_count: succeeded,
      failed_count: failed,
      details: { snapshot_month: snapshotMonth, triggered_by: triggeredBy, results }
    });

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in bulk snapshot creation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create bulk snapshots';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
