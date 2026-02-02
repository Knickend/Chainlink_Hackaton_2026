

# Plan: Complete Net Cash Flow Calculation Fix

## Summary of All Changes

This plan addresses the three issues from the previous discussion plus the new requirement to include debt payments:

1. **Monthly Income UI Enhancement**: Display total income with recurring/one-time breakdown
2. **SATS Conversion Bug Fix**: Normalize currency strings to prevent 1:1 SATS-to-USD conversion
3. **Net Cash Flow Formula Update**: Include debt payments in the calculation

**Corrected Formula:**
```
Net Cash Flow = Monthly Income (recurring + non-recurring) - Monthly Expenses (recurring + non-recurring) - Monthly Debt Payments
```

---

## Current State Analysis

### usePortfolio.ts (lines 114-119)
```typescript
// Debt metrics will be passed from useDebts hook when integrated
const totalDebt = 0;           // ← Hardcoded!
const monthlyDebtPayments = 0; // ← Hardcoded!
const monthlyInterestExpense = 0;

const monthlyNetIncome = totalIncome - totalExpenses - monthlyDebtPayments;
```

The hook has placeholders for debt values but never receives actual debt data.

### Index.tsx (line 183)
```typescript
const adjustedMonthlyNet = metrics.totalIncome - metrics.totalExpenses - demoMonthlyPayments;
```

This works correctly because it uses `demoMonthlyPayments` from `useDebts()`, but the `metrics.monthlyNetIncome` from the hook is incorrect.

---

## Implementation Changes

### File 1: `src/lib/types.ts`

**Add new fields to PortfolioMetrics interface:**

```typescript
export interface PortfolioMetrics {
  totalNetWorth: number;
  totalIncome: number;
  totalExpenses: number;
  totalDebt: number;
  monthlyDebtPayments: number;
  monthlyInterestExpense: number;
  monthlyNetIncome: number;
  yearlyYield: number;
  // NEW: Breakdown fields for UI display
  recurringIncome: number;
  oneTimeIncome: number;
  recurringExpenses: number;
  oneTimeExpenses: number;
}
```

---

### File 2: `src/hooks/usePortfolio.ts`

**Changes:**

1. **Normalize currency strings** to fix SATS bug (lines 95-106, 108-112)
2. **Calculate separate recurring/one-time totals** for income and expenses
3. **Accept debt data as parameter** to include in metrics

**Updated hook signature:**
```typescript
export function usePortfolio(
  livePrices?: LivePrices, 
  isDemo = false,
  debtData?: { monthlyPayments: number; monthlyInterest: number }
)
```

**Updated metrics calculation:**
```typescript
// Normalize currency and calculate income with breakdown
const recurringIncome = income
  .filter(inc => inc.is_recurring)
  .reduce((sum, inc) => {
    const currency = (inc.currency || 'USD').trim().toUpperCase();
    if (currency === 'BTC' || currency === 'SATS') {
      return sum + convertBtcToUSD(inc.amount, currency as BitcoinCurrency, btcPrice);
    }
    const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
    return sum + (inc.amount * rate);
  }, 0);

const oneTimeIncome = income
  .filter(inc => !inc.is_recurring)
  .reduce((sum, inc) => {
    const currency = (inc.currency || 'USD').trim().toUpperCase();
    if (currency === 'BTC' || currency === 'SATS') {
      return sum + convertBtcToUSD(inc.amount, currency as BitcoinCurrency, btcPrice);
    }
    const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
    return sum + (inc.amount * rate);
  }, 0);

const totalIncome = recurringIncome + oneTimeIncome;

// Same pattern for expenses
const recurringExpenses = expenses
  .filter(exp => exp.is_recurring)
  .reduce((sum, exp) => {
    const currency = (exp.currency || 'USD').trim().toUpperCase();
    const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
    return sum + (exp.amount * rate);
  }, 0);

const oneTimeExpenses = expenses
  .filter(exp => !exp.is_recurring)
  .reduce((sum, exp) => {
    const currency = (exp.currency || 'USD').trim().toUpperCase();
    const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
    return sum + (exp.amount * rate);
  }, 0);

const totalExpenses = recurringExpenses + oneTimeExpenses;

// Use passed debt data
const monthlyDebtPayments = debtData?.monthlyPayments || 0;
const monthlyInterestExpense = debtData?.monthlyInterest || 0;

// Correct formula with debt payments
const monthlyNetIncome = totalIncome - totalExpenses - monthlyDebtPayments;

return {
  // ... existing fields
  recurringIncome,
  oneTimeIncome,
  recurringExpenses,
  oneTimeExpenses,
};
```

---

### File 3: `src/pages/Index.tsx`

**Changes:**

1. **Pass debt data to usePortfolio** (line ~152)
2. **Update Monthly Income StatCard** to show breakdown (lines 320-328)

**Pass debt data:**
```typescript
const {
  // ... existing destructuring
} = usePortfolio(prices, isDemo, { 
  monthlyPayments: demoMonthlyPayments, 
  monthlyInterest: demoMonthlyInterest 
});
```

**Update StatCard subtitle:**
```typescript
<StatCard
  title="Monthly Income"
  value={formatValue(metrics.totalIncome)}
  subtitle={`Recurring: ${formatValue(metrics.recurringIncome)} | One-time: ${formatValue(metrics.oneTimeIncome)}`}
  icon={TrendingUp}
  trend={isDemo ? undefined : metricTrends?.totalIncome || undefined}
  variant="success"
  delay={0.1}
/>
```

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `recurringIncome`, `oneTimeIncome`, `recurringExpenses`, `oneTimeExpenses` to PortfolioMetrics |
| `src/hooks/usePortfolio.ts` | 1. Normalize currency with `.trim().toUpperCase()`<br>2. Calculate recurring/one-time breakdowns<br>3. Accept `debtData` parameter<br>4. Use debt payments in net income formula |
| `src/pages/Index.tsx` | 1. Pass debt data to usePortfolio<br>2. Update Monthly Income StatCard subtitle |

---

## Expected Results

### Before Fix (Current Bug)
- 250,000 SATS × 1 = **$250,000** (wrong!)
- Debt payments not factored into metrics calculation

### After Fix
- 250,000 SATS ÷ 100,000,000 × $96,000 = **~$240** (correct)
- Debt payments properly subtracted from net income

### UI Display
**Monthly Income Card:**
```
$7,898.00
Recurring: $7,574.00 | One-time: $324.00
```

### Net Cash Flow Calculation
```
Net Cash Flow = $7,898 (total income) 
              - $5,200 (total expenses) 
              - $850 (debt payments)
              = $1,848
```

