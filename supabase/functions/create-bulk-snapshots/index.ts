import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify service role authorization (cron job will use service role key)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Accept either service role key or validate it's coming from a system context
    // For pg_cron, we pass the service role key directly
    if (token !== supabaseServiceKey) {
      // If not service role key, reject
      console.log('Unauthorized: Token does not match service role key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Service role required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authorized with service role key - starting bulk snapshot creation');

    // Create service role client for data fetching (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

        // Calculate totals
        const totalAssets = assets.reduce((sum, a) => sum + Number(a.value || 0), 0);
        const totalDebt = debts.reduce((sum, d) => sum + Number(d.principal_amount || 0), 0);
        const netWorth = totalAssets - totalDebt;
        const totalIncome = income.reduce((sum, i) => sum + Number(i.amount || 0), 0);
        
        // Only count recurring expenses for monthly total
        const totalExpenses = expenses
          .filter(e => e.is_recurring)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);

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

        console.log(`User ${userId} - Net Worth: ${netWorth}, Assets: ${totalAssets}, Debt: ${totalDebt}`);

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
      details: { snapshot_month: snapshotMonth, results }
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
