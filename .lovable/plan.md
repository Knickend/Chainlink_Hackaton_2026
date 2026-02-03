
# Plan: Enhanced Profit & Loss Hub with Period Filtering and Asset Detail Modal

## Overview

This plan redesigns the Profit & Loss Details dialog into a comprehensive P&L hub with period-based filtering, improved layout matching the reference screenshots, and a dedicated Asset Detail modal with tabbed transaction history.

## Current State

- Single dialog showing all-time P&L data
- Simple collapsible asset rows with inline transaction lists
- No period filtering
- No separation between "Open" and "Closed" positions in period context

## Target State

1. **Period Selector** at the top (This Month, Last Month, YTD, 1Y, All, Custom date picker)
2. **Dynamic P&L recalculation** based on selected period
3. **Open Positions section** showing current holdings with unrealized + period-realized P&L
4. **Closed This Period section** showing positions closed within the selected period
5. **Asset Detail Modal** with Overview, Transactions (filterable), and Lots/Tax tabs

---

## Implementation

### Phase 1: Period Selector Component

**New File: `src/components/PnLPeriodSelector.tsx`**

A compact period selector with preset buttons and custom date range picker:
- Presets: "This Month", "Last Month", "YTD", "1Y", "All"
- Custom: Opens date range picker (reuse existing `DateRangePicker` pattern)
- Returns `{ startDate: Date | null, endDate: Date | null, label: string }`

```
[This Month] [Last Month] [YTD] [1Y] [All] [📅 Custom]
```

### Phase 2: Enhanced P&L Hook with Period Filtering

**Update: `src/hooks/useProfitLoss.ts`**

Add new hook or extend existing:
- Accept optional `periodStart` and `periodEnd` date parameters
- **Unrealized**: Always based on current holdings (no date filter)
- **Realized in Period**: Filter `asset_transactions` where `transaction_type === 'sell'` AND `transaction_date` falls within period
- **Period Realized per Asset**: Group realized P&L by asset within period
- **Closed This Period**: Assets that had their last sell transaction within the period AND no longer exist in current holdings

New interface additions:

```typescript
interface PeriodPnLData extends ProfitLossData {
  periodLabel: string;
  periodRealizedPnL: number;  // Realized P&L only within period
  openPositionsWithPeriodData: Array<{
    ...asset,
    unrealizedPnL: number,
    periodRealizedPnL: number,  // Sales within period
    periodTransactions: AssetTransaction[],
  }>;
  closedThisPeriod: ClosedPosition[];  // Positions closed within period
}
```

### Phase 3: Redesigned P&L Details Dialog Layout

**Update: `src/components/ProfitLossDetailDialog.tsx`**

New layout structure:

```
[Period Selector: This Month | Last Month | YTD | 1Y | All | 📅]

[Summary Strip - 3 columns]
┌─────────────────┬─────────────────┬─────────────────┐
│ Total P&L       │ Unrealized      │ Realized        │
│ +$XXX,XXX       │ +$XXX,XXX       │ +$XX,XXX        │
│ +XX%            │ +XX%            │ (in period)     │
└─────────────────┴─────────────────┴─────────────────┘

[Tabs: By Asset | By Category]

By Asset Tab:
┌─────────────────────────────────────────────────────┐
│ Open Positions (X)                          [Sort▼] │
├─────────────────────────────────────────────────────┤
│ BTC (2.5)                            $152,734       │
│                          Unrealized: +$28,734 🟢    │
│                   Realized in period: +$2,178 🟢    │
│                                    [Tap for details]│
├─────────────────────────────────────────────────────┤
│ Silver (150)                          $8,925        │
│                          Unrealized: +$1,234 🟢     │
│                   Realized in period: $0            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Closed This Period (X)                              │
├─────────────────────────────────────────────────────┤
│ TSLA (closed)                                       │
│                   Realized: -$7,500 | -12% 🔴       │
│                                    [Tap for details]│
└─────────────────────────────────────────────────────┘
```

### Phase 4: Asset Detail Modal

**New File: `src/components/AssetDetailModal.tsx`**

A dedicated modal for viewing full asset details, opened when tapping an asset row:

```
[Asset: BTC | Close X]

[Tabs: Overview | Transactions | Lots/Tax]

Overview Tab:
┌─────────────────────────────────────────────────────┐
│ Current Position                                    │
│ Qty: 2.5 | Avg Cost: $48,200 | Value: $152k        │
│                                                     │
│ Unrealized P&L                                      │
│ +$28,734 (+23%) 🟢                                  │
│                                                     │
│ Period Realized (This Month)                        │
│ +$2,178 🟢                                          │
└─────────────────────────────────────────────────────┘

Transactions Tab:
┌─────────────────────────────────────────────────────┐
│ [All] [Buys] [Sells] [This Month]      [Export CSV] │
├─────────────────────────────────────────────────────┤
│ 2026-02-03  SELL  0.5 @ $79k  →  P&L -$957 🔴      │
│ 2026-02-02  SELL  1.0 @ $92k  →  P&L +$2,178 🟢    │
│ 2026-01-15  BUY   4.0 @ $45k                        │
│ ...                                                 │
└─────────────────────────────────────────────────────┘

Lots/Tax Tab (placeholder):
┌─────────────────────────────────────────────────────┐
│ FIFO Tax Lots                                       │
│ (Coming soon - shows lot-level breakdown)           │
└─────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/PnLPeriodSelector.tsx` | Create | Period selector with presets + custom date range |
| `src/hooks/usePeriodPnL.ts` | Create | New hook for period-filtered P&L calculations |
| `src/components/ProfitLossDetailDialog.tsx` | Modify | Add period selector, new layout, clickable asset rows |
| `src/components/AssetDetailModal.tsx` | Create | Full asset detail modal with Overview/Transactions/Lots tabs |

---

## Technical Details

### Period Calculation Logic

```typescript
type PeriodPreset = 'this-month' | 'last-month' | 'ytd' | '1y' | 'all' | 'custom';

function getPeriodDates(preset: PeriodPreset): { start: Date | null; end: Date | null } {
  const now = new Date();
  switch (preset) {
    case 'this-month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last-month':
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'ytd':
      return { start: startOfYear(now), end: now };
    case '1y':
      return { start: subYears(now, 1), end: now };
    case 'all':
      return { start: null, end: null }; // No filtering
    case 'custom':
      // Uses custom date range from state
  }
}
```

### Filtering Transactions by Period

```typescript
function filterTransactionsByPeriod(
  transactions: AssetTransaction[],
  startDate: Date | null,
  endDate: Date | null
): AssetTransaction[] {
  if (!startDate && !endDate) return transactions;
  
  return transactions.filter(tx => {
    const txDate = new Date(tx.transaction_date);
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });
}
```

### Asset Row Data Structure

Each open position row shows:
- Asset name + quantity
- Current market value
- Unrealized P&L (always current)
- Realized in period (sum of sell P&L within period for this asset)
- Green/red indicator based on total

### CSV Export for Transactions Tab

Simple function to generate CSV from filtered transactions:

```typescript
function exportTransactionsCSV(transactions: AssetTransaction[], assetName: string) {
  const headers = ['Date', 'Type', 'Quantity', 'Price', 'Total', 'P&L', 'Notes'];
  const rows = transactions.map(tx => [
    tx.transaction_date,
    tx.transaction_type,
    tx.quantity,
    tx.price_per_unit,
    tx.total_value,
    tx.realized_pnl ?? '',
    tx.notes ?? '',
  ]);
  // Download as CSV
}
```

---

## UI/UX Considerations

1. **Default to "This Month"** - Most relevant view for active traders
2. **Sticky period selector** - Always visible at top of dialog
3. **Clickable rows** - Entire row is clickable to open Asset Detail Modal
4. **Sort options** - Sort by P&L amount, %, or market value
5. **Empty states** - "No realized P&L this period" when no sales in selected range
6. **Mobile responsive** - Stack layout on small screens

---

## Dependencies

- Uses existing `date-fns` for date calculations
- Uses existing `Calendar` and `Popover` components for date range picker
- No new external dependencies required
