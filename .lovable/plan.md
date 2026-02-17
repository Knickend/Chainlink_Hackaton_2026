
# Fix: Tooltip Visibility and Stock Currency Conversion Bug

## Issue 1: Tooltip Not Fully Visible

The Recharts tooltip on the AllocationChart pie chart lacks explicit text color styling. On the dark theme, the default Recharts tooltip text can blend into the dark `contentStyle` background. Additionally, the tooltip may get clipped by parent container overflow.

**Fix in `src/components/AllocationChart.tsx`:**
- Add `color` and `itemStyle` to the Tooltip for explicit white text
- Add `wrapperStyle` with a high `zIndex` to prevent clipping
- Add a `labelFormatter` using the LABELS map so the tooltip shows human-readable category names instead of raw keys

## Issue 2: COP Stock Values Treated as USD ($62.75M bug)

The database stores these COP-denominated stocks for the user:
- Celsia SA Esp: value=30,690,000 COP
- PEI: value=31,984,000 COP
- Mineros (MSA): value=22,880 COP

These raw COP values are being summed as if they were USD, producing a $62.75M total instead of the correct ~$69K.

**Root cause:** The `categoryTotals` calculation in `src/hooks/usePortfolio.ts` (line 361-372) has the correct non-USD branch that should convert COP to USD, but there is a secondary issue: the `assets` useMemo (line 55-82) computes `value = quantity * livePrice` for stocks where a live price exists in `price_cache`. The prices stored in `price_cache` for Colombian stocks (CELSIA=4950, PEI=70520) are in COP, not USD, but `getLiveAssetPriceUSD` treats them as USD. This creates a mismatch: the computed value is in COP but labeled as a "USD price computation."

The net effect depends on timing -- but regardless, the conversion in `categoryTotals` should always apply. The fix ensures robustness by:

1. Adding a `price_currency` awareness to the stock price pipeline so COP prices are not confused with USD
2. Ensuring `categoryTotals` always converts non-USD stock values properly even during initial render

**Files to modify:**

### `src/hooks/usePortfolio.ts`
- In the `assets` useMemo: for stocks with `asset.currency !== 'USD'`, skip live price override (since the cached price may be in native currency, not USD). Keep the DB value and let `categoryTotals` handle conversion.
- In `categoryTotals` stocks branch: no logic change needed (the existing code is correct), but add a safety `console.warn` for debugging if values seem abnormally large before conversion.

### `src/components/AllocationChart.tsx`
- Update `Tooltip` props: add `itemStyle={{ color: '#fff' }}`, `labelStyle={{ color: '#9ca3af' }}`, and `wrapperStyle={{ zIndex: 50 }}`
- Add `labelFormatter` to map category keys to human-readable LABELS
- Add `nameKey="category"` to the Pie component for proper tooltip label resolution

---

## Technical Details

### Stock Price Currency Problem

The `price_cache` table stores stock prices without a currency indicator. Colombian stocks like CELSIA (4950 COP/share) and PEI (70,520 COP/share) are stored alongside USD stocks like AAPL ($250/share). The `getLiveAssetPriceUSD` function assumes all prices are USD, which is incorrect.

**Fix approach:** In the `assets` useMemo, when a stock has `currency` set to a non-USD value, skip the `quantity * livePrice` computation entirely. The DB `value` field already stores the correct native-currency amount. The `categoryTotals` conversion logic then handles the COP-to-USD conversion using `getForexRateToUSD`.

This is the minimal fix. A more comprehensive solution (adding `price_currency` to `price_cache`) can be done later.

### Tooltip Fix

Add explicit styling to ensure the Recharts tooltip is always readable on dark backgrounds and not clipped by parent containers.
