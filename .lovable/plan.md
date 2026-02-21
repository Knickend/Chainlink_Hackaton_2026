

# Implement Real Dip-Buying with 5-Minute Price Monitoring

## Problem

The CRE workflow runs hourly, and dip-buying logic is a placeholder. A 5% price drop that recovers within 15 minutes would be completely missed.

## Approach

Run the CRE cron every 5 minutes instead of hourly. The existing `filterDueStrategies` function already gates regular strategies by their configured frequency (daily, weekly, etc.), so they won't execute more often. The key change is adding a **dip-detection pass**: on every 5-minute tick, strategies with `dip_threshold_pct > 0` get a price comparison against their last execution price (stored in `dca_executions.token_price_usd`). If the current price has dropped beyond the threshold, a dip-buy is triggered immediately -- regardless of the regular schedule.

```text
Every 5 min tick:
  1. Fetch all active strategies
  2. Regular pass: filter by schedule frequency (unchanged)
  3. Dip pass: for strategies with dip_threshold_pct > 0 that are NOT already in the regular batch,
     fetch last execution price from dca_executions, compare with current price_cache price.
     If drop >= threshold, add to execution list with multiplied amount.
  4. Execute combined list
```

## Changes

### 1. CRE Workflow: `incontrol-cre-ts/dca-trigger-ts/main.ts`

**Cron schedule** (line 80): Change from `"0 0 */1 * * *"` (hourly) to `"0 */5 * * * *"` (every 5 minutes).

**Add `DCAStrategy` type field**: Add `last_execution_price` to the interface -- this will be fetched separately, not from the strategy table.

**Replace placeholder dip logic** (lines 209-218) with real comparison:

```text
For each strategy with dip_threshold_pct > 0:
  1. Query dca_executions for the most recent completed execution's token_price_usd
  2. Compare: pctDrop = ((lastPrice - currentPrice) / lastPrice) * 100
  3. If pctDrop >= dip_threshold_pct:
     - executionAmount = amount_per_execution * dip_multiplier
     - trigger_type = "dip_buy"
     - Log: "[DCA] Dip detected: -X.X% (threshold: Y%), multiplying amount by Z"
```

**Add dip-detection pass after the regular filter** (after line 118):

```text
// Separate dip-eligible strategies that were NOT already due
const dipCandidates = strategies.filter(s =>
  s.dip_threshold_pct > 0 &&
  s.dip_multiplier > 1 &&
  !dueStrategies.some(d => d.id === s.id)
);

For each dipCandidate:
  - Fetch current price from price_cache via HTTPClient
  - Fetch last execution price from dca_executions via HTTPClient
  - If drop >= threshold, add to dueStrategies with a flag indicating dip_buy
```

### 2. Simulate Edge Function: `supabase/functions/simulate-dca-cre/index.ts`

Mirror the same dip-detection logic so the simulator accurately reflects the CRE behavior:
- After filtering due strategies, run a second pass for dip candidates
- Query `dca_executions` for the last completed execution price per strategy
- Compare against `price_cache` and log the dip check results
- Add step logs like: "Dip check: ETH dropped 6.2% (threshold 5%) -- triggering dip buy at 2x"

### 3. Strategy Form: `src/components/DCAStrategyForm.tsx`

No structural changes needed. The form already captures `dip_threshold_pct` and `dip_multiplier`. Optionally add a tooltip explaining that dip-enabled strategies are monitored every 5 minutes.

### 4. Workflow YAML: `incontrol-cre-ts/dca-trigger-ts/workflow.yaml`

No changes needed -- it references `main.ts` which will have the updated schedule.

---

## Technical Details

### Dip Detection Query (CRE HTTPClient call)

```text
GET /rest/v1/dca_executions
  ?strategy_id=eq.{id}
  &status=eq.completed
  &token_price_usd=not.is.null
  &order=created_at.desc
  &limit=1
  &select=token_price_usd
```

This returns the price at last successful execution. If no previous execution exists, dip detection is skipped (no baseline to compare against).

### Dip Calculation

```text
pctDrop = ((lastPrice - currentPrice) / lastPrice) * 100
if pctDrop >= strategy.dip_threshold_pct:
  executionAmount = strategy.amount_per_execution * strategy.dip_multiplier
  triggerType = "dip_buy"
```

### Preventing Rapid-Fire Dip Buys

To avoid executing a dip-buy every 5 minutes while the price stays low, the dip comparison uses the **last execution price** (not some fixed reference). After a dip-buy executes, the new execution becomes the baseline, so the price would need to drop *another* N% from the dip-buy price to trigger again.

### Files Summary

| File | Change |
|------|--------|
| `incontrol-cre-ts/dca-trigger-ts/main.ts` | Change cron to 5min; add dip-detection pass with real price comparison; replace placeholder logic |
| `supabase/functions/simulate-dca-cre/index.ts` | Mirror dip-detection logic; add dip-check step logs |
| `src/components/DCAStrategyForm.tsx` | Optional: add tooltip about 5-min monitoring for dip strategies |

