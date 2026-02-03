
# Plan: Fix Asset Price Display Issues

## Problems Identified

### Issue 1: Polygon (POL) Missing Price
**Root Cause:** The `fetchAdditionalCryptoPrices` function in `useLivePrices.ts` stores additional crypto prices in the `stocks` map (line 136: `updatedStocks[symbol.toUpperCase()]`), but `getUnitPrice` in `AssetCategoryCard.tsx` looks in `livePrices.crypto?.[sym]` for crypto assets.

### Issue 2: Apple (AAPL) Missing Price
**Root Cause:** The `showPriceDetails` flag only includes `crypto` and `commodities` categories (line 85), excluding `stocks` from the two-line price display layout.

### Issue 3: Prices Show EUR Symbol but USD Values
**Root Cause:** The code calls `formatDisplayUnitValue(unitPrice)` where `unitPrice` is the raw USD price from the API. The `formatDisplayUnitValue` function only formats (adds currency symbol) but doesn't convert USD to the display unit.

---

## Solution

### File 1: `src/hooks/useLivePrices.ts`

**Change:** Store additional crypto prices in the `crypto` map instead of `stocks` map.

```typescript
// Line 131-143: Change from stocks to crypto
setPrices((prev) => {
  const updatedCrypto = { ...prev.crypto };  // Changed from prev.stocks
  for (const [symbol, priceData] of Object.entries(data.data)) {
    const pd = priceData as { price: number; change: number; changePercent: number };
    updatedCrypto[symbol.toUpperCase()] = {  // Changed from updatedStocks
      price: pd.price,
      change: pd.change,
      changePercent: pd.changePercent,
    };
  }
  return { ...prev, crypto: updatedCrypto };  // Changed from stocks
});
```

### File 2: `src/components/AssetCategoryCard.tsx`

**Changes:**

1. **Include stocks in the two-line layout** (line 85):
```typescript
const showPriceDetails = (category === 'crypto' || category === 'commodities' || category === 'stocks') && formatDisplayUnitValue;
```

2. **Update `formatQuantityDisplay` to handle stocks** (add case for stocks):
```typescript
if (category === 'stocks' && asset.quantity && asset.symbol) {
  return `${asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${asset.symbol}`;
}
```

3. **Convert USD prices to display unit** - Pass `conversionRates` prop and use it:
   - Add new prop: `conversionRates?: Record<string, number>`
   - Update `formatUnitPriceDisplay` to convert USD price to display unit:
```typescript
const formatUnitPriceDisplay = (): string | null => {
  if (!unitPrice || !formatDisplayUnitValue || !conversionRates || !displayUnit) return null;
  
  // Convert USD price to display unit
  const convertedPrice = unitPrice * (conversionRates[displayUnit] || 1);
  
  if (category === 'commodities') {
    return `${formatDisplayUnitValue(convertedPrice, true)}/oz`;
  }
  return formatDisplayUnitValue(convertedPrice, true);
};
```

4. **Convert total value to display unit** for the right side total:
```typescript
// The asset.value is in USD, needs conversion to display unit
const displayValue = asset.value * (conversionRates?.[displayUnit || 'USD'] || 1);
<span className="font-mono font-medium text-foreground">
  {formatDisplayUnitValue(displayValue, true)}
</span>
```

### File 3: `src/pages/Index.tsx`

**Change:** Pass `conversionRates` to `AssetCategoryCard`:
```typescript
<AssetCategoryCard
  ...
  conversionRates={conversionRates}  // Add this prop
/>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useLivePrices.ts` | Store additional crypto in `crypto` map, not `stocks` |
| `src/components/AssetCategoryCard.tsx` | Include stocks in price display, add conversion for prices |
| `src/pages/Index.tsx` | Pass `conversionRates` prop to asset cards |

## Expected Results After Fix
- Polygon will show: `71,781 POL × €X.XX = €7,985.06`
- Apple will show: `100 AAPL × €XXX.XX = €22,836.31`  
- All prices will be properly converted from USD to EUR
