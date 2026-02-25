

# Build DCA Page and Edit Dashboard Features

## Problem
The DCA management page and Edit Dashboard feature exist only as a plan -- no frontend code was ever created. The database tables (`dca_strategies`, `dca_executions`, `dashboard_layouts`) are ready but have no UI.

## What Will Be Built

### 1. DCA Management Page (`/dca`)

**New files:**
- `src/pages/DCA.tsx` -- Main page with strategy list, execution history, and workflow simulator
- `src/hooks/useDCAStrategies.ts` -- Hook for CRUD on `dca_strategies` and reading `dca_executions`
- `src/components/dca/DCAStrategyCard.tsx` -- Card per strategy showing token pair, amount, frequency, status, with toggle/delete controls
- `src/components/dca/CreateDCADialog.tsx` -- Form: select to_token (ETH/WETH/cbBTC), amount in USDC, frequency (daily/weekly/biweekly/monthly), optional dip threshold %
- `src/components/dca/DCAExecutionHistory.tsx` -- Table of past executions with status, price, amount, tx hash link to sepolia.basescan.org
- `src/components/dca/DCAWorkflowDemo.tsx` -- Visual pipeline simulator (Cron -> Fetch -> Filter -> Price -> Execute) using the `simulate-dca-cre` edge function

**Features:**
- List/create/toggle/delete DCA strategies
- View execution history per strategy
- Balance warning if wallet USDC is less than total committed amount (uses `useAgentWallet` hook)
- CRE Workflow Simulator visualization
- Only accessible to authenticated users with a connected agent wallet

### 2. Simulate DCA Edge Function

**New file:** `supabase/functions/simulate-dca-cre/index.ts`
- Accepts user's strategies, simulates the DCA pipeline (check frequencies, fetch prices, evaluate dip thresholds, mock execution)
- Returns step-by-step logs for the workflow demo visualization
- Uses existing dip-buying logic: compares current price against `token_price_usd` from last completed execution

### 3. Edit Dashboard Mode

**Modified file:** `src/pages/Index.tsx`
- Add a pencil/edit icon button in the header toolbar
- When active, each dashboard section gets a visibility toggle (eye icon) and drag handle for reordering
- Sections: Key Metrics, Charts, Portfolio History, P&L, Goals, Investment Strategy, Assets, Income/Expenses, Debt, Upcoming Expenses
- Layout saved to `dashboard_layouts` table via a new `useDashboardLayout` hook
- Default layout shows all sections in current order

**New files:**
- `src/hooks/useDashboardLayout.ts` -- Reads/writes `dashboard_layouts` table, provides section order and visibility state

### 4. Navigation Updates

**Modified file:** `src/App.tsx`
- Add `/dca` route

**Modified file:** `src/pages/Index.tsx`
- Add DCA link in header (only visible for users with connected wallet)

## Technical Details

### useDCAStrategies Hook
```text
- SELECT from dca_strategies WHERE user_id = current user
- SELECT from dca_executions WHERE strategy_id IN (user strategies), ordered by created_at DESC
- INSERT/UPDATE/DELETE on dca_strategies
- Wallet balance check via useAgentWallet().status.balance
```

### Dashboard Layout Schema (stored in dashboard_layouts.layout_config)
```text
{
  "sections": [
    { "id": "key-metrics", "visible": true, "order": 0 },
    { "id": "charts", "visible": true, "order": 1 },
    { "id": "pnl", "visible": true, "order": 2 },
    { "id": "goals", "visible": true, "order": 3 },
    { "id": "strategy", "visible": true, "order": 4 },
    { "id": "assets", "visible": true, "order": 5 },
    { "id": "income-expenses", "visible": true, "order": 6 },
    { "id": "debt", "visible": true, "order": 7 }
  ]
}
```

### File Summary
| Action | File |
|--------|------|
| Create | `src/pages/DCA.tsx` |
| Create | `src/hooks/useDCAStrategies.ts` |
| Create | `src/hooks/useDashboardLayout.ts` |
| Create | `src/components/dca/DCAStrategyCard.tsx` |
| Create | `src/components/dca/CreateDCADialog.tsx` |
| Create | `src/components/dca/DCAExecutionHistory.tsx` |
| Create | `src/components/dca/DCAWorkflowDemo.tsx` |
| Create | `supabase/functions/simulate-dca-cre/index.ts` |
| Modify | `src/App.tsx` -- add `/dca` route |
| Modify | `src/pages/Index.tsx` -- add DCA nav link + edit dashboard toggle with section reordering |

No database changes needed -- all tables already exist with proper RLS policies.
