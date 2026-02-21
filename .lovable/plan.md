

# Fix Workflow Simulator Step Highlighting

## Problem

When strategies are skipped (not due for execution), the simulator shows misleading visual feedback:
1. Price Check and Execute Order steps never fire, yet Execute Order shows green because the final summary log uses `'execute_order'` as its step key
2. No indication of what happened after filtering -- the pipeline visualization jumps from "Filter Due" to a green "Execute Order"

## Solution

Two changes to fix the visual accuracy:

### 1. Edge Function: `supabase/functions/simulate-dca-cre/index.ts`

- Change the final summary log (line 198) from step key `'execute_order'` to `'summary'` so it does not falsely highlight the Execute Order pipeline node
- When all strategies are skipped (dueStrategies is empty), add explicit `price_check` and `execute_order` skip messages so the pipeline shows the full flow with appropriate context:
  - `price_check`: "No strategies due -- skipping price check"
  - `execute_order`: "No strategies due -- skipping execution"
  These will still highlight those nodes but with skip messages rather than false success

### 2. UI Component: `src/components/DCAWorkflowDemo.tsx`

- Add `'summary'` to the awareness of the component (no pipeline node needed, just don't break on unknown step keys)
- Update the flow diagram coloring logic: instead of always green when a step has logs, check if the step's logs contain skip/failure indicators. Specifically:
  - If all logs for a step contain "skipping" or "skipped", show it in a neutral/yellow color instead of green
  - Keep green only for steps that actually completed successfully

### Detailed Changes

**Edge function (lines 118-198):**
After the filter_due log, when `dueStrategies.length === 0`:
```typescript
if (dueStrategies.length === 0) {
  addStep(steps, 'price_check', '⏭️ No strategies due — skipping price check');
  addStep(steps, 'execute_order', '⏭️ No strategies due — skipping execution');
}
```

Change line 198 from:
```typescript
addStep(steps, 'execute_order', `...Simulation complete...`);
```
to:
```typescript
addStep(steps, 'summary', `...Simulation complete...`);
```

**UI component -- flow diagram coloring (lines 101-109):**
Add a third color state for "skipped" steps. A step is considered skipped if it has logs but all of them contain skip indicators. Use a yellow/amber color for skipped steps instead of green:
- Skipped: `border-yellow-500/50 bg-yellow-500/10 text-yellow-400`
- Success: `border-green-500/50 bg-green-500/10 text-green-400` (existing)
- Inactive: `border-border text-muted-foreground` (existing)

Logic:
```typescript
const stepLogs = logs.filter(l => l.step === step.key);
const hasLogs = stepLogs.length > 0;
const allSkipped = hasLogs && stepLogs.every(l => l.message.includes('skipping') || l.message.includes('⏭️'));
```

| File | Change |
|------|--------|
| `supabase/functions/simulate-dca-cre/index.ts` | Add skip logs for price_check/execute_order when no due strategies; change summary step key |
| `src/components/DCAWorkflowDemo.tsx` | Add yellow/amber "skipped" state to flow diagram nodes |

