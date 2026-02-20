

# Add Creation Date and Next Run DateTime to DCA Strategy Card

## Overview

Add two new info fields to the `DCAProgressCard` component showing when the strategy was created and the precise next scheduled run time.

## Changes

### File: `src/components/DCAProgressCard.tsx`

1. Add a "Created" field showing `strategy.created_at` formatted as date + time (e.g. "Feb 20, 2026, 5:31 PM")
2. Replace the current "Next" field logic with a proper datetime display using `strategy.next_execution_at` when available, falling back to the existing frequency-based calculation
3. Both fields will show date and time (not just date) for precision

### Layout

The existing 2x2 grid becomes a 3x2 grid:

| Amount | Frequency |
| Executions | Created |
| Next Run | (empty or dip info) |

Alternatively, "Created" and "Next Run" can be added as a new row below the existing grid as smaller text.

## Technical Details

- Use `toLocaleString()` for formatting with date and time
- `created_at` is already available on the `DCAStrategy` type
- `next_execution_at` is already on the type but currently null in the DB -- the fallback calculation already exists in the component
- No database or backend changes needed

## Files Modified

| File | Change |
|------|--------|
| `src/components/DCAProgressCard.tsx` | Add Created and Next Run datetime fields to the card grid |

