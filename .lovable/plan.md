

# CRE + x402 + MCP: External AI Agent Data Provider Stack (with DCA Strategy)

## Vision

InControl becomes a first-class AI agent data provider. External AI agents discover, pay, and consume your APIs -- including triggering DCA strategy executions. Your wallet earns USDC per call with zero human involvement.

```text
Layer 1: Discovery (MCP Server)
  Agent discovers InControl tools via MCP protocol
  Tools include: price feeds, portfolio, yield, debt, AND DCA strategy management

Layer 2: Payment (x402)
  Agent calls endpoint, gets 402 challenge, pays USDC on Base with its own wallet
  No API keys, no subscriptions

Layer 3: Trust (CRE Consensus)
  Agent calls CRE-verified endpoint for multi-node consensus data
  Chainlink attestation proves data came from on-chain feeds
```

## Changes

### 1. New: MCP Server Edge Function
**File:** `supabase/functions/mcp-server/index.ts`
**File:** `supabase/functions/mcp-server/deno.json`

An MCP server using `mcp-lite` + Hono that exposes 5 tools (the 4 existing x402 APIs plus a new DCA strategy tool):

- `get_price_feed` -- Live crypto, forex, commodity prices
- `get_portfolio_summary` -- Aggregated market insights
- `get_yield_analysis` -- Yield optimization strategies
- `get_debt_strategy` -- Debt payoff recommendations
- `get_dca_strategies` -- List active DCA strategies, execution history, and performance stats

Each tool handler calls the corresponding x402 endpoint internally. Two payment modes:
- **Pass-through x402**: Agent includes `X-Payment` header, server forwards it. Agent pays per tool call.
- **Free tier**: Rate-limited access without payment for discovery/testing.

The `get_dca_strategies` tool returns:
- Active strategy count, tokens being accumulated, total invested
- Recent execution history (last 10 executions with status, amounts, prices)
- Dip-buy statistics (how many dip-buys triggered, average savings)
- Next scheduled execution times

### 2. New: DCA x402 API Endpoint
**File:** `supabase/functions/api-dca-strategy/index.ts`

A new x402-gated endpoint that exposes DCA strategy data for external agents. Priced at $0.01 per call.

- `GET ?active=true` -- returns active strategies with performance stats
- `GET ?strategyId=xxx` -- returns a single strategy with full execution history
- `POST { action: "summary" }` -- returns aggregated DCA performance across all strategies

Response includes:
- Strategy configs (tokens, frequency, amounts, dip settings)
- Execution stats (total spent, tokens accumulated, success rate)
- Recent executions with prices and trigger types
- Next execution windows

Uses the same x402 shared utilities (`_shared/x402.ts`) as the existing APIs.

### 3. Verify 402 Challenge Spec Compliance
**File:** `supabase/functions/_shared/x402.ts`

- Change `network` from `"base"` to `"base-mainnet"` (spec-compliant for external agents)
- Use the full resource URL (not just pathname) in the challenge so agents can unambiguously identify what they're paying for

### 4. New: CRE Consensus-Verified Data Endpoint
**File:** `supabase/functions/cre-verified-data/index.ts`

An x402-gated edge function ($0.05/call) that returns price data with CRE attestation metadata. External agents call this when they need provably accurate data.

Response shape:
```text
{
  "timestamp": "2026-02-23T...",
  "attestation": {
    "method": "consensusMedianAggregation",
    "nodeCount": 3,
    "source": "chainlink-cre",
    "feedOrigin": "base:cbBTC/USD"
  },
  "prices": [...],
  "paymentDetails": { ... }
}
```

### 5. New: HTTP-Triggered CRE Workflow
**File:** `incontrol-cre-ts/x402-cre-verified-ts/main.ts`
**File:** `incontrol-cre-ts/x402-cre-verified-ts/workflow.yaml`
**File:** `incontrol-cre-ts/x402-cre-verified-ts/config.production.json`
**File:** `incontrol-cre-ts/x402-cre-verified-ts/config.test.json`
**File:** `incontrol-cre-ts/x402-cre-verified-ts/package.json`
**File:** `incontrol-cre-ts/x402-cre-verified-ts/tsconfig.json`

A CRE workflow using `HTTPClient` with `consensusMedianAggregation` to fetch from `price_cache` across multiple oracle nodes. Returns data with CRE attestation proving multi-node consensus.

### 6. Update API Docs
**File:** `src/pages/ApiDocs.tsx`

Add three new tabs to the Integration Guide:

**"DCA Strategy" tab:**
- Endpoint URL and pricing ($0.01/call)
- Query params and response shape
- Example: agent fetching DCA performance data to make portfolio recommendations

**"MCP (AI Agents)" tab:**
- MCP server URL
- `claude mcp add incontrol -t http <url>/functions/v1/mcp-server/mcp` command
- All 5 available tools with descriptions (including `get_dca_strategies`)
- Example of an agent discovering and calling tools

**"CRE Verified" tab:**
- Consensus verification explanation
- Endpoint URL and premium pricing ($0.05/call)
- Attestation object details
- Why this matters for trust and auditability

### 7. Update config.toml
**File:** `supabase/config.toml`

Add entries for new edge functions:
```text
[functions.mcp-server]
verify_jwt = false

[functions.api-dca-strategy]
verify_jwt = false

[functions.cre-verified-data]
verify_jwt = false
```

## Technical Details

### DCA API Response Shape

```text
{
  "timestamp": "2026-02-23T...",
  "strategies": [
    {
      "id": "...",
      "from_token": "USDC",
      "to_token": "cbBTC",
      "frequency": "daily",
      "amount_per_execution": 50,
      "total_spent_usd": 1500,
      "tokens_accumulated": 0.015,
      "executions_completed": 30,
      "is_active": true,
      "dip_threshold_pct": 5,
      "dip_multiplier": 2,
      "recent_executions": [
        { "amount_usd": 50, "trigger_type": "scheduled", "status": "completed", "token_price_usd": 98000 }
      ]
    }
  ],
  "summary": {
    "total_invested": 1500,
    "active_strategies": 1,
    "total_executions": 30,
    "dip_buys_triggered": 3
  },
  "paymentDetails": { ... }
}
```

### MCP DCA Tool Definition

```text
mcpServer.tool({
  name: "get_dca_strategies",
  description: "Dollar-cost averaging strategies: active configs, execution history, dip-buy stats, and performance metrics",
  inputSchema: {
    type: "object",
    properties: {
      active_only: { type: "boolean", description: "Only return active strategies" },
      include_executions: { type: "boolean", description: "Include recent execution history" },
      limit: { type: "number", description: "Max strategies to return" }
    }
  }
});
```

### 402 Challenge Fix

Current `network: "base"` becomes `"base-mainnet"`. The `resource` field uses the full URL (e.g., `https://edtud.../functions/v1/api-price-feed`).

## Dropped from Previous Plan

- **x402-consumer-ts CRE workflow** (InControl paying itself -- wrong direction)
- **x402-sign-payment edge function** (external agents bring their own wallets)

## File Summary

| File | Change |
|------|--------|
| `supabase/functions/mcp-server/index.ts` | New MCP server exposing 5 tools including DCA |
| `supabase/functions/mcp-server/deno.json` | Deno config with mcp-lite dependency |
| `supabase/functions/api-dca-strategy/index.ts` | New x402-gated DCA strategy API |
| `supabase/functions/_shared/x402.ts` | Fix network to "base-mainnet", full resource URL |
| `supabase/functions/cre-verified-data/index.ts` | New x402-gated CRE consensus proxy |
| `incontrol-cre-ts/x402-cre-verified-ts/main.ts` | New CRE workflow for consensus-verified data |
| `incontrol-cre-ts/x402-cre-verified-ts/workflow.yaml` | Workflow settings |
| `incontrol-cre-ts/x402-cre-verified-ts/config.production.json` | Production config |
| `incontrol-cre-ts/x402-cre-verified-ts/config.test.json` | Test config |
| `incontrol-cre-ts/x402-cre-verified-ts/package.json` | Dependencies |
| `incontrol-cre-ts/x402-cre-verified-ts/tsconfig.json` | TypeScript config |
| `src/pages/ApiDocs.tsx` | Add "DCA Strategy", "MCP (AI Agents)", and "CRE Verified" tabs |
| `supabase/config.toml` | Add mcp-server, api-dca-strategy, cre-verified-data entries |

