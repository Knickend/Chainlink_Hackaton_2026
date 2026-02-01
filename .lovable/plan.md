
# Make Dashboard Stat Cards Consistent Height

## Problem
Looking at the screenshot, the 5 stat cards in the key metrics row (Net Worth, Total Debt, Monthly Income, Monthly Net, Annual Yield) have inconsistent heights. This is caused by:

1. **Conditional content rendering** - Some cards show subtitles only when certain conditions are met
2. **Different elements in header** - Some cards have trend indicators, others have popover triggers
3. **No enforced minimum height** - Cards expand/contract based on content

## Solution
Apply consistent height styling to ensure all cards are the same size:

1. **Add `h-full` to StatCard and YieldBreakdownCard** - This makes cards stretch to fill grid cell height
2. **Always reserve space for subtitle** - Use `min-h-[20px]` or similar to ensure consistent spacing even when subtitle is empty
3. **Always reserve space for trend indicator** - Ensure the header row has consistent height

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/StatCard.tsx` | Add `h-full` class and ensure consistent spacing for optional elements |
| `src/components/YieldBreakdownCard.tsx` | Add `h-full` class to match StatCard height |

## Implementation Details

### StatCard.tsx
- Add `h-full` to the outer container to fill grid cell
- Add `flex flex-col` to enable proper spacing
- Push the subtitle to the bottom with `mt-auto` or ensure consistent min-height

### YieldBreakdownCard.tsx  
- Add `h-full` to match StatCard behavior
- Ensure the structure matches StatCard for visual consistency

## Visual Result
All 5 stat cards will have identical heights regardless of whether they have:
- A trend indicator (↑14.5%) 
- A popover trigger (0 sources)
- A subtitle or not

This creates a clean, uniform appearance across the dashboard header row.
