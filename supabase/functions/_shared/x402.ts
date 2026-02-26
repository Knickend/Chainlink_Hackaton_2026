// x402 Payment Protocol Utilities
// For AI agent micropayment monetization on Base blockchain

// Base Mainnet USDC contract address
export const USDC_BASE_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Coinbase x402 facilitator URL for payment verification
export const FACILITATOR_URL = "https://x402.org/facilitator";

// Get wallet address from environment
export function getWalletAddress(): string {
  const walletAddress = Deno.env.get("X402_WALLET_ADDRESS");
  if (!walletAddress) {
    throw new Error("X402_WALLET_ADDRESS not configured");
  }
  return walletAddress;
}

// Payment challenge interface
export interface PaymentChallenge {
  x402Version: number;
  accepts: Array<{
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    extra: Record<string, unknown>;
  }>;
  error?: string;
}

// Create a 402 Payment Required response
export function createPaymentChallenge(
  priceInCents: number,
  resource: string,
  description: string
): PaymentChallenge {
  const walletAddress = getWalletAddress();
  
  // Convert cents to USDC units (6 decimals)
  // $0.01 = 10000 units (0.01 * 1000000)
  const amountInUnits = (priceInCents * 10000).toString();

  // Use full resource URL for spec compliance so agents can unambiguously identify the resource
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  let fullResource = resource;
  if (!resource.startsWith("http")) {
    // Ensure the path includes /functions/v1/ prefix for correct resource identification
    const path = resource.startsWith("/functions/v1/") ? resource : `/functions/v1${resource.startsWith("/") ? "" : "/"}${resource}`;
    fullResource = `${supabaseUrl}${path}`;
  }

  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "base-mainnet",
        maxAmountRequired: amountInUnits,
        resource: fullResource,
        description: description,
        mimeType: "application/json",
        payTo: walletAddress,
        maxTimeoutSeconds: 60,
        asset: USDC_BASE_ADDRESS,
        extra: {},
      },
    ],
  };
}

// Verification result interface
export interface VerificationResult {
  valid: boolean;
  error?: string;
  paymentDetails?: {
    from: string;
    amount: string;
    txHash?: string;
  };
}

// Verify payment via Coinbase facilitator
export async function verifyPayment(
  paymentHeader: string,
  expectedResource: string,
  expectedAmountCents: number
): Promise<VerificationResult> {
  try {
    const walletAddress = getWalletAddress();
    const expectedAmountUnits = (expectedAmountCents * 10000).toString();

    // Call the x402 facilitator to verify the payment
    const response = await fetch(`${FACILITATOR_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment: paymentHeader,
        expectedPayTo: walletAddress,
        expectedAsset: USDC_BASE_ADDRESS,
        expectedNetwork: "base-sepolia",
        expectedResource: expectedResource,
        minAmount: expectedAmountUnits,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Facilitator verification failed:", errorText);
      return {
        valid: false,
        error: `Payment verification failed: ${response.status}`,
      };
    }

    const result = await response.json();
    
    if (result.valid) {
      return {
        valid: true,
        paymentDetails: {
          from: result.from || "unknown",
          amount: result.amount || expectedAmountUnits,
          txHash: result.txHash,
        },
      };
    }

    return {
      valid: false,
      error: result.error || "Payment verification failed",
    };
  } catch (error) {
    console.error("Payment verification error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      error: `Verification error: ${errorMessage}`,
    };
  }
}
// CORS headers for browser/agent access
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-payment",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

// Create 402 response with payment challenge
export function create402Response(challenge: PaymentChallenge): Response {
  return new Response(JSON.stringify(challenge), {
    status: 402,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "X-Payment-Required": "true",
    },
  });
}

// Create success response
export function createSuccessResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// Create error response
export function createErrorResponse(error: string, status: number = 400): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// Handle CORS preflight
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}
