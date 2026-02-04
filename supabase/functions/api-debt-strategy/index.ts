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

interface Filters {
  debtType: string | null;
  minInterestRate: number | null;
  limit: number;
}

async function parseFilters(req: Request, url: URL): Promise<Filters> {
  const filters: Filters = {
    debtType: null,
    minInterestRate: null,
    limit: 500,
  };

  if (req.method === "GET") {
    filters.debtType = url.searchParams.get("debtType") || url.searchParams.get("type");
    const minRateParam = url.searchParams.get("minInterestRate") || url.searchParams.get("minRate");
    if (minRateParam) {
      filters.minInterestRate = parseFloat(minRateParam);
    }
    const limitParam = url.searchParams.get("limit");
    if (limitParam) {
      filters.limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 500), 1000);
    }
  } else if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try {
      const body = await req.json();
      filters.debtType = body.debtType || body.type || null;
      if (body.minInterestRate !== undefined || body.minRate !== undefined) {
        filters.minInterestRate = parseFloat(body.minInterestRate || body.minRate);
      }
      if (body.limit) {
        filters.limit = Math.min(Math.max(1, parseInt(body.limit, 10) || 500), 1000);
      }
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
      // No payment - return 402 challenge
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

    // Parse filters from query params OR request body
    const filters = await parseFilters(req, url);

    // Payment verified - serve the data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for debt data (anonymized aggregates)
    let query = supabase
      .from("debts")
      .select("debt_type, interest_rate, principal_amount, monthly_payment");

    if (filters.debtType) {
      query = query.eq("debt_type", filters.debtType);
    }

    if (filters.minInterestRate !== null) {
      query = query.gte("interest_rate", filters.minInterestRate);
    }

    query = query.limit(filters.limit);

    const { data: debtData } = await query;

    // Analyze debt by type
    const debtByType: Record<string, { 
      totalPrincipal: number; 
      avgInterestRate: number; 
      count: number;
      totalWeightedRate: number;
    }> = {};

    if (debtData) {
      debtData.forEach((debt: { 
        debt_type: string; 
        interest_rate: number; 
        principal_amount: number;
      }) => {
        if (!debtByType[debt.debt_type]) {
          debtByType[debt.debt_type] = { 
            totalPrincipal: 0, 
            avgInterestRate: 0, 
            count: 0,
            totalWeightedRate: 0,
          };
        }
        debtByType[debt.debt_type].totalPrincipal += debt.principal_amount || 0;
        debtByType[debt.debt_type].totalWeightedRate += 
          (debt.interest_rate || 0) * (debt.principal_amount || 0);
        debtByType[debt.debt_type].count++;
      });
    }

    // Calculate weighted average rates
    const debtAnalysis = Object.entries(debtByType).map(([type, stats]) => ({
      debtType: type,
      avgInterestRate: stats.totalPrincipal > 0 
        ? Math.round((stats.totalWeightedRate / stats.totalPrincipal) * 100) / 100
        : 0,
      totalCount: stats.count,
    })).sort((a, b) => b.avgInterestRate - a.avgInterestRate);

    // Generate payoff strategies
    const strategies = [];

    // Find highest interest debt type
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

    // Check for consolidation opportunities
    if (debtAnalysis.length > 2) {
      strategies.push({
        strategy: "consolidation",
        priority: "medium",
        recommendation: "Multiple debt types detected - consider consolidation for simplified payments",
        estimatedSavings: "Potentially lower blended rate",
        difficulty: "easy",
      });
    }

    // Snowball method for motivation
    strategies.push({
      strategy: "snowball",
      priority: "medium",
      recommendation: "Pay smallest balances first for psychological wins and momentum",
      estimatedSavings: "Lower than avalanche, but higher completion rate",
      difficulty: "easy",
    });

    // Balance transfer if credit card debt exists
    if (debtAnalysis.some(d => d.debtType === "credit_card")) {
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
          minInterestRate: filters.minInterestRate,
          limit: filters.limit,
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
