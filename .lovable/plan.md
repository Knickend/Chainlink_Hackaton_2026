
# Plan: Fix Real Estate Currency Display Bug

## The Problem

When entering a €450,000 real estate asset, the display shows €434,711.07 instead of €450,000.

**Root Cause:** The real estate category uses `formatValue(asset.value)` which:
1. Takes the stored USD value ($486,000)
2. Converts it back to EUR using the current forex rate
3. Results in €434,711 due to forex drift

The banking category correctly avoids this by displaying the native amount stored in `quantity` with the currency symbol from `symbol`.

## Data Flow Analysis

| Step | Banking (Correct) | Real Estate (Bug) |
|------|------------------|-------------------|
| User enters | €450,000 | €450,000 |
| Stored in `quantity` | 450000 | 450000 |
| Stored in `symbol` | EUR | EUR |
| Stored in `value` (USD) | ~$486,000 | ~$486,000 |
| Display logic | `quantity` × `symbol` = €450,000 | `value` × EUR rate = €434,711 |

## Solution

Update the `formatNativeAssetValue()` function in `AssetCategoryCard.tsx` to handle real estate assets identically to banking assets - by using the native currency amount stored in `quantity` and `symbol`.

---

## File to Modify

**`src/components/AssetCategoryCard.tsx`**

### Current Code (lines 143-171):
```typescript
const formatNativeAssetValue = (): string => {
  // Banking: show original currency amount
  if (category === 'banking' && asset.symbol && asset.quantity) {
    return `${getCurrencySymbol(asset.symbol)}${asset.quantity.toLocaleString(...)}`;
  }
  
  // Real estate: show value  ← BUG HERE
  if (category === 'realestate') {
    return formatValue(asset.value);
  }
  // ...
};
```

### Fixed Code:
```typescript
const formatNativeAssetValue = (): string => {
  // Banking and Real Estate: show original currency amount
  if ((category === 'banking' || category === 'realestate') && asset.symbol && asset.quantity) {
    return `${getCurrencySymbol(asset.symbol)}${asset.quantity.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
  
  // Fallback for realestate without proper currency data
  if (category === 'realestate') {
    return formatValue(asset.value);
  }
  // ...
};
```

---

## Additional UI Update

Also add the EUR currency badge for real estate assets (similar to banking):

```typescript
// Check for both banking and realestate with forex currency
const hasForexCurrency = (category === 'banking' || category === 'realestate') && 
  asset.symbol && BANKING_CURRENCIES.some(c => c.value === asset.symbol);
```

This ensures the display shows:
```
[EUR] House                €450,000.00
```

---

## Summary

This single-line fix aligns real estate display logic with banking, preventing forex drift by showing the native currency amount directly from the `quantity` field.
