

# Keep All 5 Pipeline Cards on One Horizontal Row

## Problem
The 5 pipeline step cards are wrapping to a second row because `flex-wrap` causes the last card ("Execution") to drop down when there isn't enough space.

## Solution
**File: `src/components/dca/CREArchitectureExplainer.tsx`**

- Remove `flex-wrap` from the container and remove `gap-2` (use tighter spacing)
- Remove `min-w-[110px]` from cards so they can shrink freely to fit
- Make each step item `flex-1` so all 5 distribute evenly across the full width
- Reduce padding from `p-3` to `p-2` to save horizontal space
- Hide the arrow separators on small screens using responsive classes, or make arrows narrower

This ensures all 5 steps stay in a single horizontal row regardless of container width, shrinking proportionally instead of wrapping.

