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

    // Calculate totals
    const totalAssets = (assets || []).reduce((sum, a) => sum + Number(a.value || 0), 0);
    const totalDebt = (debts || []).reduce((sum, d) => sum + Number(d.principal_amount || 0), 0);
    const netWorth = totalAssets - totalDebt;
    const totalIncome = (income || []).reduce((sum, i) => sum + Number(i.amount || 0), 0);
    
    // Only count recurring expenses for monthly total
    const totalExpenses = (expenses || [])
      .filter(e => e.is_recurring)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Calculate breakdown by category
    const assetsBreakdown: AssetsBreakdown = {
      banking: 0,
      crypto: 0,
      stocks: 0,
      commodities: 0,
    };

    for (const asset of (assets || [])) {
      const category = asset.category as keyof AssetsBreakdown;
      if (category in assetsBreakdown) {
        assetsBreakdown[category] += Number(asset.value || 0);
      }
    }

    console.log(`Calculated values - Net Worth: ${netWorth}, Assets: ${totalAssets}, Debt: ${totalDebt}`);

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
