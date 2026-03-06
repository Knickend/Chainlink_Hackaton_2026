// api-dca-strategy: x402 Monetized DCA Strategy API
// Price: $0.01 per request
// Exposes DCA strategy data for external AI agents

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createPaymentChallenge,
  verifyPayment,
  create402Response,
  createSuccessResponse,
  createErrorResponse,
  handleCors,
} from "../_shared/x402.ts";

const PRICE_CENTS = 1; // $0.01

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const resource = url.pathname;

    // Check for X-Payment header
    const paymentHeader = req.headers.get("X-Payment");

    if (!paymentHeader) {
      console.log("No payment header, returning 402 challenge");
      const challenge = createPaymentChallenge(
        PRICE_CENTS,
        resource,
        "DCA Strategy API - Dollar-cost averaging strategies, execution history, and performance stats"
      );
      return create402Response(challenge);
    }

    // Verify payment
    console.log("Verifying payment...");
    const verification = await verifyPayment(paymentHeader, resource, PRICE_CENTS);

    if (!verification.valid) {
      console.log("Payment verification failed:", verification.error);
      return createErrorResponse(verification.error || "Payment verification failed", 402);
    }

    console.log("Payment verified, serving DCA data...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request params
    const activeOnly = url.searchParams.get("active") === "true";
    const strategyId = url.searchParams.get("strategyId");
    let action: string | null = null;

    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try {
        const body = await req.json();
        action = body.action || null;
      } catch {
        // empty body ok
      }
    }

    // Single strategy with full execution history
    if (strategyId) {
      const { data: strategy, error: sErr } = await supabase
        .from("dca_strategies")
        .select("*")
        .eq("id", strategyId)
        .single();

      if (sErr || !strategy) {
        return createErrorResponse("Strategy not found", 404);
      }

      const { data: executions } = await supabase
        .from("dca_executions")
        .select("*")
        .eq("strategy_id", strategyId)
        .order("created_at", { ascending: false })
        .limit(50);

      return createSuccessResponse({
        timestamp: new Date().toISOString(),
        strategy: {
          id: strategy.id,
          from_token: strategy.from_token,
          to_token: strategy.to_token,
          frequency: strategy.frequency,
          amount_per_execution: strategy.amount_per_execution,
          total_spent_usd: strategy.total_spent_usd,
          tokens_accumulated: strategy.tokens_accumulated,
          executions_completed: strategy.executions_completed,
          is_active: strategy.is_active,
          dip_threshold_pct: strategy.dip_threshold_pct,
          dip_multiplier: strategy.dip_multiplier,
          next_execution_at: strategy.next_execution_at,
          created_at: strategy.created_at,
          recent_executions: (executions || []).map((e: Record<string, unknown>) => ({
            amount_usd: e.amount_usd,
            token_amount: e.token_amount,
            token_price_usd: e.token_price_usd,
            trigger_type: e.trigger_type,
            status: e.status,
            created_at: e.created_at,
          })),
        },
        paymentDetails: {
          amountPaid: `$${(PRICE_CENTS / 100).toFixed(2)}`,
          paidBy: verification.paymentDetails?.from,
          txHash: verification.paymentDetails?.txHash,
        },
      });
    }

    // Summary mode
    if (action === "summary") {
      const { data: strategies } = await supabase
        .from("dca_strategies")
        .select("*");

      const { data: executions } = await supabase
        .from("dca_executions")
        .select("trigger_type, status");

      const allStrats = strategies || [];
      const allExecs = executions || [];
      const dipBuys = allExecs.filter((e: Record<string, unknown>) => e.trigger_type === "dip_buy");

      return createSuccessResponse({
        timestamp: new Date().toISOString(),
        summary: {
          total_invested: allStrats.reduce((s: number, st: Record<string, unknown>) => s + (Number(st.total_spent_usd) || 0), 0),
          active_strategies: allStrats.filter((s: Record<string, unknown>) => s.is_active).length,
          total_strategies: allStrats.length,
          total_executions: allExecs.length,
          dip_buys_triggered: dipBuys.length,
          success_rate: allExecs.length > 0
            ? Math.round((allExecs.filter((e: Record<string, unknown>) => e.status === "completed").length / allExecs.length) * 100)
            : 0,
        },
        paymentDetails: {
          amountPaid: `$${(PRICE_CENTS / 100).toFixed(2)}`,
          paidBy: verification.paymentDetails?.from,
          txHash: verification.paymentDetails?.txHash,
        },
      });
    }

    // Default: list strategies
    let query = supabase
      .from("dca_strategies")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data: strategies, error } = await query;
    if (error) {
      return createErrorResponse("Failed to fetch strategies", 500);
    }

    // Get recent executions for each strategy
    const strategyIds = (strategies || []).map((s: Record<string, unknown>) => s.id);
    const { data: recentExecs } = strategyIds.length > 0
      ? await supabase
          .from("dca_executions")
          .select("*")
          .in("strategy_id", strategyIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [] };

    const execsByStrategy: Record<string, unknown[]> = {};
    (recentExecs || []).forEach((e: Record<string, unknown>) => {
      const sid = e.strategy_id as string;
      if (!execsByStrategy[sid]) execsByStrategy[sid] = [];
      if (execsByStrategy[sid].length < 10) {
        execsByStrategy[sid].push({
          amount_usd: e.amount_usd,
          token_amount: e.token_amount,
          token_price_usd: e.token_price_usd,
          trigger_type: e.trigger_type,
          status: e.status,
          created_at: e.created_at,
        });
      }
    });

    const enrichedStrategies = (strategies || []).map((s: Record<string, unknown>) => ({
      id: s.id,
      from_token: s.from_token,
      to_token: s.to_token,
      frequency: s.frequency,
      amount_per_execution: s.amount_per_execution,
      total_spent_usd: s.total_spent_usd,
      tokens_accumulated: s.tokens_accumulated,
      executions_completed: s.executions_completed,
      is_active: s.is_active,
      dip_threshold_pct: s.dip_threshold_pct,
      dip_multiplier: s.dip_multiplier,
      next_execution_at: s.next_execution_at,
      recent_executions: execsByStrategy[s.id as string] || [],
    }));

    const allExecs = recentExecs || [];
    const dipBuys = allExecs.filter((e: Record<string, unknown>) => e.trigger_type === "dip_buy");

    return createSuccessResponse({
      timestamp: new Date().toISOString(),
      strategies: enrichedStrategies,
      summary: {
        total_invested: (strategies || []).reduce((s: number, st: Record<string, unknown>) => s + (Number(st.total_spent_usd) || 0), 0),
        active_strategies: (strategies || []).filter((s: Record<string, unknown>) => s.is_active).length,
        total_executions: (strategies || []).reduce((s: number, st: Record<string, unknown>) => s + (Number(st.executions_completed) || 0), 0),
        dip_buys_triggered: dipBuys.length,
      },
      paymentDetails: {
        amountPaid: `$${(PRICE_CENTS / 100).toFixed(2)}`,
        paidBy: verification.paymentDetails?.from,
        txHash: verification.paymentDetails?.txHash,
      },
    });
  } catch (error) {
    console.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Server error: ${errorMessage}`, 500);
  }
});
