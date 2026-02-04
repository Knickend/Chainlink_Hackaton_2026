
## Fix Annual Yield Currency Conversion Bug

This plan addresses the currency conversion bug in the Annual Yield calculation where COP-denominated assets are incorrectly inflating the yield total.

---

## Root Cause Analysis

Looking at the database data, the issue is clear:

**Example - PEI (Colombian stock):**
- `currency`: "COP"
- `value`: 31,984,000 (stored in COP, NOT USD)
- `yield`: 4%

**Current (wrong) calculation:**
`31,984,000 × 4% = 1,279,360` → treated as €956,127 EUR

**Correct calculation:**
`31,984,000 COP × 0.00024 = $7,676 USD × 4% = ~$307/year`

The bug exists in TWO places:
1. `usePortfolio.ts` line 208-213 - `yearlyYield` calculation in metrics
2. `YieldBreakdownCard.tsx` line 32 - `yieldAmount` calculation for breakdown display

---

## Changes Required

### 1. Fix yearlyYield Calculation in usePortfolio.ts

**File:** `src/hooks/usePortfolio.ts`

**Current code (lines 208-213):**
```typescript
const yearlyYield = assets.reduce((sum, asset) => {
  if (asset.yield) {
    return sum + (asset.value * (asset.yield / 100));
  }
  return sum;
}, 0);
```

**Updated code:**
```typescript
const yearlyYield = assets.reduce((sum, asset) => {
  if (!asset.yield) return sum;
  
  let assetValueInDisplayUnit: number;
  
  // Banking/Real Estate: use native currency amount and convert
  if (asset.category === 'banking' || asset.category === 'realestate') {
    const assetCurrency = (asset.symbol || 'USD').trim().toUpperCase();
    const nativeAmount = asset.quantity ?? asset.value;
    
    if (assetCurrency === displayUnit) {
      assetValueInDisplayUnit = nativeAmount;
    } else {
      // Convert from native currency to display unit
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
        assetValueInDisplayUnit = amountInUSD * liveToRate;
      } else {
        assetValueInDisplayUnit = amountInUSD * conversionRates[displayUnit];
      }
    }
  }
  // Stocks with non-USD currencies: convert from native to display unit
  else if (asset.category === 'stocks' && asset.currency && asset.currency !== 'USD') {
    const rateToUsd = getForexRateToUSD(asset.currency, livePrices?.forex);
    const usdValue = asset.value * rateToUsd;
    assetValueInDisplayUnit = usdValue * conversionRates[displayUnit];
  }
  // Other assets (crypto, commodities, USD stocks): value is in USD
  else {
    assetValueInDisplayUnit = asset.value * conversionRates[displayUnit];
  }
  
  return sum + (assetValueInDisplayUnit * (asset.yield / 100));
}, 0);
```

---

### 2. Fix YieldBreakdownCard Component

**File:** `src/components/YieldBreakdownCard.tsx`

The component needs additional props to handle currency conversion, and must apply the same logic for individual asset yield amounts.

**Changes needed:**

1. Add new props for live prices, display unit, and conversion rates
2. Update the `yieldBreakdown` calculation to convert values properly

**Updated interface:**
```typescript
interface YieldBreakdownCardProps {
  totalYield: number;
  assets: Asset[];
  formatValue: (value: number) => string;
  livePrices?: { forex?: Record<string, number> };
  displayUnit: DisplayUnit;
  conversionRates: Record<DisplayUnit, number>;
  delay?: number;
}
```

**Updated yieldBreakdown calculation:**
```typescript
const yieldBreakdown = yieldingAssets.map((asset) => {
  let assetValueInDisplayUnit: number;
  
  // Apply same currency conversion logic as usePortfolio
  if (asset.category === 'banking' || asset.category === 'realestate') {
    const assetCurrency = (asset.symbol || 'USD').trim().toUpperCase();
    const nativeAmount = asset.quantity ?? asset.value;
    
    if (assetCurrency === displayUnit) {
      assetValueInDisplayUnit = nativeAmount;
    } else {
      const rateToUsd = getForexRateToUSD(assetCurrency, livePrices?.forex);
      const amountInUSD = nativeAmount * rateToUsd;
      assetValueInDisplayUnit = amountInUSD * conversionRates[displayUnit];
    }
  } else if (asset.category === 'stocks' && asset.currency && asset.currency !== 'USD') {
    const rateToUsd = getForexRateToUSD(asset.currency, livePrices?.forex);
    const usdValue = asset.value * rateToUsd;
    assetValueInDisplayUnit = usdValue * conversionRates[displayUnit];
  } else {
    assetValueInDisplayUnit = asset.value * conversionRates[displayUnit];
  }
  
  return {
    name: asset.name,
    symbol: asset.symbol,
    category: asset.category,
    yieldPercent: asset.yield!,
    yieldAmount: assetValueInDisplayUnit * (asset.yield! / 100),
    assetValue: assetValueInDisplayUnit,
  };
});
```

---

### 3. Update Index.tsx to Pass New Props

**File:** `src/pages/Index.tsx`

Update the `YieldBreakdownCard` usage to pass the required props:

```typescript
<YieldBreakdownCard
  totalYield={metrics.yearlyYield}
  assets={assets}
  formatValue={formatValue}
  formatDisplayUnitValue={formatDisplayUnitValue}
  livePrices={livePrices}
  displayUnit={displayUnit}
  conversionRates={conversionRates}
  delay={0.3}
/>
```

Note: The `totalYield` from metrics is already in display units (after the usePortfolio fix), so we should use `formatDisplayUnitValue` instead of `formatValue` for the total.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/usePortfolio.ts` | Fix `yearlyYield` calculation to handle banking/realestate native currencies and non-USD stock currencies |
| `src/components/YieldBreakdownCard.tsx` | Add props for currency conversion, update yieldBreakdown to convert values properly |
| `src/pages/Index.tsx` | Pass additional props (livePrices, displayUnit, conversionRates) to YieldBreakdownCard |

---

## Expected Results After Fix

**PEI (Colombian stock):**
- Value: COP 31,984,000 × 0.00024 = ~$7,676 USD
- Yield: $7,676 × 4% = ~$307/year → ~€285/year

**Apto Bogota (Real estate):**
- Native: COP 500,000,000 × 0.00024 = ~$120,000 USD
- Yield: $120,000 × 4.5% = ~$5,400/year → ~€5,000/year

**Total Annual Yield:**
- Current: €981,537 (incorrect - COP treated as EUR)
- Expected: ~€15,000-20,000 (correct - all currencies properly converted)
