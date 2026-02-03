import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute for landing page visitors

// In-memory rate limit store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
    || req.headers.get("x-real-ip") 
    || "unknown";
}

function getRateLimitHeaders(remaining: number, resetTime: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
  };
}

// Simple hash function for IP anonymization
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "sales-bot-salt-2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

const SALES_PROMPT = `You are Alex, InControl's friendly sales assistant. Your goal is to help visitors understand how InControl can transform their financial management and guide them toward signing up.

**About InControl:**
- All-in-one wealth tracking dashboard for cash, stablecoins, real estate, cryptocurrency, stocks, bonds, ETFs, and commodities
- Live price updates for 50+ assets with multi-currency support (20+ currencies)
- Debt management with smart payoff calculators (avalanche/snowball methods)
- AI-powered investment strategy recommendations
- Portfolio performance tracking and historical snapshots
- Secure, SOC 2 Type II compliant infrastructure

**Pricing:**
- Free tier: Up to 10 assets, basic tracking, demo mode
- Standard (€4.99/mo): Up to 30 assets, multi-currency, live prices, AI advisor
- Pro (€9.99/mo): Everything in Standard plus unlimited assets, performance analytics, portfolio history, debt payoff calculator, priority support

**Special Offers:**
- 50% off first month on monthly plans
- 2 months free on annual billing (17% savings)

**Your Approach:**
- Be warm, helpful, and conversational (not pushy)
- Ask about their current financial tracking pain points
- Highlight relevant features based on their needs
- Gently guide toward trying the free tier or demo
- When appropriate, include a call-to-action like "Ready to take control? [Sign up free →]"

**Response Style:**
- Keep responses concise (2-4 sentences usually)
- Use markdown for formatting when helpful
- End with a question or soft CTA to keep engagement
- Be enthusiastic about helping them succeed financially`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting and tracking
    const clientIP = getClientIP(req);
    const rateLimitKey = `ip:${clientIP}`;
    
    // Check rate limit
    const { allowed, remaining, resetTime } = checkRateLimit(
      rateLimitKey, 
      MAX_REQUESTS_PER_WINDOW, 
      RATE_LIMIT_WINDOW_MS
    );
    
    const rateLimitHeaders = getRateLimitHeaders(remaining, resetTime);
    
    if (!allowed) {
      console.log(`Rate limit exceeded for ${rateLimitKey}`);
      return new Response(
        JSON.stringify({ error: "You're sending messages too quickly. Please wait a moment before trying again." }),
        { 
          status: 429, 
          headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const body = await req.json();
    const { messages, sessionId, action, ctaType } = body;

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Hash IP for privacy
    const visitorIpHash = await hashIP(clientIP);

    // Handle CTA click tracking
    if (action === "track_cta") {
      await supabase.from("sales_bot_interactions").insert({
        session_id: sessionId || "unknown",
        event_type: "cta_click",
        visitor_ip_hash: visitorIpHash,
        cta_type: ctaType,
      });
      
      console.log(`CTA click tracked: ${ctaType} (session: ${sessionId})`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sales bot request received with", messages.length, "messages", `(${rateLimitKey})`);

    // Log conversation start (first user message in session)
    if (sessionId && messages.length === 1) {
      await supabase.from("sales_bot_interactions").insert({
        session_id: sessionId,
        event_type: "conversation_start",
        visitor_ip_hash: visitorIpHash,
      });
    }

    // Log user message
    if (sessionId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        await supabase.from("sales_bot_interactions").insert({
          session_id: sessionId,
          event_type: "message",
          visitor_ip_hash: visitorIpHash,
          message_role: "user",
        });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SALES_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "I'm getting a lot of questions right now! Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Unable to process your request. Please try again." }),
        { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log assistant message after successful response
    if (sessionId) {
      // Fire and forget - don't block the stream
      supabase.from("sales_bot_interactions").insert({
        session_id: sessionId,
        event_type: "message",
        visitor_ip_hash: visitorIpHash,
        message_role: "assistant",
      }).then(() => {
        console.log("Assistant message logged for session:", sessionId);
      });
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Sales bot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
