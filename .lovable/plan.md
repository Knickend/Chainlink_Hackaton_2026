
## Add Colombian Peso (COP) Support

This plan adds the Colombian Peso to all currency selectors and exchange rate systems throughout the application.

---

## Changes Overview

Adding COP requires updates in **5 files** across 3 layers: types, frontend, and backend edge functions.

---

## 1. Frontend Type Definitions

**File:** `src/lib/types.ts`

| Line | Change |
|------|--------|
| 5 | Add `'COP'` to `BankingCurrency` type union |
| 35-36 | Add COP entry to `BANKING_CURRENCIES` array |
| 60 | Add COP fallback rate to `FOREX_RATES_TO_USD` |

**Currency Details:**
- Code: `COP`
- Label: `Colombian Peso`
- Symbol: `$` (shared with USD/MXN)
- Fallback rate: `~0.00024` (1 COP = ~$0.00024 USD, based on ~4,200 COP/USD)

---

## 2. Backend Edge Function - Forex Fetcher

**File:** `supabase/functions/fetch-forex-rates/index.ts`

| Line | Change |
|------|--------|
| 15-17 | Add `'COP'` to `SUPPORTED_CURRENCIES` array |

This enables the Frankfurter API call to fetch live COP rates, which are then cached in `price_cache` and displayed in the Exchange Rates dialog.

---

## 3. Backend Edge Functions - Snapshot Fallbacks

**File:** `supabase/functions/create-monthly-snapshot/index.ts`

| Line | Change |
|------|--------|
| 37-38 | Add `COP: 0.00024` to `FOREX_RATES_TO_USD` fallback map |

**File:** `supabase/functions/create-bulk-snapshots/index.ts`

| Line | Change |
|------|--------|
| 42-43 | Add `COP: 0.00024` to `FOREX_RATES_TO_USD` fallback map |

These fallback rates ensure historical snapshots calculate correctly even if live rates are unavailable.

---

## Automatic UI Updates

Once COP is added to `BANKING_CURRENCIES`, it will automatically appear in these selectors:
- Add/Edit Asset dialogs (banking/real estate)
- Add Income dialog
- Add Expense dialog
- Add Debt dialog
- Add Goal dialog
- Fund Flow selector (buy/sell transactions)
- Exchange Rates dialog (forex tab)

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | Add COP to type, currency list, and fallback rates |
| `supabase/functions/fetch-forex-rates/index.ts` | Fetch live COP rates from API |
| `supabase/functions/create-monthly-snapshot/index.ts` | Fallback rate for monthly snapshots |
| `supabase/functions/create-bulk-snapshots/index.ts` | Fallback rate for bulk snapshots |
