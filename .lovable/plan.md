
# Fix: Snapshot Currency Conversion, Expense Filtering, and Tooltip

## Problems Identified

### 1. COP Stocks Treated as USD in Snapshot (Total Assets: 55M EUR instead of ~2.2M EUR)
The `create-monthly-snapshot` edge function adds `asset.value` directly for all non-banking categories (line 209, 255). For stocks with `currency: "COP"`, the `value` field stores COP amounts (30,690,000 / 31,984,000 / 22,880) but they are summed as if they were USD. This inflates the stocks breakdown from ~$15K to ~$62.7M and cascades into `total_assets` and `net_worth`.

### 2. Net Cash Flow Incorrect (shows -319 EUR, should be positive)
The edge function sums ALL expenses (line 226) without filtering by date. This means:
- A January flight (1,600 EUR) and an April tax (1,100 EUR) are included in the February snapshot
- The frontend `usePortfolio` hook correctly filters one-time expenses to the current month, but the snapshot does not
- Result: snapshot expenses = 5,026 USD vs correct ~1,826 USD for February

### 3. Snapshot Tooltip Not Visible
The `SnapshotDetailView` pie chart tooltip (line 140-147) lacks explicit text color styling, same issue as the AllocationChart that was already fixed.

## Changes

### File 1: `supabase/functions/create-monthly-snapshot/index.ts`

**Stocks currency fix** (affects `totalAssets` calc ~line 201 and `assetsBreakdown` calc ~line 247):
- For stocks and realestate categories: check if `asset.currency` is non-USD
- If so, convert `asset.value` from native currency to USD using `convertToUSD`
- If USD or no currency specified, use `asset.value` as-is (already USD)

**Expenses date filtering** (affects expenses calc ~line 226):
- Only include recurring expenses and one-time expenses whose `expense_date` falls within the target snapshot month
- One-time expenses from other months are excluded

### File 2: `src/components/SnapshotDetailView.tsx`

**Tooltip styling** (~line 140):
- Add `itemStyle={{ color: '#fff' }}` for white text
- Add `labelStyle={{ color: '#9ca3af' }}` for muted labels  
- Add `wrapperStyle={{ zIndex: 50 }}` to prevent clipping

### Post-Fix Action
After deploying the updated edge function, the user should re-create the February 2026 snapshot to get corrected values. The existing snapshot contains the bad data computed by the old function.

## Technical Details

### Stocks Currency Fix (Edge Function)

Current code (line 207-209):
```
// For non-banking assets, value is already in USD
return sum + Number(asset.value || 0);
```

Updated logic:
```
// For stocks/realestate with non-USD currency, convert from native currency
if ((asset.category === 'stocks' || asset.category === 'realestate') 
    && asset.currency && asset.currency !== 'USD') {
  return sum + convertToUSD(Number(asset.value || 0), asset.currency, forexRates, btcPrice);
}
// Other assets: value is already in USD
return sum + Number(asset.value || 0);
```

Same pattern applied to the `assetsBreakdown` loop.

### Expense Date Filtering (Edge Function)

Current code (line 226-229) sums all expenses. Updated to:
```
const snapshotYearMonth = snapshotMonth.slice(0, 7); // "2026-02"
const totalExpenses = (expenses || []).reduce((sum, e) => {
  const isRecurring = e.is_recurring;
  if (!isRecurring) {
    // Skip one-time expenses not in the snapshot month
    if (!e.expense_date || !e.expense_date.startsWith(snapshotYearMonth)) {
      return sum;
    }
  }
  const currency = (e.currency || 'USD').trim().toUpperCase();
  return sum + convertToUSD(Number(e.amount || 0), currency, forexRates, btcPrice);
}, 0);
```

### Expected Corrected Values (February 2026)

After fix, approximate USD values:
- Stocks: ~$54K (AAPL $27K + Davivienda $27K + COP stocks ~$15K) instead of $62.7M
- Total Expenses: ~$1,826 (recurring + Feb one-time only) instead of $5,027
- Net Cash Flow: ~$4,648 - $1,826 = +$2,822 USD (positive, ~+2,380 EUR) instead of -$378
- Total Assets / Net Worth: ~$2.2M EUR instead of $55M EUR
