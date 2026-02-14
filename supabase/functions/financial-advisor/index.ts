import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

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

function getUserIdFromAuth(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  try {
    const token = authHeader.replace("Bearer ", "");
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || null;
  } catch {
    return null;
  }
}

function getRateLimitHeaders(remaining: number, resetTime: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
  };
}

const BASE_SYSTEM_PROMPT = `You are InControl's AI Financial Advisor, a knowledgeable and friendly expert in personal finance. You help users with:

1. **Budgeting**: Creating and maintaining budgets, expense tracking, identifying areas to save money
2. **Investing**: Understanding different asset classes (cash, stablecoins, real estate, cryptocurrency, stocks, bonds, ETFs, commodities), portfolio diversification, risk management, and long-term wealth building strategies
3. **Debt Management**: Debt payoff strategies (avalanche vs snowball), understanding interest rates, refinancing options, and becoming debt-free

Guidelines:
- Be concise but thorough. Aim for clear, actionable advice.
- When discussing investments, always mention that past performance doesn't guarantee future results and recommend diversification.
- For debt, prioritize high-interest debt (especially credit cards) before low-interest debt.
- Use simple language and avoid jargon unless explaining a term.
- If asked about specific stock picks or market timing, remind users that you provide educational guidance, not personalized investment advice.
- Be encouraging and supportive about financial goals.
- Format responses with markdown for readability (bullet points, bold for emphasis).

Remember: You're here to educate and empower users to make informed financial decisions.`;

function buildSystemPrompt(
  portfolioContext?: string,
  memories?: Array<{ content: string; memory_type: string; created_at: string }>
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (portfolioContext) {
    prompt += `\n\n## User's Current Portfolio Data\nThe user's real-time portfolio data is shown below. Use it to give specific, data-driven advice. Reference their actual holdings, income, expenses, debts, and goals naturally.\n\n${portfolioContext}`;
  }

  if (memories && memories.length > 0) {
    const memoryContext = memories.map(m => {
      const typeLabel = m.memory_type === 'preference' ? '🎯 User Preference' 
        : m.memory_type === 'insight' ? '💡 Insight'
        : m.memory_type === 'goal' ? '🎯 Goal'
        : '💬 Previous Conversation';
      return `${typeLabel}: ${m.content}`;
    }).join('\n');

    prompt += `\n\n## User Context (from past conversations — Pro feature)\nYou have access to the following memories from past interactions with this user. Use them to provide personalized, context-aware advice. Reference past conversations naturally (e.g., "As we discussed before..." or "Given your preference for...").\n\n${memoryContext}`;
  }

  return prompt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromAuth(req);
    const clientIP = getClientIP(req);
    const rateLimitKey = userId ? `user:${userId}` : `ip:${clientIP}`;
    
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
        { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, memories, portfolioContext, walletContext } = await req.json();
    
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
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = buildSystemPrompt(portfolioContext, memories);
    
    if (walletContext) {
      systemPrompt += `\n\n## Agent Wallet Status\nThe user has an agentic crypto wallet on Base network.\n${walletContext}\n\nWhen relevant, suggest DeFi actions the user can take. They can say things like "Send 50 USDC to Alice" or "Swap 100 USDC for ETH". The chat will parse and execute these commands with user confirmation.`;
    }
    
    console.log("Starting financial advisor chat with", messages.length, "messages", portfolioContext ? "+ portfolio context" : "(no portfolio)", memories?.length ? `+ ${memories.length} memories` : "(no memories)", walletContext ? "+ wallet context" : "", `(${rateLimitKey})`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Financial advisor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
