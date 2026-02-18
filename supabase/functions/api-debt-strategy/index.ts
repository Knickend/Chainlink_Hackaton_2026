// api-debt-strategy: x402 Monetized Debt Optimization API
// Price: $0.02 per request
// Supports: GET (query params) and POST/PUT/PATCH (request body)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createPaymentChallenge,
  verifyPayment,
  create402Response,
  createSuccessResponse,
  createErrorResponse,
  handleCors,
} from "../_shared/x402.ts";

const PRICE_CENTS = 2; // $0.02

// Input validation
const FIELD_REGEX = /^[a-zA-Z0-9_-]{1,30}$/;

function sanitizeField(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return FIELD_REGEX.test(trimmed) ? trimmed : null;
}

interface Filters {
  debtType: string | null;
}

async function parseFilters(req: Request, url: URL): Promise<Filters> {
  const filters: Filters = {
    debtType: null,
  };

  if (req.method === "GET") {
    filters.debtType = sanitizeField(url.searchParams.get("debtType") || url.searchParams.get("type"));
  } else if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try {
      const body = await req.json();
      filters.debtType = sanitizeField(body.debtType || body.type || null);
    } catch {
      // Empty body is OK, use defaults
    }
  }

  return filters;
}

Deno.serve(async (req) => {
  // Handle CORS
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
        "Debt Strategy API - Debt payoff recommendations and optimization analysis"
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

    console.log("Payment verified, serving data...");

    const filters = await parseFilters(req, url);

    // Use anon key - only access pre-aggregated data via RPC
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get pre-aggregated debt stats from materialized view via RPC
    const { data: debtStats } = await supabase.rpc("get_aggregated_debt_stats");

    // Filter by debt type if requested
    let filteredStats = debtStats || [];
    if (filters.debtType) {
      filteredStats = filteredStats.filter((row: { debt_type: string }) => row.debt_type === filters.debtType);
    }

    const debtAnalysis = filteredStats
      .map((row: { debt_type: string; avg_interest_rate: number; debt_count: number }) => ({
        debtType: row.debt_type,
        avgInterestRate: Math.round((row.avg_interest_rate || 0) * 100) / 100,
        totalCount: Number(row.debt_count),
      }))
      .sort((a: { avgInterestRate: number }, b: { avgInterestRate: number }) => b.avgInterestRate - a.avgInterestRate);

    // Generate payoff strategies
    const strategies = [];

    const highestRateDebt = debtAnalysis[0];
    if (highestRateDebt && highestRateDebt.avgInterestRate > 15) {
      strategies.push({
        strategy: "avalanche",
        priority: "high",
        recommendation: `Focus on ${highestRateDebt.debtType} debt first (avg ${highestRateDebt.avgInterestRate}% APR)`,
        estimatedSavings: "Highest interest savings over time",
        difficulty: "moderate",
      });
    }

    if (debtAnalysis.length > 2) {
      strategies.push({
        strategy: "consolidation",
        priority: "medium",
        recommendation: "Multiple debt types detected - consider consolidation for simplified payments",
        estimatedSavings: "Potentially lower blended rate",
        difficulty: "easy",
      });
    }

    strategies.push({
      strategy: "snowball",
      priority: "medium",
      recommendation: "Pay smallest balances first for psychological wins and momentum",
      estimatedSavings: "Lower than avalanche, but higher completion rate",
      difficulty: "easy",
    });

    if (debtAnalysis.some((d: { debtType: string }) => d.debtType === "credit_card")) {
      strategies.push({
        strategy: "balance_transfer",
        priority: "high",
        recommendation: "Look for 0% APR balance transfer offers to pause interest accumulation",
        estimatedSavings: "12-18 months of zero interest",
        difficulty: "moderate",
      });
    }

    const response = {
      timestamp: new Date().toISOString(),
      request: {
        method: req.method,
        filters: {
          debtType: filters.debtType || "all",
        },
      },
      debtAnalysis: {
        byType: debtAnalysis,
        totalDebtTypes: debtAnalysis.length,
      },
      payoffStrategies: strategies,
      generalGuidance: {
        priorityOrder: ["high-interest debt", "tax-deductible debt", "low-interest debt"],
        keyMetrics: ["debt-to-income ratio", "interest coverage", "payoff timeline"],
      },
      paymentDetails: {
        amountPaid: `$${(PRICE_CENTS / 100).toFixed(2)}`,
        paidBy: verification.paymentDetails?.from,
        txHash: verification.paymentDetails?.txHash,
      },
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Server error: ${errorMessage}`, 500);
  }
});
