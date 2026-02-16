// api-price-feed-test: Free test endpoint for Chainlink CRE integration
// No x402 payment required - returns same price data as api-price-feed

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
};

// Input validation constants
const MAX_SYMBOLS = 20;
const MAX_INPUT_LENGTH = 500;
const SYMBOL_REGEX = /^[A-Z0-9\/-]{1,10}$/;
const FIELD_REGEX = /^[a-zA-Z0-9_-]{1,30}$/;

function sanitizeSymbols(raw: string): string[] {
  return raw
    .slice(0, MAX_INPUT_LENGTH)
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(s => SYMBOL_REGEX.test(s))
    .slice(0, MAX_SYMBOLS);
}

function sanitizeField(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return FIELD_REGEX.test(trimmed) ? trimmed : null;
}

interface Filters {
  type: string | null;
  symbols: string[] | null;
  limit: number;
}

async function parseFilters(req: Request, url: URL): Promise<Filters> {
  const filters: Filters = { type: null, symbols: null, limit: 50 };

  if (req.method === "GET") {
    filters.type = sanitizeField(url.searchParams.get("type"));
    const symbolsParam = url.searchParams.get("symbols");
    filters.symbols = symbolsParam ? sanitizeSymbols(symbolsParam) : null;
    const limitParam = url.searchParams.get("limit");
    if (limitParam) {
      filters.limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 100);
    }
  } else if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try {
      const body = await req.json();
      filters.type = sanitizeField(body.type || null);
      if (body.symbols) {
        const rawSymbols = Array.isArray(body.symbols)
          ? body.symbols.map((s: string) => String(s).trim().toUpperCase())
          : String(body.symbols).slice(0, MAX_INPUT_LENGTH).split(",").map((s: string) => s.trim().toUpperCase());
        filters.symbols = rawSymbols
          .filter((s: string) => SYMBOL_REGEX.test(s))
          .slice(0, MAX_SYMBOLS);
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const filters = await parseFilters(req, url);

    console.log("Test price feed request:", req.method, JSON.stringify(filters));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from("price_cache")
      .select("symbol, price, change, change_percent, asset_type, price_unit, updated_at")
      .order("updated_at", { ascending: false });

    if (filters.type) {
      query = query.eq("asset_type", filters.type);
    }
    if (filters.symbols && filters.symbols.length > 0) {
      query = query.in("symbol", filters.symbols);
    }
    query = query.limit(filters.limit);

    const { data: prices, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch price data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formattedPrices = prices?.map((p: Record<string, unknown>) => ({
      symbol: p.symbol,
      price: p.price,
      change24h: p.change,
      changePercent24h: p.change_percent,
      type: p.asset_type,
      unit: p.price_unit || "USD",
      lastUpdated: p.updated_at,
    })) || [];

    const byType: Record<string, typeof formattedPrices> = {};
    formattedPrices.forEach((price) => {
      const type = price.type as string || "other";
      if (!byType[type]) byType[type] = [];
      byType[type].push(price);
    });

    const response = {
      test: true,
      warning: "This is a free test endpoint. Use api-price-feed for production.",
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
        oldestUpdate: formattedPrices.length > 0 ? formattedPrices[formattedPrices.length - 1].lastUpdated : null,
        newestUpdate: formattedPrices.length > 0 ? formattedPrices[0].lastUpdated : null,
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Test API error:", error);
    return new Response(JSON.stringify({ error: `Server error: ${error instanceof Error ? error.message : String(error)}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
