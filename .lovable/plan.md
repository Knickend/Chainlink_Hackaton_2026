
## Fix COP Currency Conversion Bugs

This plan addresses multiple currency conversion issues across the dashboard affecting Colombian Peso (COP) assets.

---

## Root Cause Analysis

The investigation revealed three distinct issues:

1. **Frankfurter API doesn't support COP** - Live forex rates don't include Colombian Peso, so the system must rely on fallback rates
2. **categoryTotals uses unconverted stock values** - The `assets` useMemo converts COP stocks to USD, but the value isn't being applied correctly to totals  
3. **Confusing COP display** - COP uses `$` symbol (same as USD), making native amounts look like USD values

---

## Changes Required

### 1. Fix Stock Category Total Calculation

**File:** `src/hooks/usePortfolio.ts`

**Issue:** The `categoryTotals` for stocks assumes all values are in USD, but the converted values from the `assets` useMemo aren't being used correctly.

**Solution:** Update the stocks category total calculation to explicitly handle non-USD currencies, similar to how banking/realestate are handled:

```typescript
// Lines 314-318 - Update the non-banking category total calculation
} else if (category === 'stocks') {
  // For stocks, some may have non-USD currencies that need conversion
  total = categoryAssets.reduce((sum, asset) => {
    if (asset.currency && asset.currency !== 'USD') {
      // Convert from native currency to display unit
      const rateToUsd = getForexRateToUSD(asset.currency, livePrices?.forex);
      const usdValue = asset.value * rateToUsd;
      return sum + (usdValue * conversionRates[displayUnit]);
    }
    // USD stocks: value is already in USD
    return sum + convertValue(asset.value);
  }, 0);
} else {
  // For crypto/commodities, values are already in USD
  total = categoryAssets.reduce((sum, asset) => sum + convertValue(asset.value), 0);
}
```

### 2. Fix Net Worth Calculation for Stocks

**File:** `src/hooks/usePortfolio.ts`

**Issue:** The `totalNetWorth` calculation in `metrics` doesn't handle non-USD stocks.

**Solution:** Add a check for stocks with non-USD currencies in the net worth calculation (around lines 103-137):

```typescript
// After the banking/realestate handling (line 136), add stocks handling
if (asset.category === 'stocks' && asset.currency && asset.currency !== 'USD') {
  const rateToUsd = getForexRateToUSD(asset.currency, livePrices?.forex);
  const usdValue = asset.value * rateToUsd;
  return sum + (usdValue * conversionRates[displayUnit]);
}
```

### 3. Improve COP Display Clarity

**File:** `src/components/AssetCategoryCard.tsx`

**Issue:** COP and USD both use `$` symbol, making COP amounts look like USD.

**Solution:** For real estate assets with COP, show the currency code instead of just the symbol:

```typescript
// In formatNativeAssetValue function, update the banking/realestate section
if ((category === 'banking' || category === 'realestate') && asset.symbol && asset.quantity) {
  const currencySymbol = asset.symbol === 'COP' ? 'COP ' : getCurrencySymbol(asset.symbol);
  return `${currencySymbol}${asset.quantity.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}
```

### 4. Remove Duplicate Stock Conversion Logic

**File:** `src/hooks/usePortfolio.ts`

**Issue:** The `assets` useMemo tries to convert COP stocks, but this causes confusion between display and calculation.

**Solution:** Keep the original `asset.value` in native currency (for display purposes) and only convert during total calculations. Remove lines 78-87:

```typescript
// REMOVE this block - conversion should happen in categoryTotals/metrics instead
// if (asset.category === 'stocks' && !price && asset.currency && asset.currency !== 'USD') {
//   ...
// }
```

---

## Updated categoryTotals Logic

The complete updated `categoryTotals` calculation:

```typescript
const categoryTotals = useMemo(() => {
  return Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
    let total: number;
    
    if (category === 'banking' || category === 'realestate') {
      // For banking and real estate, sum using native currency amounts
      total = categoryAssets.reduce((sum, asset) => {
        const assetCurrency = (asset.symbol || 'USD').trim().toUpperCase();
        const nativeAmount = asset.quantity ?? asset.value;
        
        if (assetCurrency === displayUnit) {
          return sum + nativeAmount;
        }
        return sum + convertFromCurrency(nativeAmount, assetCurrency);
      }, 0);
    } else if (category === 'stocks') {
      // For stocks, handle non-USD currencies explicitly
      total = categoryAssets.reduce((sum, asset) => {
        if (asset.currency && asset.currency !== 'USD') {
          const rateToUsd = getForexRateToUSD(asset.currency, livePrices?.forex);
          const usdValue = asset.value * rateToUsd;
          return sum + (usdValue * conversionRates[displayUnit]);
        }
        return sum + convertValue(asset.value);
      }, 0);
    } else {
      // For crypto/commodities, values are in USD
      total = categoryAssets.reduce((sum, asset) => sum + convertValue(asset.value), 0);
    }
    
    return { category, total, count: categoryAssets.length };
  });
}, [assetsByCategory, displayUnit, convertFromCurrency, convertValue, conversionRates, livePrices]);
```

---

## Updated Net Worth Calculation

The `totalNetWorth` in metrics needs to handle stocks with non-USD currencies:

```typescript
const totalNetWorth = assets.reduce((sum, asset) => {
  if (asset.category === 'banking' || asset.category === 'realestate') {
    // ... existing banking/realestate logic ...
  }
  
  // Handle stocks with non-USD currencies
  if (asset.category === 'stocks' && asset.currency && asset.currency !== 'USD') {
    const rateToUsd = getForexRateToUSD(asset.currency, livePrices?.forex);
    const usdValue = asset.value * rateToUsd;
    return sum + (usdValue * conversionRates[displayUnit]);
  }
  
  // Non-banking assets: convert USD value to display unit
  return sum + (asset.value * conversionRates[displayUnit]);
}, 0);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/usePortfolio.ts` | Fix categoryTotals for stocks, fix net worth calculation, remove duplicate conversion in assets useMemo |
| `src/components/AssetCategoryCard.tsx` | Show "COP" prefix instead of "$" for Colombian Peso amounts |

---

## Expected Results After Fix

**Net Worth**: ~$730,000 (instead of $61,665,725)
- Banking: ~$400,000 EUR → ~$430,000 USD
- Real Estate: COP 700M → ~$168,000 USD + €450,000 → ~$485,000 USD
- Stocks: ~$54,000 USD (AAPL) + COP ~$15,000 USD equivalent
- Crypto/Commodities: existing values

**Stocks Card**: ~$70,000 (instead of $58,974,829)
- AAPL: ~$27,000
- Davivienda: $27,000
- COP stocks: ~$15,000 combined

**Real Estate Display**:
- `COP 200,000,000` instead of `$200,000,000.00`
- `COP 500,000,000` instead of `$500,000,000.00`
