

# Fix Critical Gaps: MCP Server Crash, CRE Attestation Clarity, and Resource URL

Three issues to fix, ordered by severity.

## Fix 1: MCP Server Crash (Critical)

The MCP server returns 500 on every request. The root cause is the wrong `tool()` API signature.

**Current (broken):**
```text
mcpServer.tool({
  name: "get_price_feed",
  description: "...",
  inputSchema: { ... },
  handler: async (args) => { ... }
})
```

**Correct mcp-lite API:**
```text
mcpServer.tool("get_price_feed", {
  description: "...",
  inputSchema: { ... },
  handler: async (args) => { ... }
})
```

The first argument must be the tool name as a string, second is the options object. This applies to all 5 tool definitions.

**File:** `supabase/functions/mcp-server/index.ts` -- fix all 5 `tool()` calls to use the correct 2-argument signature.

## Fix 2: 402 Challenge Resource URL (Important)

The 402 challenges currently return truncated resource URLs like:
```text
"resource": "https://edtudwkmswyjxamkdkbu.supabase.co/api-dca-strategy"
```

This is missing `/functions/v1/` because the edge function's `url.pathname` is just `/api-dca-strategy`, and `x402.ts` concatenates `SUPABASE_URL + pathname` directly.

**Fix in each edge function** (`api-dca-strategy`, `cre-verified-data`, and the existing x402 endpoints): pass the full correct resource path `/functions/v1/api-dca-strategy` to `createPaymentChallenge` instead of just `url.pathname`.

Alternatively, fix `createPaymentChallenge` in `_shared/x402.ts` to insert `/functions/v1` when constructing the full URL. The simpler fix is to update the `resource` variable in each edge function to include the correct prefix.

**File:** `supabase/functions/_shared/x402.ts` -- update `createPaymentChallenge` to handle the path correctly, ensuring the full resource URL is `SUPABASE_URL/functions/v1/<function-name>`.

## Fix 3: CRE Attestation Disclaimer (Documentation)

The API Docs "CRE Verified" tab should clarify that the edge function is an HTTP proxy to the CRE pipeline, not a CRE node itself. The actual consensus verification runs in `incontrol-cre-ts/x402-cre-verified-ts/main.ts`.

**File:** `src/pages/ApiDocs.tsx` -- add a note in the CRE Verified tab:
- The edge function serves as an x402-gated HTTP proxy to the CRE-verified data pipeline
- Actual multi-node consensus runs in the CRE workflow (`x402-cre-verified-ts/main.ts`)
- The `verified: true` flag in the attestation indicates data sourced from Chainlink on-chain feeds
- The `verified: false` flag indicates cached data not yet verified by CRE consensus

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/mcp-server/index.ts` | Fix all 5 `tool()` calls to use correct 2-argument signature |
| `supabase/functions/_shared/x402.ts` | Fix resource URL to include `/functions/v1/` prefix |
| `src/pages/ApiDocs.tsx` | Add CRE attestation provenance disclaimer |

## Verification

After fixes, these should pass:
- `POST /functions/v1/mcp-server/mcp` with MCP initialize request returns 200 with server info
- `GET /functions/v1/api-dca-strategy` returns 402 with correct `resource` URL including `/functions/v1/`
- API Docs CRE tab clearly distinguishes edge function proxy from CRE workflow

