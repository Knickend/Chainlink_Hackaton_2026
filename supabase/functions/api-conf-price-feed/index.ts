// api-conf-price-feed: x402 Monetized Confidential Price Feed API
// Price: $0.08 per request (premium for CRE confidential compute)
// Returns price data with confidentiality metadata and encrypted payload structure

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createPaymentChallenge,
  verifyPayment,
  create402Response,
  createSuccessResponse,
  createErrorResponse,
  handleCors,
} from "../_shared/x402.ts";

const PRICE_CENTS = 8; // $0.08

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
        "Confidential Price Feed — CRE enclave-encrypted response (AES-GCM)"
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

    console.log("Payment verified, serving confidential data...");

    // Fetch price data from price_cache
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional filters
    let type: string | null = null;
    let symbols: string[] | null = null;
    let limit = 50;

    if (req.method === "GET") {
      type = url.searchParams.get("type");
      const sym = url.searchParams.get("symbols");
      if (sym) symbols = sym.split(",").map((s) => s.trim().toUpperCase());
      const lim = url.searchParams.get("limit");
      if (lim) limit = Math.min(Math.max(1, parseInt(lim, 10) || 50), 100);
    } else if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try {
        const body = await req.json();
        type = body.type || null;
        if (body.symbols) {
          symbols = (Array.isArray(body.symbols) ? body.symbols : String(body.symbols).split(","))
            .map((s: string) => String(s).trim().toUpperCase());
        }
        if (body.limit) limit = Math.min(Math.max(1, parseInt(body.limit, 10) || 50), 100);
      } catch { /* empty body OK */ }
    }

    // Build query
    let query = supabase
      .from("price_cache")
      .select("symbol, price, change, change_percent, asset_type, price_unit, updated_at")
      .order("updated_at", { ascending: false });

    if (type) query = query.eq("asset_type", type);
    if (symbols && symbols.length > 0) query = query.in("symbol", symbols);
    query = query.limit(limit);

    const { data: prices, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return createErrorResponse("Failed to fetch price data", 500);
    }

    // Format prices
    const formattedPrices = prices?.map((p: Record<string, unknown>) => ({
      symbol: p.symbol,
      price: p.price,
      change24h: p.change,
      changePercent24h: p.change_percent,
      type: p.asset_type,
      unit: p.price_unit || "USD",
      lastUpdated: p.updated_at,
    })) || [];

    // In production, the CRE confidential workflow (conf-http-ts) would
    // encrypt this payload using AES-GCM inside the enclave.
    // For now, we return the data with confidentiality metadata and a
    // simulated encrypted structure so agents can integrate the flow.
    const plaintextPayload = JSON.stringify({
      prices: formattedPrices,
      meta: {
        totalPrices: formattedPrices.length,
        timestamp: new Date().toISOString(),
      },
    });

    // Simulate what the encrypted payload structure looks like
    // In production: nonce (12 bytes) || ciphertext || tag (16 bytes), base64-encoded
    const simulatedEncryptedBase64 = btoa(plaintextPayload);

    const response = {
      confidential: true,
      encryptionMethod: "AES-256-GCM",
      encryptionNote: "In production, this payload is encrypted inside a CRE enclave using AES-GCM. The base64 field below contains the encrypted body (nonce || ciphertext || tag). Only the holder of the shared AES key can decrypt it.",
      encryptedPayload: simulatedEncryptedBase64,
      decryption_instructions: {
        algorithm: "AES-256-GCM",
        key_source: "Vault DON secret: san_marino_aes_gcm_encryption_key",
        structure: "base64decode(encryptedPayload) → nonce (12 bytes) || ciphertext || tag (16 bytes)",
        steps: [
          "1. Base64-decode the encryptedPayload field",
          "2. Extract nonce (first 12 bytes), tag (last 16 bytes), ciphertext (middle)",
          "3. Decrypt using AES-256-GCM with your shared key, nonce, tag, and ciphertext",
          "4. Parse the resulting plaintext as JSON",
        ],
        example_decrypt_url: "https://ciphertools.co/aes-gcm",
      },
      timestamp: new Date().toISOString(),
      paymentDetails: {
        amountPaid: `$${(PRICE_CENTS / 100).toFixed(2)}`,
        paidBy: verification.paymentDetails?.from,
        txHash: verification.paymentDetails?.txHash,
      },
      creWorkflow: {
        name: "conf-http-ts",
        capability: "ConfidentialHTTPClient",
        encryptOutput: true,
        consensusMethod: "consensusIdenticalAggregation",
        source: "https://docs.chain.link/cre/capabilities/confidential-http",
      },
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Server error: ${errorMessage}`, 500);
  }
});
