
# Plan: Fix Net Worth Card Currency Conversion

## The Problem

The Net Worth card shows €91,216 instead of €100,000 for the same reason we fixed in category totals:
- **Current**: `totalNetWorth` sums all `asset.value` (stored in USD: 108,000)
- **Then**: `formatValue` converts 108,000 USD to EUR using live rate → €91,216
- **Expected**: When display unit is EUR and asset is EUR, show €100,000 directly

## Solution

Apply the same smart calculation logic from `categoryTotals` to `totalNetWorth` in the metrics calculation, handling banking assets specially.

---

## File to Modify

| File | Change |
|------|--------|
| `src/hooks/usePortfolio.ts` | Update `totalNetWorth` calculation to handle banking assets like `categoryTotals` does |

---

## Technical Implementation

### usePortfolio.ts - Fix totalNetWorth Calculation

**Current code (line 91-92):**
```typescript
const metrics: PortfolioMetrics = useMemo(() => {
  const totalNetWorth = assets.reduce((sum, asset) => sum + asset.value, 0);
```

**Fixed code:**
```typescript
const metrics: PortfolioMetrics = useMemo(() => {
  // Calculate total net worth with smart handling for banking assets
  // Banking assets: use native currency amounts to avoid round-trip conversion errors
  // Other assets: values are already in USD
  const totalNetWorth = assets.reduce((sum, asset) => {
    if (asset.category === 'banking') {
      const assetCurrency = asset.symbol || 'USD';
      const nativeAmount = asset.quantity ?? asset.value;
      
      // If asset currency matches display unit, use native amount directly
      if (assetCurrency === displayUnit) {
        return sum + nativeAmount;
      }
      
      // Otherwise convert from native currency to display unit
      // First to USD, then to display unit (or use convertFromCurrency if available)
      const liveFromRate = livePrices?.forex?.[assetCurrency];
      let amountInUSD: number;
      if (liveFromRate && liveFromRate > 0) {
        amountInUSD = nativeAmount * (1 / liveFromRate);
      } else {
        amountInUSD = nativeAmount * (FOREX_RATES_TO_USD[assetCurrency as BankingCurrency] || 1);
      }
      
      // Convert USD to display unit
      const liveToRate = livePrices?.forex?.[displayUnit];
      if (liveToRate && liveToRate > 0) {
        return sum + (amountInUSD * liveToRate);
      }
      
      return sum + (amountInUSD * conversionRates[displayUnit]);
    }
    
    // Non-banking assets: convert USD value to display unit
    return sum + (asset.value * conversionRates[displayUnit]);
  }, 0);
```

**Important**: Since `metrics` is calculated in a `useMemo` that now depends on `displayUnit`, we need to add `displayUnit` to its dependencies.

---

## Also Update Index.tsx

Since `totalNetWorth` will now be in the display unit (not USD), we need to use `formatDisplayUnitValue` instead of `formatValue`:

**Current:**
```typescript
value={formatValue(adjustedNetWorth, false)}
```

**Fixed:**
```typescript
value={formatDisplayUnitValue(adjustedNetWorth, false)}
```

Same for the subtitle showing total assets.

---

## Expected Result

| Scenario | Before | After |
|----------|--------|-------|
| €100,000 EUR asset, display: EUR | €91,216 | €100,000 |
| €100,000 EUR asset, display: USD | $108,000 | ~$118,398 (using live rate) |
| Mixed EUR + USD assets, display: EUR | Incorrect totals | Correctly converted totals |

---

## Summary

This extends the currency conversion fix from category totals to the main Net Worth calculation, ensuring banking assets display their native amounts when the display currency matches, and are properly converted when it doesn't.
