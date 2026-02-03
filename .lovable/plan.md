
# Plan: Fix Banking Asset Value Not Updating on Fund Flow Deduction

## Problem

When using the "Linked" fund flow mode to buy an asset with funds from a banking source (e.g., buying crypto with USD from a bank account), the source asset's quantity is correctly deducted, but the category total (shown as "$10,000.00" in the Banking card) does not reflect the new balance.

**What you see:**
- Individual asset shows: $9,220.00 (correct)
- Category total shows: $10,000.00 (incorrect - should also be $9,220.00)

## Root Cause

The fund flow logic in `Index.tsx` only updates the `quantity` field when deducting from a source asset:

```typescript
await updateAsset(data.source_asset_id, {
  quantity: newSourceQty,  // Only quantity is updated
});
```

However, **banking assets** do not auto-calculate their `value` from `quantity` like crypto/stocks/commodities do. The `usePortfolio` hook skips the value recalculation for banking assets, so they continue using the stale `value` stored in the database.

**How other asset types work:**
- Crypto, Stocks, Commodities: `value = quantity × livePrice` (auto-calculated)
- Banking: `value` must be explicitly updated alongside `quantity`

## Solution

Update the fund flow logic to also recalculate and update the `value` field for banking source/destination assets using the appropriate forex conversion rate.

---

## Technical Implementation

### File: `src/pages/Index.tsx`

**Change 1: Update Buy More handler (lines 574-586)**

When deducting from a banking source asset, also update the `value` field:

```typescript
// Auto-update source asset if linked mode
if (data.fund_flow_mode === 'linked' && data.source_asset_id && data.source_amount) {
  const sourceAsset = assets.find(a => a.id === data.source_asset_id);
  if (sourceAsset) {
    const newSourceQty = (sourceAsset.quantity || 0) - data.source_amount;
    if (newSourceQty <= 0) {
      await deleteAsset(data.source_asset_id);
    } else {
      // For banking assets, also update value using forex rate
      const updateData: Partial<Asset> = { quantity: newSourceQty };
      
      if (sourceAsset.category === 'banking') {
        const forexRate = getForexRateToUSD(
          sourceAsset.symbol || 'USD',
          prices.forex
        );
        updateData.value = newSourceQty * forexRate;
      }
      
      await updateAsset(data.source_asset_id, updateData);
    }
  }
}
```

**Change 2: Update Sell handler (lines 632-641)**

When adding proceeds to a banking destination asset, also update the `value` field:

```typescript
// Auto-update destination asset if linked mode
if (data.fund_flow_mode === 'linked' && data.destination_asset_id && data.destination_amount) {
  const destAsset = assets.find(a => a.id === data.destination_asset_id);
  if (destAsset) {
    const newDestQty = (destAsset.quantity || 0) + data.destination_amount;
    
    // For banking assets, also update value using forex rate
    const updateData: Partial<Asset> = { quantity: newDestQty };
    
    if (destAsset.category === 'banking') {
      const forexRate = getForexRateToUSD(
        destAsset.symbol || 'USD',
        prices.forex
      );
      updateData.value = newDestQty * forexRate;
    }
    
    await updateAsset(data.destination_asset_id, updateData);
  }
}
```

**Change 3: Add import for `getForexRateToUSD`**

At the top of the file, add the import:

```typescript
import { AssetCategory, DebtType, getForexRateToUSD } from '@/lib/types';
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Update fund flow logic in `onBuyMore` and `onSell` handlers to also set `value` for banking assets |

---

## Why This Works

1. **Immediate UI Update**: When `updateAsset` is called with both `quantity` and `value`, the local state updates immediately with both fields
2. **Database Consistency**: The database stores the correct `value`, so page refreshes also show the correct total
3. **Forex Accuracy**: Uses live forex rates (with fallback to static) to ensure accurate USD conversion for non-USD banking assets

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| USD banking asset | Forex rate = 1, so value = quantity |
| EUR/GBP banking asset | Uses live forex rate to calculate USD value |
| Non-banking source/destination | No change - these auto-calculate value from live prices |
| Balance goes to zero | Asset is deleted (existing behavior preserved) |
