
# Plan: Connect Net Worth Chart to Real Portfolio Snapshots

## Overview

Replace the hardcoded mock data in the Net Worth Trend chart with real historical data from the `portfolio_snapshots` table, and calculate the actual percentage change dynamically.

---

## Current State

| Element | Current Behavior |
|---------|------------------|
| Chart data | Uses `mockHistoricalData` with 6 static entries |
| Percentage indicator | Hardcoded `↑ 14.5%` |
| Time period label | Always shows "Last 6 months" |

---

## Proposed Changes

### New Behavior

| Element | New Behavior |
|---------|--------------|
| Chart data | Real snapshots from `portfolio_snapshots` table (up to 12 months) |
| Percentage indicator | Calculated from oldest vs newest snapshot |
| Time period label | Dynamic based on actual data range |
| Empty state | Shows "No data yet" message when < 2 snapshots |
| Direction indicator | Shows ↑ (green) for gains, ↓ (red) for losses |

---

## Technical Implementation

### File: `src/components/NetWorthChart.tsx`

**Changes:**
1. Add `usePortfolioHistory` hook to fetch real snapshot data
2. Transform snapshots into chart-compatible format
3. Calculate actual % change between first and last snapshot
4. Add empty/loading states
5. Dynamic time period label

**New Props:**
```typescript
interface NetWorthChartProps {
  formatValue: (value: number, showDecimals?: boolean) => string;
  displayUnit: DisplayUnit;
  currentNetWorth?: number; // Optional: include current value as latest point
}
```

**Data Transformation:**
```typescript
// Transform snapshots (sorted newest first) to chart format (oldest first)
const chartData = useMemo(() => {
  if (snapshots.length === 0) return [];
  
  return snapshots
    .slice(0, 12) // Last 12 months max
    .reverse()    // Oldest first for chart
    .map(snapshot => ({
      month: formatShortMonth(snapshot.snapshot_month),
      netWorth: snapshot.net_worth,
    }));
}, [snapshots, formatShortMonth]);
```

**Percentage Calculation:**
```typescript
const periodChange = useMemo(() => {
  if (chartData.length < 2) return null;
  
  const oldest = chartData[0].netWorth;
  const newest = chartData[chartData.length - 1].netWorth;
  const absolute = newest - oldest;
  const percent = oldest !== 0 ? (absolute / oldest) * 100 : 0;
  
  return { absolute, percent, isPositive: percent >= 0 };
}, [chartData]);
```

**Dynamic Time Period:**
```typescript
const timePeriodLabel = useMemo(() => {
  if (chartData.length === 0) return 'No data';
  if (chartData.length === 1) return 'Current month';
  return `Last ${chartData.length} months`;
}, [chartData.length]);
```

**Empty State UI:**
```typescript
{chartData.length < 2 ? (
  <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
    <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
    <p className="text-sm">Not enough data yet</p>
    <p className="text-xs">Take portfolio snapshots to track trends</p>
  </div>
) : (
  // Existing chart code
)}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/NetWorthChart.tsx` | Replace mock data with real snapshots, add dynamic calculations |

---

## Visual Changes

### Header Section (Before)
```
Net Worth Trend
Last 6 months                    ↑ 14.5% vs 6mo ago
```

### Header Section (After - with data)
```
Net Worth Trend
Last 8 months                    ↑ 12.3% vs 8mo ago
```

### Header Section (After - no data)
```
Net Worth Trend
No data                          (no percentage shown)
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| 0 snapshots | Shows empty state with message to take snapshots |
| 1 snapshot | Shows empty state (need 2+ for trend) |
| 2+ snapshots | Shows chart with calculated % |
| Negative growth | Shows ↓ in red with negative % |
| 0 starting value | Shows 100% if grew from 0, 0% if still 0 |

---

## What Stays the Same

- Chart styling (gradient, colors, animations)
- Tooltip formatting
- Y-axis display unit handling (USD, BTC, Gold)
- Responsive behavior
- Glass card styling

---

## Summary

This change connects the Net Worth Trend chart to real data from the `portfolio_snapshots` table, replacing the hardcoded mock values with actual historical tracking. Users will see their real portfolio growth over time, with accurate percentage calculations.
