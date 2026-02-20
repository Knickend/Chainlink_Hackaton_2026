
# Add Edit/Adjust Option to DCA Strategy

## Overview

Add an edit button to each DCA strategy card that opens a dialog pre-filled with the current strategy values, allowing users to adjust amount, frequency, budget, max executions, and dip-buying settings.

## Changes

### 1. Add `updateStrategy` to `useDCAStrategies` hook

**File: `src/hooks/useDCAStrategies.ts`**

Add a new `updateStrategy` function that accepts a strategy ID and a partial `CreateStrategyInput`, then calls `supabase.from('dca_strategies').update(...)`. Export it from the hook's return value.

### 2. Create `EditDCAStrategyDialog` component

**File: `src/components/EditDCAStrategyDialog.tsx`** (new)

A dialog component that:
- Receives the current `DCAStrategy` and an `onSave` callback
- Pre-fills all form fields (token, frequency, amount, budget, max executions, dip settings) from the strategy
- Reuses the same form layout as `DCAStrategyForm` but inside a Dialog
- Token selection is read-only (changing the token mid-strategy would break tracking)
- On save, calls `onSave` with the updated values

### 3. Add Edit button to `DCAProgressCard`

**File: `src/components/DCAProgressCard.tsx`**

- Add a `Pencil` icon button next to the pause/delete buttons
- Add `onEdit` callback prop
- Wire it to open the edit dialog

### 4. Wire everything in `DCA.tsx`

**File: `src/pages/DCA.tsx`**

- Get `updateStrategy` from the hook
- Pass `onEdit` handler to `DCAProgressCard` that opens `EditDCAStrategyDialog`
- Or: manage the edit dialog state at this level, passing the selected strategy down

## Technical Details

### `updateStrategy` function signature
```typescript
const updateStrategy = async (id: string, input: Partial<CreateStrategyInput>) => {
  const { error } = await supabase
    .from('dca_strategies')
    .update({
      frequency: input.frequency,
      amount_per_execution: input.amount_per_execution,
      total_budget_usd: input.total_budget_usd ?? null,
      max_executions: input.max_executions ?? null,
      dip_threshold_pct: input.dip_threshold_pct ?? 0,
      dip_multiplier: input.dip_multiplier ?? 1,
    })
    .eq('id', id);
  // toast + refetch
};
```

### Editable fields
- Frequency (daily/weekly/biweekly/monthly)
- Amount per execution
- Total budget
- Max executions
- Dip threshold and multiplier

### Non-editable fields (displayed but disabled)
- Token pair (from_token / to_token) -- changing mid-strategy would break accumulation tracking

## Files

| File | Type | Change |
|------|------|--------|
| `src/hooks/useDCAStrategies.ts` | Modified | Add `updateStrategy` |
| `src/components/EditDCAStrategyDialog.tsx` | New | Edit dialog with pre-filled form |
| `src/components/DCAProgressCard.tsx` | Modified | Add edit button + `onEdit` prop |
| `src/pages/DCA.tsx` | Modified | Wire edit dialog and `updateStrategy` |
