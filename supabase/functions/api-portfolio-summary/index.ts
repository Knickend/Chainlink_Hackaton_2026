// api-portfolio-summary: x402 Monetized Market Insights API
// Price: $0.01 per request
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

const PRICE_CENTS = 1; // $0.01

interface Filters {
  limit: number;
  includeCategories: boolean;
}

async function parseFilters(req: Request, url: URL): Promise<Filters> {
  const filters: Filters = {
    limit: 20,
    includeCategories: true,
  };

  if (req.method === "GET") {
    const limitParam = url.searchParams.get("limit");
    if (limitParam) {
      filters.limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 100);
    }
    const includeCat = url.searchParams.get("includeCategories");
    if (includeCat !== null) {
      filters.includeCategories = includeCat !== "false";
    }
  } else if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try {
      const body = await req.json();
      if (body.limit) {
        filters.limit = Math.min(Math.max(1, parseInt(body.limit, 10) || 20), 100);
      }
      if (body.includeCategories !== undefined) {
        filters.includeCategories = body.includeCategories !== false;
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

    const filters = await parseFilters(req, url);

    // Use anon key instead of service role - only access public/aggregated data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch public price cache data (has public SELECT policy)
    const { data: priceData } = await supabase
      .from("price_cache")
      .select("symbol, price, change_percent, asset_type, updated_at")
      .order("updated_at", { ascending: false })
      .limit(filters.limit);

    // Get pre-aggregated category stats from materialized view via RPC
    let categoryDistribution: { category: string; percentage: number; assetCount: number }[] = [];
    let totalTrackedCategories = 0;

    if (filters.includeCategories) {
      const { data: aggStats } = await supabase.rpc("get_aggregated_portfolio_stats");

      if (aggStats) {
        const totalValue = aggStats.reduce((sum: number, row: { total_value: number }) => sum + (row.total_value || 0), 0);
        categoryDistribution = aggStats.map((row: { category: string; total_value: number; asset_count: number }) => ({
          category: row.category,
          percentage: totalValue > 0 ? Math.round(((row.total_value || 0) / totalValue) * 100) : 0,
          assetCount: Number(row.asset_count),
        }));
        totalTrackedCategories = aggStats.length;
      }
    }

    const response = {
      timestamp: new Date().toISOString(),
      request: {
        method: req.method,
        filters: {
          limit: filters.limit,
          includeCategories: filters.includeCategories,
        },
      },
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
        totalTrackedCategories,
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
