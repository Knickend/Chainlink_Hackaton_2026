

# Fix Next Run Date Display for New DCA Strategies

## Problem

When a strategy has never been executed, both `next_execution_at` and `last_executed_at` are null. The current logic falls through to "Pending first run" instead of calculating the first scheduled run based on `created_at` + frequency.

## Fix

**File: `src/components/DCAProgressCard.tsx`**

Update the `nextExecLabel` fallback logic: instead of returning "Pending first run" when `last_executed_at` is null, calculate the next run from `created_at` using the same frequency-based offset.

```
// Before (line ~30):
if (!strategy.last_executed_at) return 'Pending first run';

// After:
const baseDate = strategy.last_executed_at || strategy.created_at;
const base = new Date(baseDate);
```

This way a weekly strategy created on Feb 20 at 6:00 PM will show "Next Run: Feb 27, 2026, 6:00 PM".

## Files

| File | Change |
|------|--------|
| `src/components/DCAProgressCard.tsx` | Use `created_at` as fallback base for next run calculation |

