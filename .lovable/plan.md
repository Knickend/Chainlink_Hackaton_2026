

## Goal
Display the interest rate (yield percentage) next to the asset name in the "Cash & Stablecoins" category card for banking assets.

## Current State
- The Asset type has a `yield` property storing the annual interest rate percentage
- Database confirms yield data exists: OpenBank (3%), DHB bank (1.6%), Bunq (2%), etc.
- The banking category uses a single-line layout that currently shows only: `[EUR] Asset Name ... €Amount`
- The yield is not displayed anywhere in this row

## Proposed Design
Add the interest rate after the asset name when available:

**Before:** `EUR  OpenBank                           €150,368.00`

**After:** `EUR  OpenBank  3% APY                    €150,368.00`

The interest rate will be displayed in a subtle style (muted color, smaller text) to avoid visual clutter while still being informative.

---

## Changes Required

### File: `src/components/AssetCategoryCard.tsx`

**Location:** Lines 240-251 (single-line layout for banking/realestate)

**Current code:**
```typescript
<div className="flex items-center gap-2">
  {asset.symbol && !hasForexCurrency && (
    <span className="text-xs font-mono text-muted-foreground">{asset.symbol}</span>
  )}
  {hasForexCurrency && (
    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
      {asset.symbol}
    </span>
  )}
  <span className="text-sm">{asset.name}</span>
</div>
```

**Updated code:**
```typescript
<div className="flex items-center gap-2">
  {asset.symbol && !hasForexCurrency && (
    <span className="text-xs font-mono text-muted-foreground">{asset.symbol}</span>
  )}
  {hasForexCurrency && (
    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
      {asset.symbol}
    </span>
  )}
  <span className="text-sm">{asset.name}</span>
  {/* Show interest rate for banking assets */}
  {category === 'banking' && asset.yield != null && asset.yield > 0 && (
    <span className="text-xs text-success/80">{asset.yield}%</span>
  )}
</div>
```

---

## Technical Details

- **Condition:** `category === 'banking' && asset.yield != null && asset.yield > 0`
  - Only shows for banking category
  - Handles null/undefined yields (some accounts like "Rabobank betaalrekening" have no yield)
  - Skips 0% yields to reduce visual noise
  
- **Styling:** `text-xs text-success/80`
  - Small text to match other metadata
  - Green color (success) at 80% opacity - indicates positive yield without being too prominent

---

## Expected Result

After this change, the "Cash & Stablecoins" card will display:

| EUR | OpenBank | 3% | €150,368.00 |
| EUR | DHB bank | 1.6% | €125,136.00 |
| EUR | Bunq | 2% | €100,000.00 |
| EUR | Rabobank betaalrekening | | €X (no yield shown - it's null) |

This gives you at-a-glance visibility of which accounts are earning interest and at what rate.

