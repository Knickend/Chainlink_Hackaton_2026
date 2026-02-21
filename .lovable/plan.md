

# Dashboard UI/UX Improvements

## 1. Separate Portfolio Rebalancer Card

The rebalancer is currently embedded inside the Portfolio History card, making it cramped. It will be extracted into its own standalone dashboard grid card.

**Changes:**
- **`src/components/PortfolioHistoryCard.tsx`**: Remove the embedded RebalanceCard section (lines ~267-283) so the Portfolio History card is cleaner
- **`src/pages/Index.tsx`**: Add a `'rebalancer'` entry to the `cardRenderers` map that renders a standalone RebalanceCard with its own `useRebalancer` hook and `useInvestmentPreferences` data
- **`src/hooks/useDashboardLayout.ts`**: The registry already includes `rebalancer` -- no changes needed

## 2. Clean Up Header in Edit Mode

Currently, when edit mode is on, extra controls (Cards panel button) appear inline, making the header crowded. The fix is to:

- **`src/pages/Index.tsx`**: Move the edit mode controls into a secondary toolbar bar below the main header, keeping the main header clean. When `isEditMode` is true, a colored info bar appears beneath the header with the "Cards" panel button, "Reset" button, and "Done Editing" button, separated from the primary navigation.

## 3. Sticky Header

Make the header stick to the top when scrolling so users always have access to key controls.

**Changes:**
- **`src/pages/Index.tsx`**: Wrap the header in a sticky container with `sticky top-0 z-30 bg-background/95 backdrop-blur-sm` so it stays visible during scroll. The key metrics row will remain in the normal document flow (not sticky).

## Files Summary

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add rebalancer card renderer, restructure header into sticky primary + conditional edit toolbar, sticky positioning |
| `src/components/PortfolioHistoryCard.tsx` | Remove embedded RebalanceCard section |

