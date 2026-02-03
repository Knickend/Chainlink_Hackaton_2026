

# Plan: Fix Snapshot Creation for Banking Assets

## The Problem

The `create-monthly-snapshot` edge function uses `asset.value` for all assets (line 199), which is the stored USD equivalent. For banking assets, this value was calculated using static rates at save time, causing a mismatch when displayed with live forex rates.

The same issue exists in the `assets_breakdown` calculation (lines 235-240).

---

## Solution

Apply the same smart banking asset logic used in the frontend: use `quantity` (native currency amount) for banking assets and convert to USD using live forex rates at snapshot time.

---

## File to Modify

| File | Change |
|------|--------|
| `supabase/functions/create-monthly-snapshot/index.ts` | Update `totalAssets` and `assets_breakdown` calculations to handle banking assets properly |

---

## Technical Implementation

### 1. Fix totalAssets Calculation (line 199)

**Current:**
```typescript
const totalAssets = (assets || []).reduce((sum, a) => sum + Number(a.value || 0), 0);
```

**Fixed:**
```typescript
const totalAssets = (assets || []).reduce((sum, asset) => {
  if (asset.category === 'banking') {
    // For banking assets, use native currency amount (quantity) and convert to USD
    const nativeAmount = Number(asset.quantity ?? asset.value ?? 0);
    const currency = (asset.symbol || 'USD').trim().toUpperCase();
    return sum + convertToUSD(nativeAmount, currency, forexRates, btcPrice);
  }
  // For non-banking assets, value is already in USD
  return sum + Number(asset.value || 0);
}, 0);
```

### 2. Fix assets_breakdown Calculation (lines 227-240)

**Current:**
```typescript
const assetsBreakdown: AssetsBreakdown = {
  banking: 0,
  crypto: 0,
  stocks: 0,
  commodities: 0,
};

for (const asset of (assets || [])) {
  const category = asset.category as keyof AssetsBreakdown;
  if (category in assetsBreakdown) {
    assetsBreakdown[category] += Number(asset.value || 0);
  }
}
```

**Fixed:**
```typescript
const assetsBreakdown: AssetsBreakdown = {
  banking: 0,
  crypto: 0,
  stocks: 0,
  commodities: 0,
};

for (const asset of (assets || [])) {
  const category = asset.category as keyof AssetsBreakdown;
  if (category in assetsBreakdown) {
    if (category === 'banking') {
      // Use native currency amount for banking assets
      const nativeAmount = Number(asset.quantity ?? asset.value ?? 0);
      const currency = (asset.symbol || 'USD').trim().toUpperCase();
      assetsBreakdown[category] += convertToUSD(nativeAmount, currency, forexRates, btcPrice);
    } else {
      assetsBreakdown[category] += Number(asset.value || 0);
    }
  }
}
```

---

## How convertToUSD Works

The function already exists (lines 56-76) and handles forex conversion:
- Uses live rates from `price_cache` (loaded via `getLiveForexRates`)
- Falls back to static `FOREX_RATES_TO_USD` if live rates unavailable
- Handles BTC and SATS conversions

This means the fix reuses existing, tested conversion logic.

---

## After This Fix

| Action | Result |
|--------|--------|
| Create new snapshot | Uses correct banking asset amounts with live forex rates |
| Existing snapshots | Remain unchanged (historical data) |
| Chart displays | Will show correct values for new snapshots |

---

## To See Immediate Results

After deploying this fix:
1. Delete your current month's snapshot (via the snapshot detail modal)
2. Create a new snapshot
3. The chart will now match the StatCard

---

## Summary

The edge function will now calculate banking asset totals the same way the frontend does—using native currency amounts and live forex rates, ensuring consistency between the live dashboard and historical snapshots.

