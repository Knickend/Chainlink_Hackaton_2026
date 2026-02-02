
# Plan: Fix Net Cash Flow Inflation and Currency Conversion Bugs

## Summary

This plan addresses two connected issues:

1. **Inflated Net Cash Flow in Snapshots**: The Edge Functions sum income/expense/debt amounts in their native currencies (e.g., 250,000 SATS, €2,300) without converting to USD first, causing massive inflation
2. **Display Unit Conversion Bug**: When switching display units (e.g., to EUR), values like €300 show as €298.08 due to inconsistent conversion paths using different forex rates

Additionally, as requested, we'll store monthly debt payments in snapshots for accurate historical Net Cash Flow tracking.

---

## Root Cause Analysis

### Issue 1: Snapshot Inflation
**Location**: `supabase/functions/create-monthly-snapshot/index.ts` (lines 125-133) and `create-bulk-snapshots/index.ts` (lines 147-155)

**Problem**: The snapshot generators do raw summation without currency conversion:
```typescript
// BROKEN: Sums 250,000 SATS as $250,000 USD
const totalIncome = income.reduce((sum, i) => sum + Number(i.amount || 0), 0);
```

**Impact**: A user with €2,300 + 250,000 SATS income gets snapshot income of ~$252,300 instead of ~$7,800

### Issue 2: Conversion Discrepancy (€300 → €298.08)
**Root Cause**: The conversion chain uses different forex rates at different steps:

1. `metrics.totalIncome` uses static `FOREX_RATES_TO_USD` (EUR: 1.08) to convert to USD
2. `formatValue()` uses `calculateConversionRates()` which has hardcoded EUR: 0.92 for USD→EUR
3. Round-trip: €300 × 1.08 (to USD) × 0.92 (back to EUR) = €298.08

**Fix**: Use consistent live forex rates throughout the entire conversion chain

---

## Implementation Changes

### Part 1: Database Schema Update

Add a new column to `portfolio_snapshots` to store monthly debt payments:

```sql
ALTER TABLE public.portfolio_snapshots 
ADD COLUMN IF NOT EXISTS monthly_debt_payments numeric DEFAULT 0 NOT NULL;
```

This enables accurate historical Net Cash Flow: `total_income - total_expenses - monthly_debt_payments`

---

### Part 2: Fix Edge Functions (Currency Normalization)

Both snapshot Edge Functions need to convert all amounts to USD before summing.

**File: `supabase/functions/create-monthly-snapshot/index.ts`**

Add forex rate constants and conversion helpers:
```typescript
// Static forex rates (fallback)
const FOREX_RATES_TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, CHF: 1.13, JPY: 0.0064,
  CAD: 0.74, AUD: 0.65, CNY: 0.14, INR: 0.012, SGD: 0.74,
  HKD: 0.13, NZD: 0.60, SEK: 0.095, NOK: 0.093, DKK: 0.145,
  ZAR: 0.055, BRL: 0.20, MXN: 0.058, KRW: 0.00073, THB: 0.029,
};

// Get live forex rates from cache
async function getLiveForexRates(supabase: any): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('price_cache')
    .select('symbol, price')
    .eq('asset_type', 'forex');
  
  const rates: Record<string, number> = { USD: 1 };
  if (data) {
    for (const row of data) {
      // price_cache stores USD→Currency rate, we need Currency→USD
      rates[row.symbol] = 1 / Number(row.price);
    }
  }
  return rates;
}

// Convert any currency to USD
function convertToUSD(
  amount: number, 
  currency: string, 
  forexRates: Record<string, number>,
  btcPrice: number
): number {
  const curr = (currency || 'USD').trim().toUpperCase();
  
  // Handle Bitcoin currencies
  if (curr === 'SATS') {
    return (amount / 100_000_000) * btcPrice;
  }
  if (curr === 'BTC') {
    return amount * btcPrice;
  }
  
  // Handle fiat - prioritize live rates, fallback to static
  const rate = forexRates[curr] || FOREX_RATES_TO_USD[curr] || 1;
  return amount * rate;
}
```

Update the calculation logic to use proper conversion:
```typescript
// Fetch live forex rates and BTC price
const forexRates = await getLiveForexRates(serviceClient);
const { data: btcCache } = await serviceClient
  .from('price_cache')
  .select('price')
  .eq('symbol', 'BTC')
  .single();
const btcPrice = btcCache?.price ? Number(btcCache.price) : 96000;

// Calculate totals with proper currency conversion
const totalIncome = (income || []).reduce((sum, i) => {
  const currency = (i.currency || 'USD').trim().toUpperCase();
  return sum + convertToUSD(Number(i.amount || 0), currency, forexRates, btcPrice);
}, 0);

// Include ALL expenses (recurring + non-recurring) per new formula
const totalExpenses = (expenses || []).reduce((sum, e) => {
  const currency = (e.currency || 'USD').trim().toUpperCase();
  return sum + convertToUSD(Number(e.amount || 0), currency, forexRates, btcPrice);
}, 0);

// Calculate debt metrics with proper conversion
const totalDebt = (debts || []).reduce((sum, d) => {
  const currency = (d.currency || 'USD').trim().toUpperCase();
  return sum + convertToUSD(Number(d.principal_amount || 0), currency, forexRates, btcPrice);
}, 0);

const monthlyDebtPayments = (debts || []).reduce((sum, d) => {
  if (!d.monthly_payment) return sum;
  const currency = (d.currency || 'USD').trim().toUpperCase();
  return sum + convertToUSD(Number(d.monthly_payment), currency, forexRates, btcPrice);
}, 0);
```

**File: `supabase/functions/create-bulk-snapshots/index.ts`**

Apply the same conversion logic changes as above.

---

### Part 3: Update SnapshotDetailView to Use Stored Debt Payments

**File: `src/components/SnapshotDetailView.tsx`**

Update the net cash flow calculation to use the stored debt payments:
```typescript
// Use stored monthly_debt_payments if available, otherwise 0
const storedDebtPayments = (snapshot as any).monthly_debt_payments || 0;
const netCashFlow = snapshot.total_income - snapshot.total_expenses - storedDebtPayments;
```

---

### Part 4: Fix Frontend Forex Rate Consistency

The core issue is that `calculateConversionRates()` uses hardcoded EUR/GBP rates while `metrics` calculation uses different static rates.

**File: `src/lib/types.ts`**

Update `calculateConversionRates` to accept live forex rates:
```typescript
export function calculateConversionRates(
  btcPrice: number, 
  goldPrice: number,
  liveForexRates?: Record<string, number>
): Record<DisplayUnit, number> {
  // For EUR: API returns USD→EUR rate (e.g., 0.84459 means 1 USD = 0.84459 EUR)
  // So to convert FROM USD to EUR, we multiply by this rate
  const eurRate = liveForexRates?.EUR ?? 0.92;
  const gbpRate = liveForexRates?.GBP ?? 0.79;
  
  return {
    USD: 1,
    BTC: 1 / btcPrice,
    GOLD: 1 / goldPrice,
    EUR: eurRate,
    GBP: gbpRate,
  };
}
```

**File: `src/hooks/usePortfolio.ts`**

Pass live forex rates to `calculateConversionRates`:
```typescript
const conversionRates = useMemo(() => {
  if (livePrices) {
    return calculateConversionRates(livePrices.btc, livePrices.gold, livePrices.forex);
  }
  return DEFAULT_CONVERSION_RATES;
}, [livePrices]);
```

Also update the income/expense USD conversion to use live forex rates when available:
```typescript
// Inside metrics calculation
const convertIncomeToUSD = (inc: typeof income[0]): number => {
  const currency = (inc.currency || 'USD').trim().toUpperCase();
  
  if (currency === 'BTC' || currency === 'SATS') {
    return convertBtcToUSD(inc.amount, currency as BitcoinCurrency, btcPrice);
  }
  
  // Use live forex rate if available, otherwise static
  const liveRate = livePrices?.forex?.[currency];
  if (liveRate && liveRate > 0) {
    // API returns USD→Currency, we need Currency→USD
    return inc.amount * (1 / liveRate);
  }
  
  const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
  return inc.amount * rate;
};
```

Apply the same pattern to `convertExpenseToUSD`.

---

### Part 5: Update PortfolioSnapshot Type

**File: `src/hooks/usePortfolioHistory.ts`**

Add the new field to the interface:
```typescript
export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_month: string;
  net_worth: number;
  total_assets: number;
  total_debt: number;
  total_income: number;
  total_expenses: number;
  monthly_debt_payments: number;  // NEW
  assets_breakdown: AssetsBreakdown;
  created_at: string;
}
```

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| Database Migration | Add `monthly_debt_payments` column to `portfolio_snapshots` |
| `supabase/functions/create-monthly-snapshot/index.ts` | Add currency conversion helpers, fetch live forex/BTC prices, convert all amounts to USD before summing, store debt payments |
| `supabase/functions/create-bulk-snapshots/index.ts` | Same changes as above |
| `src/lib/types.ts` | Update `calculateConversionRates` signature to accept live forex rates |
| `src/hooks/usePortfolio.ts` | Pass live forex to conversion rates, use live forex in metrics calculation |
| `src/hooks/usePortfolioHistory.ts` | Add `monthly_debt_payments` to PortfolioSnapshot interface |
| `src/components/SnapshotDetailView.tsx` | Include stored debt payments in net cash flow display |

---

## Expected Results After Fix

### Snapshot Values (Currently Broken)
- **Before**: Monthly Income = $253,200 (250,000 SATS counted as $250,000)
- **After**: Monthly Income = ~$7,800 (250,000 SATS correctly converted at ~$240)

### Currency Display (€300 Example)
- **Before**: €300 → USD: $324 → EUR: €298.08 (inconsistent rates)
- **After**: €300 → USD: $355.16 → EUR: €300.00 (consistent live rates)

### Net Cash Flow Formula
```
Net Cash Flow = Total Income (all) - Total Expenses (all) - Monthly Debt Payments
```
This formula is now consistent across:
- Live dashboard (`Index.tsx`)
- Historical snapshots (Edge Functions)
- Snapshot detail view (`SnapshotDetailView.tsx`)

---

## Technical Notes

1. **Backwards Compatibility**: Existing snapshots without `monthly_debt_payments` will default to 0, which matches the previous calculation behavior
2. **Demo Mode**: Mock data in demo mode doesn't require forex conversion as it's already in USD
3. **Edge Function Testing**: After deploying, take a new snapshot to verify the values are correct
4. **Rate Source Priority**: Live forex rates from `price_cache` take priority, with static fallback rates as safety net
