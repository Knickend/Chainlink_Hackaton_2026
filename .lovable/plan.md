

# DCA Strategy Card Improvements

## Changes

### 1. Add Edit Strategy functionality
- Create `src/components/dca/EditDCADialog.tsx` -- a dialog pre-filled with the strategy's current values (token, amount, frequency, dip threshold, dip multiplier). On submit, updates the row in `dca_strategies`.
- Add `updateStrategy` method to `src/hooks/useDCAStrategies.ts` that calls `supabase.from('dca_strategies').update(...)`.
- Add an edit (Pencil) icon button to `DCAStrategyCard.tsx` next to the toggle and delete buttons.
- Pass `onEdit` callback from `DCA.tsx` down to each card.

### 2. Green "Active" badge instead of yellow
- In `DCAStrategyCard.tsx`, change the active badge from `variant="default"` (which renders yellow/primary) to a custom green style using the `className` prop: `bg-green-500/20 text-green-400 border-green-500/30`.

### 3. Full-width strategy cards
- In `DCA.tsx`, change the strategies grid from `grid-cols-1 md:grid-cols-2` to `grid-cols-1` so each card spans the full width, matching the other cards on the page (Architecture Explainer, Execution History, etc.).

## Files

| Action | File |
|--------|------|
| Create | `src/components/dca/EditDCADialog.tsx` |
| Modify | `src/hooks/useDCAStrategies.ts` -- add `updateStrategy` method |
| Modify | `src/components/dca/DCAStrategyCard.tsx` -- add edit button, green active badge |
| Modify | `src/pages/DCA.tsx` -- pass `onEdit`, change grid to single column |

## Technical Details

### EditDCADialog
- Reuses the same form layout as `CreateDCADialog` but pre-populates fields from the existing strategy
- Accepts `strategy: DCAStrategy` and `onUpdate` callback as props
- The dialog trigger is a Pencil icon button rendered inside the card

### updateStrategy hook method
```text
const updateStrategy = async (id: string, input: Partial<CreateDCAStrategyInput>) => {
  await supabase.from('dca_strategies').update({...fields}).eq('id', id);
  refetch strategies
}
```

### Badge styling
```text
Active:  className="bg-green-500/20 text-green-400 border-green-500/30"
Paused:  variant="secondary" (unchanged)
```

