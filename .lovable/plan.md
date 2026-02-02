
# Plan: Fix Debt Currency Conversion in useDebts Hook

## Summary

Update the `useDebts` hook to use live forex rates (like `usePortfolio` does) for consistent currency conversions when calculating debt totals and monthly payments.

## Root Cause

The `useDebts.ts` hook calculates `totalDebt`, `monthlyPayments`, and `monthlyInterest` using static `FOREX_RATES_TO_USD` rates, while the display uses live rates from `useLivePrices`. This creates inconsistent round-trip conversions.

## Solution

Refactor `useDebts` to accept optional live forex rates and use them for all calculations, falling back to static rates when unavailable.

## Implementation

### Step 1: Update useDebts Hook Signature

Modify `useDebts()` to accept optional `liveForexRates` parameter.

**File: `src/hooks/useDebts.ts`**

```typescript
export function useDebts(liveForexRates?: Record<string, number>) {
  // ... existing state ...

  // Calculate totals using live rates when available
  const totalDebt = useMemo(() => {
    return debts.reduce((sum, d) => {
      const currency = (d.currency || 'USD').trim().toUpperCase();
      
      // Use live rate if available (API returns USD→Currency, we need Currency→USD)
      if (liveForexRates?.[currency] && liveForexRates[currency] > 0) {
        return sum + (d.principal_amount * (1 / liveForexRates[currency]));
      }
      
      // Fallback to static rates
      const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
      return sum + (d.principal_amount * rate);
    }, 0);
  }, [debts, liveForexRates]);
  
  // Apply same pattern to monthlyPayments and monthlyInterest
}
```

### Step 2: Pass Live Rates from Index.tsx

Update the call site in `Index.tsx` to pass live forex rates to `useDebts`.

**File: `src/pages/Index.tsx`**

```typescript
// After useLivePrices hook
const { prices, ... } = useLivePrices(...);

// Pass live forex rates to useDebts
const { debts, totalDebt, monthlyPayments, monthlyInterest, ... } = useDebts(prices.forex);
```

### Step 3: Wrap Calculations in useMemo

Convert the direct calculations to `useMemo` hooks that re-compute when `liveForexRates` changes.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useDebts.ts` | Accept `liveForexRates` param, use live rates in all calculations |
| `src/pages/Index.tsx` | Pass `prices.forex` to `useDebts()` |

## Expected Result

After this fix:
- Debt monthly payments will convert using the same live rates as the display formatter
- €1,300 will correctly round-trip: €1,300 → USD → €1,300
- The "Monthly" value in the Total Debt card will match the sum of individual debt payments

## Technical Notes

1. The hook will continue to work without live rates (graceful degradation to static rates)
2. This matches the pattern already used in `usePortfolio.ts` for income/expense calculations
3. The `useMemo` wrapper ensures calculations only re-run when debts or forex rates change
