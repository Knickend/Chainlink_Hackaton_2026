// api-portfolio-summary: x402 Monetized Market Insights API
// Price: $0.01 per request

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
        "Portfolio Summary API - Aggregated market insights and portfolio trends"
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

    // Fetch aggregated portfolio data (anonymized insights)
    const { data: priceData } = await supabase
      .from("price_cache")
      .select("symbol, price, change_percent, asset_type, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20);

    // Get platform-wide aggregated stats (no individual user data)
    const { data: assetStats } = await supabase
      .from("assets")
      .select("category, value")
      .limit(1000);

    // Calculate category distribution
    const categoryTotals: Record<string, { count: number; totalValue: number }> = {};
    if (assetStats) {
      assetStats.forEach((asset: { category: string; value: number }) => {
        if (!categoryTotals[asset.category]) {
          categoryTotals[asset.category] = { count: 0, totalValue: 0 };
        }
        categoryTotals[asset.category].count++;
        categoryTotals[asset.category].totalValue += asset.value || 0;
      });
    }

    // Calculate percentages
    const totalValue = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.totalValue, 0);
    const categoryDistribution = Object.entries(categoryTotals).map(([category, stats]) => ({
      category,
      percentage: totalValue > 0 ? Math.round((stats.totalValue / totalValue) * 100) : 0,
      assetCount: stats.count,
    }));

    const response = {
      timestamp: new Date().toISOString(),
      marketData: {
        topAssets: priceData?.slice(0, 10).map((p: Record<string, unknown>) => ({
          symbol: p.symbol,
          price: p.price,
          change24h: p.change_percent,
          type: p.asset_type,
        })) || [],
        lastUpdated: priceData?.[0]?.updated_at || null,
      },
      platformInsights: {
        categoryDistribution,
        totalTrackedCategories: Object.keys(categoryTotals).length,
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
