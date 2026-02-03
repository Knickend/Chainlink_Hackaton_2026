
# Plan: Improve Asset Display & Add Real Estate Category

## Overview

This plan addresses two requests:
1. **Enhance commodity and crypto asset cards** - Show price per unit + total value in user's currency
2. **Add new "Real Estate, Equity & Miscellaneous" category** - Remove real estate from the banking category

---

## Part 1: Enhanced Asset Row Display

### Current State
The asset cards currently show only the native quantity (e.g., "1.6 kg" for gold, "71,781 POL" for crypto) without showing:
- Current price per unit
- Total value in the user's selected display currency

### Proposed Changes

**Visual Layout Change:**
Each asset row will expand from a single-line display to a two-line layout:

```text
Current:
┌──────────────────────────────────────────────────┐
│ GOLD  Gold                         1.6 kg   ✏️ 🗑 │
└──────────────────────────────────────────────────┘

Proposed:
┌──────────────────────────────────────────────────┐
│ GOLD  Gold                                  ✏️ 🗑 │
│       1.6 kg × €2,650/oz         €135,438.42    │
└──────────────────────────────────────────────────┘
```

For crypto:
```text
┌──────────────────────────────────────────────────┐
│ BTC  Bitcoin                                ✏️ 🗑 │
│      2.7 BTC × €85,234        €230,132.58       │
└──────────────────────────────────────────────────┘
```

### Technical Implementation

**File: `src/components/AssetCategoryCard.tsx`**

1. Add new props to receive `formatDisplayUnitValue` and `displayUnit`
2. Create a helper function to get current price per unit from `livePrices`
3. Update the asset row JSX to show:
   - Row 1: Symbol badge + Name + Action buttons
   - Row 2: Quantity × Price/unit = Total Value (in display currency)

The card height will naturally increase to accommodate the extra row.

---

## Part 2: New "Real Estate, Equity & Miscellaneous" Category

### Current State
- 4 categories: `banking`, `crypto`, `stocks`, `commodities`
- Real estate is grouped under `banking` (labeled "Cash, Stablecoins & Real Estate")
- Database constraint: `category IN ('banking', 'crypto', 'stocks', 'commodities', 'metals')`

### Proposed Changes

Add a new category: `realestate` with UI label "Real Estate, Equity & Miscellaneous"

**Banking card changes:**
- Old label: "Cash, Stablecoins & Real Estate"
- New label: "Cash & Stablecoins"

### Technical Implementation

**Database Migration:**
Update the CHECK constraint to include `realestate`:
```sql
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_category_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_category_check 
  CHECK (category IN ('banking', 'crypto', 'stocks', 'commodities', 'metals', 'realestate'));
```

**TypeScript Changes:**

1. **`src/lib/types.ts`:**
   - Add `'realestate'` to `AssetCategory` type
   
2. **`src/components/AssetCategoryCard.tsx`:**
   - Add new entry to `categoryConfig`:
   ```typescript
   realestate: { icon: Home, label: 'Real Estate, Equity & Misc.', color: 'text-purple-400' }
   ```
   - Update banking label to "Cash & Stablecoins"
   - Add progress bar color for new category

3. **`src/components/AddAssetDialog.tsx`:**
   - Add new category option to dropdown
   - No ticker search for real estate (manual entry like banking)

4. **`src/hooks/usePortfolioHistory.ts`:**
   - Add `realestate: number` to `AssetsBreakdown` interface

5. **`src/components/SnapshotDetailView.tsx`:**
   - Add real estate category to pie chart config

6. **`supabase/functions/create-monthly-snapshot/index.ts`:**
   - Add real estate to breakdown calculation

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `'realestate'` to AssetCategory type |
| `src/components/AssetCategoryCard.tsx` | Add new category config, update banking label, enhance row layout for crypto/commodities |
| `src/components/AddAssetDialog.tsx` | Add new category option |
| `src/hooks/usePortfolioHistory.ts` | Add realestate to AssetsBreakdown |
| `src/components/SnapshotDetailView.tsx` | Add realestate to pie chart |
| `src/pages/Index.tsx` | Pass `formatDisplayUnitValue` and `displayUnit` to AssetCategoryCard |
| `supabase/functions/create-monthly-snapshot/index.ts` | Include realestate in breakdown |
| **Database Migration** | Add 'realestate' to category constraint |

---

## Technical Details

### Asset Row Enhancement (Part 1)

**New props for AssetCategoryCard:**
```typescript
interface AssetCategoryCardProps {
  // ... existing props
  formatDisplayUnitValue?: (value: number, showDecimals?: boolean) => string;
  displayUnit?: DisplayUnit;
}
```

**Helper function for getting unit price:**
```typescript
function getUnitPrice(asset: Asset, livePrices?: LivePrices): number | null {
  if (!asset.symbol || !livePrices) return null;
  const sym = asset.symbol.toUpperCase();
  
  // Check dedicated price fields
  if (sym === 'BTC') return livePrices.btc;
  if (sym === 'ETH') return livePrices.eth;
  // ... other checks
  
  // Check stocks map
  return livePrices.stocks?.[sym]?.price ?? null;
}
```

**Updated row JSX structure:**
```tsx
<div className="flex flex-col py-2 px-3 rounded-lg bg-secondary/30">
  {/* Row 1: Symbol, Name, Actions */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono">{asset.symbol}</span>
      <span className="text-sm">{asset.name}</span>
    </div>
    <div className="flex items-center gap-2">
      <EditAssetDialog ... />
      <DeleteConfirmDialog ... />
    </div>
  </div>
  
  {/* Row 2: Quantity × Price = Total (for crypto/commodities only) */}
  {(category === 'crypto' || category === 'commodities') && (
    <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
      <span>{quantity} {symbol} × {unitPrice}</span>
      <span className="font-mono font-medium text-foreground">
        {formatDisplayUnitValue(assetValueInDisplayUnit)}
      </span>
    </div>
  )}
</div>
```

### Category Addition (Part 2)

**TypeScript type update:**
```typescript
export type AssetCategory = 'banking' | 'crypto' | 'stocks' | 'commodities' | 'realestate';
```

**Category config update:**
```typescript
const categoryConfig: Record<AssetCategory, { icon: LucideIcon; label: string; color: string }> = {
  banking: { icon: Landmark, label: 'Cash & Stablecoins', color: 'text-blue-400' },
  realestate: { icon: Home, label: 'Real Estate, Equity & Misc.', color: 'text-purple-400' },
  crypto: { icon: Bitcoin, label: 'Cryptocurrency', color: 'text-bitcoin' },
  stocks: { icon: TrendingUp, label: 'Stocks, Bonds & ETFs', color: 'text-success' },
  commodities: { icon: Package, label: 'Commodities', color: 'text-gold' },
};
```

---

## User Experience

### After Implementation:

1. **Asset Cards** - Commodities and crypto will show richer information per asset:
   - Quantity held
   - Current price per unit  
   - Total value in the user's selected currency (EUR/USD/etc.)

2. **New Category** - Users can classify:
   - Real estate properties
   - Private equity/business ownership
   - Collectibles, art, or other miscellaneous assets
   
3. **Cleaner Banking** - The banking card focuses on liquid assets (cash, bank accounts, stablecoins)

---

## Summary

This implementation enhances the asset display for market-priced assets and adds proper categorization for real estate and miscellaneous holdings. The changes maintain backward compatibility - existing banking assets remain in their category, users can optionally recategorize real estate items to the new category.
