const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MOLTBOOK_BASE = "https://www.moltbook.com/api/v1";

// --- Rate Limiting ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record || now > record.resetTime) {
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetTime };
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetTime: record.resetTime };
}

function rateLimitHeaders(remaining: number, resetTime: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
  };
}

// --- Input Sanitization ---
const ALLOWED_ACTIONS = new Set([
  "register", "home", "status", "feed", "post", "comment",
  "read-comments", "dm-requests", "verify", "skill-version",
]);

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/;

function stripControl(s: string): string {
  // Remove non-printable chars except common whitespace
  return s.replace(/[^\x20-\x7E\t\n\r\u00A0-\uFFFF]/g, "");
}

function sanitizeStr(s: unknown, maxLen: number): string {
  if (typeof s !== "string") return "";
  return stripControl(s).slice(0, maxLen);
}

function validateId(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const clean = stripControl(s).slice(0, 50);
  return SAFE_ID_PATTERN.test(clean) ? clean : null;
}

// --- Main Handler ---
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit
  const clientIP = getClientIP(req);
  const { allowed, remaining, resetTime } = checkRateLimit(`ip:${clientIP}`);
  const rlHeaders = rateLimitHeaders(remaining, resetTime);

  if (!allowed) {
    console.log(`Rate limit exceeded for ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "register");

    // Validate action
    if (!ALLOWED_ACTIONS.has(action)) {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("MOLTBOOK_API_KEY");
    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };

    let res: Response;

    switch (action) {
      case "register":
        res = await fetch(`${MOLTBOOK_BASE}/agents/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "incontrol-finance",
            description:
              "AI-powered portfolio tracker and wealth management agent. Uses Chainlink CRE for decentralized price feeds across crypto, stocks, forex, and commodities.",
          }),
        });
        break;

      case "home":
        res = await fetch(`${MOLTBOOK_BASE}/home`, { headers: authHeaders });
        break;

      case "status":
        res = await fetch(`${MOLTBOOK_BASE}/agents/status`, { headers: authHeaders });
        break;

      case "feed":
        res = await fetch(`${MOLTBOOK_BASE}/feed?sort=new&limit=15`, { headers: authHeaders });
        break;

      case "dm-requests":
        res = await fetch(`${MOLTBOOK_BASE}/agents/dm/requests`, { headers: authHeaders });
        break;

      case "post": {
        const title = sanitizeStr(body.title, 200);
        const content = sanitizeStr(body.content, 2000);
        const submolt_name = sanitizeStr(body.submolt_name, 50) || "general";
        res = await fetch(`${MOLTBOOK_BASE}/posts`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ submolt_name, title, content }),
        });
        break;
      }

      case "verify": {
        const verification_code = sanitizeStr(body.verification_code, 100);
        const answer = sanitizeStr(body.answer, 100);
        res = await fetch(`${MOLTBOOK_BASE}/verify`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ verification_code, answer }),
        });
        break;
      }

      case "comment": {
        const post_id = validateId(body.post_id);
        if (!post_id) {
          return new Response(
            JSON.stringify({ error: "Invalid post_id" }),
            { status: 400, headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
          );
        }
        const commentContent = sanitizeStr(body.content, 2000);
        const parent_id = body.parent_id ? validateId(body.parent_id) : undefined;
        if (body.parent_id && !parent_id) {
          return new Response(
            JSON.stringify({ error: "Invalid parent_id" }),
            { status: 400, headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
          );
        }
        res = await fetch(`${MOLTBOOK_BASE}/posts/${post_id}/comments`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ content: commentContent, ...(parent_id ? { parent_id } : {}) }),
        });
        break;
      }

      case "read-comments": {
        const pid = validateId(body.post_id);
        if (!pid) {
          return new Response(
            JSON.stringify({ error: "Invalid post_id" }),
            { status: 400, headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
          );
        }
        res = await fetch(`${MOLTBOOK_BASE}/posts/${pid}/comments?sort=new`, { headers: authHeaders });
        break;
      }

      case "skill-version":
        res = await fetch("https://www.moltbook.com/skill.json");
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
        );
    }

    const data = await res.json();
    console.log(`Moltbook [${action}] response:`, JSON.stringify(data).slice(0, 500));

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Moltbook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
    );
  }
});
