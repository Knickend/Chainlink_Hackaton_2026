import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Strategy {
  id: string;
  to_token: string;
  from_token: string;
  amount_per_execution: number;
  frequency: string;
  dip_threshold_pct: number | null;
  dip_multiplier: number | null;
  is_active: boolean;
  last_executed_at: string | null;
  next_execution_at: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { strategies } = await req.json() as { strategies: Strategy[] };
    const logs: { step: string; status: string; message: string }[] = [];

    // Step 1: Cron trigger
    logs.push({ step: 'cron', status: 'success', message: 'Triggered at ' + new Date().toISOString().slice(11, 19) });

    // Step 2: Fetch strategies
    const active = (strategies || []).filter(s => s.is_active);
    logs.push({ step: 'fetch', status: 'success', message: `Found ${active.length} active strateg${active.length === 1 ? 'y' : 'ies'}` });

    if (active.length === 0) {
      logs.push({ step: 'filter', status: 'skipped', message: 'No active strategies' });
      logs.push({ step: 'price', status: 'skipped', message: 'Skipping — nothing due' });
      logs.push({ step: 'execute', status: 'skipped', message: 'Skipping — nothing to execute' });
      return new Response(JSON.stringify({ logs, summary: 'No active strategies to process.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Filter due strategies (simulate frequency check)
    const now = Date.now();
    const due = active.filter(s => {
      if (!s.next_execution_at) return true; // never run
      return new Date(s.next_execution_at).getTime() <= now;
    });

    if (due.length === 0) {
      logs.push({ step: 'filter', status: 'skipped', message: 'Skipping — no strategies due yet' });
      logs.push({ step: 'price', status: 'skipped', message: 'Skipping — nothing due' });
      logs.push({ step: 'execute', status: 'skipped', message: 'Skipping — nothing to execute' });
      return new Response(JSON.stringify({ logs, summary: `${active.length} active strategies, none due for execution.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logs.push({ step: 'filter', status: 'success', message: `${due.length} strateg${due.length === 1 ? 'y' : 'ies'} due` });

    // Step 4: Get mock prices
    const mockPrices: Record<string, number> = { WETH: 3245.50, ETH: 3245.50, cbBTC: 98750.00 };
    const tokens = [...new Set(due.map(s => s.to_token))];
    const priceInfo = tokens.map(t => `${t}: $${mockPrices[t]?.toLocaleString() || '?'}`).join(', ');
    logs.push({ step: 'price', status: 'success', message: priceInfo });

    // Step 5: Execute (simulated)
    const totalUsd = due.reduce((sum, s) => {
      const dipActive = (s.dip_threshold_pct ?? 0) > 0;
      const mult = dipActive ? (s.dip_multiplier ?? 1) : 1;
      return sum + s.amount_per_execution * mult;
    }, 0);
    logs.push({ step: 'execute', status: 'success', message: `Simulated $${totalUsd.toFixed(2)} across ${due.length} trade(s)` });

    const summary = `Simulation complete: ${due.length} trade(s) totaling $${totalUsd.toFixed(2)} would be executed.`;

    return new Response(JSON.stringify({ logs, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
