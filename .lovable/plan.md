

# Make All Assets Visible & Full-Width Rebalancer

## Changes

### 1. Remove scroll constraint on asset cards
**`src/components/AssetCategoryCard.tsx`** (line 114): Remove `max-h-[240px] overflow-y-auto pr-1` from the asset list container so all individual assets are always visible without scrolling.

### 2. Update rebalancer default size to full width
**`src/hooks/useDashboardLayout.ts`**:
- Change the rebalancer registry entry from `defaultW: 6` to `defaultW: 12` (line 24)
- Change the rebalancer in `generateDefaultLayout()` from `w: 6` to `w: 12` (line 52)
- Increase `asset-categories` default height from `h: 4` to `h: 6` in the layout (line 48) and registry (line 23) to accommodate showing all assets without scroll
- Bump `LAYOUT_VERSION` from `2` to `3` (line 7) so existing users get the updated defaults

### 3. Adjust Y offsets
Update the Y positions in `generateDefaultLayout()` to account for the taller asset categories card:
- Asset Categories: y=7, h=6 (was h=4)
- Rebalancer: y=13, w=12 (was y=11, w=6)
- Goals: y=17 (was y=15)
- Investment Strategy: y=20 (was y=18)
- Income/Expenses/Debt: y=23 (was y=21)
- Debt Payoff: y=27 (was y=25)

## Files modified

| File | Change |
|------|--------|
| `src/components/AssetCategoryCard.tsx` | Remove `max-h-[240px] overflow-y-auto pr-1` from asset list |
| `src/hooks/useDashboardLayout.ts` | Bump version to 3, rebalancer to 12w, asset-categories to h=6, adjust Y offsets |

