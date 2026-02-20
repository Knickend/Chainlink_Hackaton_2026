

# DCA Implementation Plan -- Ready to Execute

## Summary

Implementing the approved DCA (Dollar Cost Averaging) feature for crypto via the existing agent wallet. This adds automated, user-configurable crypto purchases (USDC to WETH/ETH/cbBTC on Base) with dip-buying logic.

## Implementation Steps (in order)

### Step 1: Database Migration
Create two new tables with RLS policies:
- **`dca_strategies`** -- user config (frequency, amount, token pair, dip rules, budget tracking)
- **`dca_executions`** -- execution log (price, amount, tx hash, trigger type)
- `updated_at` trigger on `dca_strategies`
- RLS: users manage their own rows; service role has full access for the orchestrator

### Step 2: Update `agent-wallet/index.ts`
- Add **cbBTC** (`0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf`) to `TOKEN_MAP` and `SWAP_TOKEN_MAP`
- Add **service-role bypass**: when `Authorization` matches the service role key AND `x-user-id` header is present, skip user JWT auth and use the override user ID (skips subscription check too, since the DCA orchestrator already verified eligibility)

### Step 3: Create `execute-dca-order` Edge Function
New function secured by `CRON_SECRET`. Receives a payload from the CRE workflow:
1. Validates CRON_SECRET
2. Fetches user wallet, verifies trade skill + spending limits
3. Inserts pending `dca_executions` row
4. Calls `agent-wallet` trade via service role + `x-user-id`
5. Updates execution status, strategy totals, `last_executed_at`
6. Deactivates strategy if budget exhausted or executions hit 0

### Step 4: Create CRE Workflow `dca-trigger-ts`
New folder `incontrol-cre-ts/dca-trigger-ts/` with:
- `main.ts` -- daily CRE workflow that checks which strategies are due, fetches price, applies dip logic, calls `execute-dca-order`
- `package.json`, `tsconfig.json`, `workflow.yaml`, `config.production.json`, `config.test.json`

### Step 5: Frontend -- DCA Dashboard
- **`src/hooks/useDCAStrategies.ts`** -- CRUD hook for strategies + executions
- **`src/components/DCAStrategyForm.tsx`** -- config form (token, frequency, amount, budget, dip rules)
- **`src/components/DCAProgressCard.tsx`** -- budget progress bar, tokens accumulated, next execution estimate
- **`src/components/DCAExecutionHistory.tsx`** -- execution log table with BaseScan links
- **`src/pages/DCA.tsx`** -- dashboard page combining all components
- **`src/App.tsx`** -- add `/dca` route

### Step 6: Config Updates
- Add `[functions.execute-dca-order]` with `verify_jwt = false` to `supabase/config.toml` (auto-managed)

## Files Created
| File | Purpose |
|------|---------|
| `supabase/functions/execute-dca-order/index.ts` | DCA orchestration edge function |
| `incontrol-cre-ts/dca-trigger-ts/main.ts` | CRE workflow |
| `incontrol-cre-ts/dca-trigger-ts/package.json` | Dependencies |
| `incontrol-cre-ts/dca-trigger-ts/tsconfig.json` | TS config |
| `incontrol-cre-ts/dca-trigger-ts/workflow.yaml` | CRE descriptor |
| `incontrol-cre-ts/dca-trigger-ts/config.production.json` | Prod config |
| `incontrol-cre-ts/dca-trigger-ts/config.test.json` | Test config |
| `src/pages/DCA.tsx` | Dashboard page |
| `src/hooks/useDCAStrategies.ts` | Data hook |
| `src/components/DCAStrategyForm.tsx` | Strategy form |
| `src/components/DCAProgressCard.tsx` | Progress card |
| `src/components/DCAExecutionHistory.tsx` | History table |

## Files Modified
| File | Change |
|------|--------|
| `supabase/functions/agent-wallet/index.ts` | cbBTC token + service-role bypass |
| `src/App.tsx` | Add `/dca` route |

## Security
- CRON_SECRET validates all automated calls to `execute-dca-order`
- Service-role bypass gated on exact key match + `x-user-id` header
- RLS enforces user isolation; service role can write for orchestration
- Existing spending limits (per-tx + daily) are respected
- Strategy auto-deactivates when budget is exhausted

