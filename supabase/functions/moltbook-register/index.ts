const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MOLTBOOK_BASE = "https://www.moltbook.com/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "register";
    const apiKey = Deno.env.get("MOLTBOOK_API_KEY");

    // Auth headers for authenticated actions
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
        res = await fetch(`${MOLTBOOK_BASE}/home`, {
          headers: authHeaders,
        });
        break;

      case "status":
        res = await fetch(`${MOLTBOOK_BASE}/agents/status`, {
          headers: authHeaders,
        });
        break;

      case "feed":
        res = await fetch(`${MOLTBOOK_BASE}/feed?sort=new&limit=15`, {
          headers: authHeaders,
        });
        break;

      case "dm-requests":
        res = await fetch(`${MOLTBOOK_BASE}/agents/dm/requests`, {
          headers: authHeaders,
        });
        break;

      case "post": {
        const { submolt, title, content } = body;
        res = await fetch(`${MOLTBOOK_BASE}/posts`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ submolt: submolt || "general", title, content }),
        });
        break;
      }

      case "comment": {
        const { post_id, content: commentContent, parent_id } = body;
        res = await fetch(`${MOLTBOOK_BASE}/posts/${post_id}/comments`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ content: commentContent, ...(parent_id ? { parent_id } : {}) }),
        });
        break;
      }

      case "read-comments": {
        const { post_id: pid } = body;
        res = await fetch(`${MOLTBOOK_BASE}/posts/${pid}/comments?sort=new`, {
          headers: authHeaders,
        });
        break;
      }

      case "skill-version":
        res = await fetch("https://www.moltbook.com/skill.json");
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const data = await res.json();
    console.log(`Moltbook [${action}] response:`, JSON.stringify(data).slice(0, 500));

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Moltbook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
