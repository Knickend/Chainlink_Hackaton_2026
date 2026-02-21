

# CRE Workflow Simulator UI and Architecture Explainer

## Overview

Add two new components to the DCA page and a supporting edge function so hackathon judges can trigger and watch the Chainlink CRE workflow execute live in the browser, plus understand the architecture at a glance.

---

## New Files

### 1. `supabase/functions/simulate-dca-cre/index.ts` -- Edge Function

A server-side function that replicates the CRE workflow logic but is callable from the browser. It mirrors the exact steps from `main.ts`:

1. Authenticates the user via their JWT (not CRON_SECRET)
2. Accepts a `force` boolean flag from the request body
3. Fetches the user's active strategies from `dca_strategies`
4. Filters due strategies using the same frequency logic (hourly/daily/weekly/biweekly/monthly) -- or skips filtering if `force=true`
5. For each due strategy:
   - Checks budget remaining
   - Fetches price from `price_cache` using the same `CHAINLINK_SYMBOL_MAP` mapping (cbBTC -> base:cbBTC/USD, ETH -> base:ETH/USD)
   - Calls `execute-dca-order` internally using `CRON_SECRET`
6. Returns a structured response with step-by-step logs and execution results so the UI can display them in real time

Key difference from the real CRE workflow: this runs as a single server call (no multi-node consensus), which is fine for demo purposes. The UI will explain that in production, Chainlink CRE runs this across multiple nodes with consensus.

### 2. `src/components/DCAWorkflowDemo.tsx` -- Simulator Card

A visually striking card with:

- **Chainlink logo** (from `src/assets/chainlink-logo.png`) and "CRE Workflow Simulator" header
- **Horizontal flow diagram** showing the 5 pipeline steps as connected nodes:
  ```
  Cron Trigger -> Fetch Strategies -> Filter Due -> Price Check (Chainlink) -> Execute Order
  ```
  Each node highlights/animates as the simulation progresses
- **Force toggle** -- switch between "Only due strategies" and "Force execute all" modes
- **"Simulate CRE Trigger" button** -- calls the edge function
- **Live log panel** -- a scrollable dark terminal-style area that shows each step's log output as it arrives (e.g., "[DCA] Found 2 active strategies", "[DCA] Chainlink price for cbBTC: $107,234")
- **Results summary** -- green/red badges showing succeeded/failed counts
- After simulation completes, calls `refetch()` from `useDCAStrategies` so the strategies list and execution history update immediately

### 3. `src/components/CREArchitectureCard.tsx` -- Architecture Explainer

An expandable card (collapsed by default via Collapsible) explaining how Chainlink CRE powers the DCA automation:

- **Section 1: "How It Works"** -- 4 numbered items with icons:
  1. CronCapability triggers the workflow every hour
  2. HTTPClient fetches strategies from the database with multi-node consensus
  3. Price data is retrieved from Chainlink on-chain feeds (price_cache)
  4. Execute-dca-order is called to perform the trade via the agent wallet

- **Section 2: "CRE SDK Features Used"** -- badges/chips listing:
  - `cre.Handler()` -- workflow entry point
  - `CronCapability` -- time-based trigger
  - `HTTPClient` -- consensus HTTP requests
  - `runInNodeMode()` -- multi-node execution
  - `consensusMedianAggregation()` -- data integrity

- **Section 3: "Symbol Mapping"** -- small table showing:
  | Token | Chainlink Feed |
  |-------|---------------|
  | cbBTC | base:cbBTC/USD |
  | ETH   | base:ETH/USD |
  | WETH  | base:ETH/USD |

---

## Modified Files

### 4. `src/pages/DCA.tsx` -- Add Components to Page

- Import `DCAWorkflowDemo` and `CREArchitectureCard`
- Add `CREArchitectureCard` after the page header (before the strategy form)
- Add `DCAWorkflowDemo` between the strategy form and the active strategies list
- Pass `refetch` from `useDCAStrategies` to `DCAWorkflowDemo` so it can refresh data after simulation

---

## Technical Details

### Edge Function: `simulate-dca-cre`

```text
Auth: extracts user from JWT via supabase.auth.getUser()
Input: { force?: boolean }
Output: {
  steps: Array<{ step: string, message: string, timestamp: string }>,
  results: Array<{ strategy_id, success, error?, tx_hash? }>,
  summary: { total, succeeded, failed, skipped }
}

Price lookup uses same mapping as CRE main.ts:
  CHAINLINK_SYMBOL_MAP = { cbBTC: "base:cbBTC/USD", ETH: "base:ETH/USD", WETH: "base:ETH/USD" }
  Query: SELECT price FROM price_cache WHERE symbol = 'base:cbBTC/USD' LIMIT 1

Calls execute-dca-order with:
  Authorization: Bearer ${CRON_SECRET}
  Body: { strategy_id, user_id, from_token, to_token, amount_usd, trigger_type, token_price_usd }
```

### Simulator UI Component Structure

```text
DCAWorkflowDemo
  Card
    CardHeader
      img (chainlink-logo.png, 24x24)
      "CRE Workflow Simulator"
      Badge "Hackathon Demo"
    CardContent
      FlowDiagram (5 connected step boxes, active step highlighted with blue border + pulse)
      Controls row:
        Switch "Force execute all"
        Button "Simulate CRE Trigger" (with Play icon, primary variant)
      LogPanel (dark bg, monospace font, auto-scrolls, max-h-64 overflow-y-auto)
        Each log entry: timestamp + message
      ResultsSummary (only shown after run):
        Badge "N succeeded" (green)
        Badge "N failed" (red, if any)
```

### Component State Flow

```text
1. User clicks "Simulate CRE Trigger"
2. Button shows loading spinner
3. Flow diagram highlights step 1 (Cron Trigger)
4. Edge function is called via supabase.functions.invoke('simulate-dca-cre', { body: { force } })
5. Response arrives with steps[] and results[]
6. Steps are rendered into the log panel
7. Flow diagram highlights each step based on the step names
8. Results summary appears
9. refetch() is called to update strategies + executions
```

### Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/simulate-dca-cre/index.ts` | Create | Edge function replicating CRE logic |
| `src/components/DCAWorkflowDemo.tsx` | Create | Simulator UI with flow diagram and logs |
| `src/components/CREArchitectureCard.tsx` | Create | Architecture explainer card |
| `src/pages/DCA.tsx` | Edit | Wire up new components |

