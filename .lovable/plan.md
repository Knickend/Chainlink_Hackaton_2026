
# Plan: Fix Banking Asset Display to Use Native Currency

## The Problem

You entered €100,000 in a EUR banking asset, and the display unit is EUR. The category total shows €91,215.72 instead of €100,000.

**Current Flow:**
1. Save: €100,000 × 1.08 (static rate) = 108,000 USD stored as `value`
2. Display: 108,000 USD × 0.84459 (live rate) = €91,216 displayed

**Expected Flow:**
When display unit = asset currency, show the original amount directly (€100,000)

---

## Solution

Modify `categoryTotals` calculation in `usePortfolio.ts` to:
1. For banking assets: sum amounts in their native currencies and convert to display unit
2. Use `quantity` (native amount) instead of `value` (USD equivalent) for same-currency assets

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePortfolio.ts` | Smart category total calculation for banking assets |
| `src/pages/Index.tsx` | Pass raw category totals and format appropriately |

---

## Technical Implementation

### 1. usePortfolio.ts - New Category Total Calculation

**Current code (line 197-203):**
```typescript
const categoryTotals = useMemo(() => {
  return Object.entries(assetsByCategory).map(([category, categoryAssets]) => ({
    category,
    total: categoryAssets.reduce((sum, asset) => sum + asset.value, 0),  // Always USD
    count: categoryAssets.length,
  }));
}, [assetsByCategory]);
```

**Fixed approach:**

For banking assets, we need a smarter calculation:
- If asset currency = display unit → use `quantity` (native amount) directly
- If asset currency ≠ display unit → convert `quantity` from asset currency to display unit

```typescript
const categoryTotals = useMemo(() => {
  return Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
    let total: number;
    
    if (category === 'banking') {
      // For banking, sum assets using their native currency amounts
      // and convert to display unit properly
      total = categoryAssets.reduce((sum, asset) => {
        const assetCurrency = asset.symbol || 'USD';
        const nativeAmount = asset.quantity ?? asset.value;
        
        // If asset currency matches display unit, use native amount
        if (assetCurrency === displayUnit) {
          return sum + nativeAmount;
        }
        
        // Otherwise convert from native currency to display unit
        return sum + convertFromCurrency(nativeAmount, assetCurrency);
      }, 0);
    } else {
      // For non-banking, values are already in USD
      // Convert to display unit
      total = categoryAssets.reduce((sum, asset) => sum + convertValue(asset.value), 0);
    }
    
    return { category, total, count: categoryAssets.length };
  });
}, [assetsByCategory, displayUnit, convertFromCurrency, convertValue]);
```

### 2. Index.tsx - Update Category Card Usage

**Current (formats USD total):**
```typescript
total={formatValue(cat.total)}
```

**Fixed (total is already in display unit):**
```typescript
// categoryTotals now returns values in display unit
total={formatDisplayUnitValue(cat.total)}
```

Add a simple formatter that doesn't convert (value is already in display unit):
```typescript
const formatDisplayUnitValue = (value: number): string => {
  const symbol = UNIT_SYMBOLS[displayUnit];
  
  if (displayUnit === 'GOLD') {
    return `${value.toFixed(4)} ${symbol}`;
  }
  
  if (displayUnit === 'BTC') {
    return `${symbol}${value.toFixed(6)}`;
  }
  
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
```

---

## Expected Result

| Asset | Before | After |
|-------|--------|-------|
| Rabobank €100,000 (display: EUR) | €91,215.72 | €100,000.00 |
| Saving €10,000 (display: EUR) | €9,121.57 | €10,000.00 |
| Real estate $150,000 (display: EUR) | $150,000 → €126,689 | $150,000 → ~€126,689 (correctly converted) |

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| EUR asset, EUR display | Shows native EUR amount (no conversion) |
| EUR asset, USD display | Converts EUR → USD using live rates |
| USD asset, EUR display | Converts USD → EUR using live rates |
| Multiple currencies in category | Each converted properly, then summed |

---

## Also Affected: Total Net Worth

The same fix applies to `metrics.totalNetWorth`:
- Banking assets should contribute their native amounts converted to display unit
- This ensures the stat card also shows €110,000 instead of €100,337

---

## Summary

The fix ensures that when you enter €100,000 and display in EUR, you see €100,000. No unnecessary round-trip conversion through USD that causes rate mismatches.
