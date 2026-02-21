

# Dashboard Default Layout Reorder

## Overview

Reorder the default card positions in the dashboard grid and bring the Asset Categories section into the customizable grid as a new card.

## Changes

### 1. Add "Asset Categories" as a grid card

The "Assets by Category" section is currently rendered outside the grid (hardcoded below it). It will be moved into the grid as a new card so users can reposition it like any other card.

- **`src/hooks/useDashboardLayout.ts`**: Add `'asset-categories'` to the `CARD_REGISTRY` (defaultW: 12, defaultH: 4, minW: 6, minH: 3)
- **`src/pages/Index.tsx`**: Move the Asset Categories content into `cardRenderers` under `'asset-categories'` key. Remove the hardcoded section below the grid.

### 2. Reorder the default layout

Update `generateDefaultLayout()` in `src/hooks/useDashboardLayout.ts` to this order:

| Row | Cards | Y offset |
|-----|-------|----------|
| 1 | Net Worth (4w), Allocation (4w), Portfolio History (4w) | y=0, h=4 |
| 2 | Profit & Loss (12w) | y=4, h=3 |
| 3 | Asset Categories (12w) | y=7, h=4 |
| 4 | Rebalancer (6w) | y=11, h=4 |
| 5 | Goals Overview (12w) | y=15, h=3 |
| 6 | Investment Strategy (12w) | y=18, h=3 |
| 7 | Income (4w), Expenses (4w), Debt (4w) | y=21, h=4 |
| 8 | Debt Payoff (12w) | y=25, h=3 |

### 3. Files modified

| File | Change |
|------|--------|
| `src/hooks/useDashboardLayout.ts` | Add `asset-categories` to registry, reorder `generateDefaultLayout()` |
| `src/pages/Index.tsx` | Move Asset Categories section into `cardRenderers`, remove hardcoded section below grid |

### Note
Users who already have a saved layout will not be affected -- their saved positions are loaded from the database. This only changes the default for new users or after a "Reset Layout".

