// api-yield-analysis: x402 Monetized Yield Optimization API
// Price: $0.02 per request

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

    // Payment verified - serve the data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch yield-bearing assets data (anonymized)
    const { data: yieldAssets } = await supabase
      .from("assets")
      .select("category, yield, value")
      .not("yield", "is", null)
      .gt("yield", 0)
      .limit(500);

    // Calculate yield statistics by category
    const yieldByCategory: Record<string, { totalValue: number; weightedYield: number; count: number }> = {};
    
    if (yieldAssets) {
      yieldAssets.forEach((asset: { category: string; yield: number; value: number }) => {
        if (!yieldByCategory[asset.category]) {
          yieldByCategory[asset.category] = { totalValue: 0, weightedYield: 0, count: 0 };
        }
        yieldByCategory[asset.category].totalValue += asset.value || 0;
        yieldByCategory[asset.category].weightedYield += (asset.yield || 0) * (asset.value || 0);
        yieldByCategory[asset.category].count++;
      });
    }

    // Calculate average yields
    const yieldAnalysis = Object.entries(yieldByCategory).map(([category, stats]) => ({
      category,
      averageYield: stats.totalValue > 0 
        ? Math.round((stats.weightedYield / stats.totalValue) * 100) / 100
        : 0,
      assetCount: stats.count,
    })).sort((a, b) => b.averageYield - a.averageYield);

    // Generate yield optimization strategies
    const strategies = [];
    
    if (yieldAnalysis.some(y => y.category === "crypto" && y.averageYield > 3)) {
      strategies.push({
        type: "staking",
        recommendation: "Consider liquid staking derivatives for better capital efficiency",
        potentialYieldRange: "4-8% APY",
        risk: "medium",
      });
    }

    if (yieldAnalysis.some(y => y.category === "banking" && y.averageYield < 4)) {
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

    const response = {
      timestamp: new Date().toISOString(),
      yieldAnalysis: {
        byCategory: yieldAnalysis,
        totalYieldBearingAssets: yieldAssets?.length || 0,
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
