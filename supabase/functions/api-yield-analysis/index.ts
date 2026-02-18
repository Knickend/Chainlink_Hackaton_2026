// api-yield-analysis: x402 Monetized Yield Optimization API
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
  category: string | null;
  minYield: number | null;
}

async function parseFilters(req: Request, url: URL): Promise<Filters> {
  const filters: Filters = {
    category: null,
    minYield: null,
  };

  if (req.method === "GET") {
    filters.category = sanitizeField(url.searchParams.get("category"));
    const minYieldParam = url.searchParams.get("minYield");
    if (minYieldParam) {
      filters.minYield = parseFloat(minYieldParam);
    }
  } else if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try {
      const body = await req.json();
      filters.category = sanitizeField(body.category || null);
      if (body.minYield !== undefined) {
        filters.minYield = parseFloat(body.minYield);
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
      console.log("No payment header, returning 402 challenge");
      const challenge = createPaymentChallenge(
        PRICE_CENTS,
        resource,
        "Yield Analysis API - Yield optimization strategies and staking insights"
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

    // Get pre-aggregated yield stats from materialized view via RPC
    const { data: yieldStats } = await supabase.rpc("get_aggregated_yield_stats");

    // Filter and calculate yield analysis from pre-aggregated data
    let filteredStats = yieldStats || [];
    if (filters.category) {
      filteredStats = filteredStats.filter((row: { category: string }) => row.category === filters.category);
    }

    const yieldAnalysis = filteredStats
      .map((row: { category: string; asset_count: number; total_value: number; weighted_yield_sum: number }) => {
        const avgYield = row.total_value > 0
          ? Math.round((row.weighted_yield_sum / row.total_value) * 100) / 100
          : 0;
        return {
          category: row.category,
          averageYield: avgYield,
          assetCount: Number(row.asset_count),
        };
      })
      .filter((row: { averageYield: number }) => !filters.minYield || row.averageYield >= filters.minYield)
      .sort((a: { averageYield: number }, b: { averageYield: number }) => b.averageYield - a.averageYield);

    // Generate yield optimization strategies
    const strategies = [];

    if (yieldAnalysis.some((y: { category: string; averageYield: number }) => y.category === "crypto" && y.averageYield > 3)) {
      strategies.push({
        type: "staking",
        recommendation: "Consider liquid staking derivatives for better capital efficiency",
        potentialYieldRange: "4-8% APY",
        risk: "medium",
      });
    }

    if (yieldAnalysis.some((y: { category: string; averageYield: number }) => y.category === "banking" && y.averageYield < 4)) {
      strategies.push({
        type: "reallocation",
        recommendation: "Traditional savings may underperform - consider high-yield alternatives",
        potentialYieldRange: "4-5% APY",
        risk: "low",
      });
    }

    strategies.push({
      type: "diversification",
      recommendation: "Spread yield-bearing assets across multiple categories to reduce risk",
      potentialYieldRange: "Varies",
      risk: "low",
    });

    const totalYieldBearingAssets = filteredStats.reduce(
      (sum: number, row: { asset_count: number }) => sum + Number(row.asset_count), 0
    );

    const response = {
      timestamp: new Date().toISOString(),
      request: {
        method: req.method,
        filters: {
          category: filters.category || "all",
          minYield: filters.minYield || 0,
        },
      },
      yieldAnalysis: {
        byCategory: yieldAnalysis,
        totalYieldBearingAssets,
      },
      optimizationStrategies: strategies,
      marketContext: {
        currentRateEnvironment: "elevated",
        trendDirection: "stable",
        lastUpdated: new Date().toISOString(),
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
