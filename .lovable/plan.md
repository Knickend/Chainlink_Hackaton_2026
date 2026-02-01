
# Fix: Bitcoin Mining Income Currency Display

## Problem Identified
When adding Bitcoin mining income, the currency is being saved as USD instead of SATS/BTC. The database shows `currency: USD` for the mining income entry, causing it to display as "$250,000.00" instead of "250,000 sats".

## Root Cause
In `AddIncomeDialog.tsx`, the income type Select component uses `defaultValue={field.value}` instead of `value={field.value}`. This prevents the component from properly re-rendering when the type changes, which may cause the `useEffect` that auto-switches to SATS to not trigger correctly or have timing issues.

```tsx
// Current (problematic)
<Select onValueChange={field.onChange} defaultValue={field.value}>

// Should be
<Select onValueChange={field.onChange} value={field.value}>
```

## Solution
Change the type Select component to use controlled mode (`value` instead of `defaultValue`) to ensure the form state is properly synced and the auto-switch effect works reliably.

## File Changes

**`src/components/AddIncomeDialog.tsx`**:
- Line 123: Change `defaultValue={field.value}` to `value={field.value}` for the income type Select

## Technical Details
| Location | Current | Fixed |
|----------|---------|-------|
| Line 123 | `defaultValue={field.value}` | `value={field.value}` |

This ensures the Select component is fully controlled and re-renders properly when the type changes, allowing the `useEffect` on lines 57-61 to correctly auto-switch the currency to SATS when "Bitcoin Mining" is selected.

## Testing
After the fix:
1. Open Add Income dialog
2. Select "Bitcoin Mining" as the type
3. Verify the currency automatically switches to "sats - Satoshis (sats)"
4. Enter an amount and save
5. The income should display with "sats" suffix (e.g., "250,000 sats")
