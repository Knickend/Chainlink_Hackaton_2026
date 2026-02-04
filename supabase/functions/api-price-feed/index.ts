// api-price-feed: x402 Monetized Live Price Feed API
// Price: $0.005 per request
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

const PRICE_CENTS = 0.5; // $0.005 (half a cent)

interface Filters {
  type: string | null;
  symbols: string[] | null;
  limit: number;
}

async function parseFilters(req: Request, url: URL): Promise<Filters> {
  const filters: Filters = {
    type: null,
    symbols: null,
    limit: 50,
  };

  if (req.method === "GET") {
    // Parse from query parameters
    filters.type = url.searchParams.get("type");
    const symbolsParam = url.searchParams.get("symbols");
    filters.symbols = symbolsParam ? symbolsParam.split(",").map(s => s.trim().toUpperCase()) : null;
    const limitParam = url.searchParams.get("limit");
    if (limitParam) {
      filters.limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 100);
    }
  } else if (["POST", "PUT", "PATCH"].includes(req.method)) {
    // Parse from request body
    try {
      const body = await req.json();
      filters.type = body.type || null;
      if (body.symbols) {
        filters.symbols = Array.isArray(body.symbols) 
          ? body.symbols.map((s: string) => s.toUpperCase())
          : body.symbols.split(",").map((s: string) => s.trim().toUpperCase());
      }
      if (body.limit) {
        filters.limit = Math.min(Math.max(1, parseInt(body.limit, 10) || 50), 100);
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

    // Parse filters from query params OR request body
    const filters = await parseFilters(req, url);

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
    if (filters.type) {
      query = query.eq("asset_type", filters.type);
    }

    if (filters.symbols && filters.symbols.length > 0) {
      query = query.in("symbol", filters.symbols);
    }

    // Limit results
    query = query.limit(filters.limit);

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
      request: {
        method: req.method,
        filters: {
          assetType: filters.type || "all",
          symbols: filters.symbols || "all",
          limit: filters.limit,
        },
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
