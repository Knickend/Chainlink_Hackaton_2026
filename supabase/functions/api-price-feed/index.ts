// api-price-feed: x402 Monetized Live Price Feed API
// Price: $0.005 per request

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createPaymentChallenge,
  verifyPayment,
  create402Response,
  createSuccessResponse,
  createErrorResponse,
  handleCors,
} from "../_shared/x402.ts";

const PRICE_CENTS = 0.5; // $0.005 (half a cent)

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const resource = url.pathname;

    // Parse query params for filtering
    const assetType = url.searchParams.get("type"); // crypto, forex, commodities
    const symbols = url.searchParams.get("symbols")?.split(","); // e.g., BTC,ETH,GOLD

    // Check for X-Payment header
    const paymentHeader = req.headers.get("X-Payment");

    if (!paymentHeader) {
      // No payment - return 402 challenge
      console.log("No payment header, returning 402 challenge");
      const challenge = createPaymentChallenge(
        PRICE_CENTS,
        resource,
        "Price Feed API - Live crypto, forex, and commodity prices"
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

    // Build query
    let query = supabase
      .from("price_cache")
      .select("symbol, price, change, change_percent, asset_type, price_unit, updated_at")
      .order("updated_at", { ascending: false });

    // Apply filters
    if (assetType) {
      query = query.eq("asset_type", assetType);
    }

    if (symbols && symbols.length > 0) {
      query = query.in("symbol", symbols.map(s => s.toUpperCase()));
    }

    // Limit results
    query = query.limit(50);

    const { data: prices, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return createErrorResponse("Failed to fetch price data", 500);
    }

    // Format response
    const formattedPrices = prices?.map((p: Record<string, unknown>) => ({
      symbol: p.symbol,
      price: p.price,
      change24h: p.change,
      changePercent24h: p.change_percent,
      type: p.asset_type,
      unit: p.price_unit || "USD",
      lastUpdated: p.updated_at,
    })) || [];

    // Group by type for easier consumption
    const byType: Record<string, typeof formattedPrices> = {};
    formattedPrices.forEach((price) => {
      const type = price.type as string || "other";
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(price);
    });

    const response = {
      timestamp: new Date().toISOString(),
      filters: {
        assetType: assetType || "all",
        symbols: symbols || "all",
      },
      prices: formattedPrices,
      byType,
      meta: {
        totalPrices: formattedPrices.length,
        oldestUpdate: formattedPrices.length > 0 
          ? formattedPrices[formattedPrices.length - 1].lastUpdated 
          : null,
        newestUpdate: formattedPrices.length > 0 
          ? formattedPrices[0].lastUpdated 
          : null,
      },
      paymentDetails: {
        amountPaid: `$${(PRICE_CENTS / 100).toFixed(3)}`,
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
