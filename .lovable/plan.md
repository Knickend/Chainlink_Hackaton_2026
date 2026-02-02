
# Plan: Native Currency Display for Individual Items

## Summary

Update the application so individual financial items (assets, income, expenses, debts) always display in their **native/original currency**, while only **totals and aggregates** in overview cards, snapshots, and P&L convert to the user's selected display unit.

This creates a clear separation:
- **Individual items**: Show exactly what the user entered (e.g., €1,300 mortgage payment stays €1,300)
- **Totals/Aggregates**: Convert everything to the selected display unit for portfolio-wide overview

---

## Current State Analysis

| Component | Individual Items | Totals | Needs Update |
|-----------|-----------------|--------|--------------|
| **IncomeExpenseCard** | Native currency (formatNativeValue) | Display unit | No |
| **DebtOverviewCard** | Converts to display unit | Display unit | **Yes** |
| **AssetCategoryCard** | Native for banking only | Display unit | **Yes** |
| **ViewAllAssetsDialog** | Converts to display unit | Display unit | **Yes** |
| **StatCards** | N/A | Display unit | No |
| **ProfitLossCard** | Converts to display unit | Display unit | Partial |
| **SnapshotDetailView** | N/A | Display unit | No |

---

## Implementation Changes

### Part 1: Fix DebtOverviewCard - Show Native Currency for Individual Debts

**File: `src/components/DebtOverviewCard.tsx`**

Currently, `formatDebtValue` converts individual debt amounts to the display unit. Change it to always show the native currency:

```typescript
// Replace formatDebtValue with formatNativeDebtValue
const formatNativeDebtValue = (amount: number, debtCurrency: string): string => {
  // Currency symbol mapping
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CHF: 'CHF ',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    // ... other currencies
  };
  
  const symbol = currencySymbols[debtCurrency] || '$';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
```

- Individual debt principal and monthly payment → Use `formatNativeDebtValue`
- Total Debt, Monthly, Interest/mo stats → Keep using `formatValue` (display unit)

---

### Part 2: Fix AssetCategoryCard - Show Native Currency for All Assets

**File: `src/components/AssetCategoryCard.tsx`**

Currently only banking assets show native currency. Extend to show native values for all asset types:

```typescript
// Helper to format asset value in native format
const formatNativeAssetValue = (asset: Asset): string => {
  // Banking: show original currency amount
  if (asset.category === 'banking' && asset.symbol && asset.quantity) {
    return `${getCurrencySymbol(asset.symbol)}${asset.quantity.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
  
  // Crypto/Stocks: show quantity + symbol
  if ((asset.category === 'crypto' || asset.category === 'stocks') && asset.quantity && asset.symbol) {
    return `${asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${asset.symbol}`;
  }
  
  // Commodities: show quantity + unit + symbol
  if (asset.category === 'commodities' && asset.quantity) {
    const unit = asset.unit || 'oz';
    return `${asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${unit} ${asset.symbol || ''}`;
  }
  
  // Fallback to formatted value in display unit
  return formatValue(asset.value);
};
```

- Individual asset value → Use `formatNativeAssetValue`
- Category total (in header) → Keep using `total` prop (already in display unit)

---

### Part 3: Fix ViewAllAssetsDialog - Show Native Currency in Table

**File: `src/components/ViewAllAssetsDialog.tsx`**

Add a similar native formatting helper and use it in the Value column:

```typescript
// Add formatNativeAssetValue helper (same as above)
// In the TableRow, replace:
// {formatValue(asset.value)}
// With:
// {formatNativeAssetValue(asset)}
```

Also update the Total footer to clarify it's showing the converted total:
```typescript
Total ({displayUnit}): <span className="font-mono">{formatValue(...)}</span>
```

---

### Part 4: Update ProfitLossDetailDialog - Show Native Values for Asset Details

**File: `src/components/ProfitLossDetailDialog.tsx`**

When showing individual assets with their P&L, display the asset details (quantity, symbol) in native format while keeping P&L values in display unit:

- Asset name + quantity/symbol → Native format
- Cost Basis, Current Value, P&L amounts → Display unit (these are already stored in USD)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/DebtOverviewCard.tsx` | Replace `formatDebtValue` with `formatNativeDebtValue` for individual debts; keep `formatValue` for stats row |
| `src/components/AssetCategoryCard.tsx` | Add `formatNativeAssetValue` helper; use for individual assets; keep `total` prop for category total |
| `src/components/ViewAllAssetsDialog.tsx` | Add native formatting; update Value column; clarify Total footer shows display unit |
| `src/components/ProfitLossDetailDialog.tsx` | Show asset details in native format |

---

## Visual Example

**Before (with EUR display unit selected):**
```
Debts & Liabilities
├─ Total Debt: €165,432      ← Converted (correct)
├─ Monthly: €1,185.80        ← Converted (correct)
│
├─ Home Mortgage
│   Principal: €144,300.12   ← Converted (wrong - was entered as €150,000)
│   Payment: €1,249.80/mo    ← Converted (wrong - was entered as €1,300)
```

**After:**
```
Debts & Liabilities  
├─ Total Debt: €165,432      ← Converted to display unit (correct)
├─ Monthly: €1,185.80        ← Converted to display unit (correct)
│
├─ Home Mortgage
│   Principal: €150,000.00   ← Native currency (correct)
│   Payment: €1,300.00/mo    ← Native currency (correct)
├─ Credit Card
│   Principal: $5,000.00     ← Native currency (USD)
│   Payment: $600.00/mo      ← Native currency (USD)
```

---

## Benefits

1. **Data Integrity**: Users see exactly what they entered, avoiding confusion from rounding errors
2. **Clarity**: Easy to distinguish between "my €150k mortgage" vs "portfolio-wide totals"
3. **Consistency**: Matches the existing pattern used for income/expenses
4. **User Trust**: No more "I entered €300 but it shows €298.08" confusion

---

## Technical Notes

1. **No Database Changes**: All changes are UI-only; data storage remains unchanged
2. **Backward Compatible**: Existing data continues to work; native currency info is already stored
3. **Performance**: No additional API calls needed; native currency info is already loaded
4. **P&L Consideration**: Cost basis and P&L are stored in USD, so those values should continue converting to display unit (they represent historical USD values, not native currency)
