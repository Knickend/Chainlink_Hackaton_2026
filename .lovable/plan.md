

# Plan: Align Chart Display with StatCard Calculation

## The Problem

The Net Worth Trend chart shows €2,148,906 while the StatCard shows €2,141,500 — a €7,406 difference.

### Root Cause Analysis

| Component | Data Source | Calculation Method |
|-----------|-------------|-------------------|
| StatCard | Live assets | Smart logic: Uses EUR amounts directly for EUR assets |
| Chart | Snapshot DB | Stored USD value (2,544,319) × live EUR rate (0.84459) = €2,148,906 |

The snapshot stores net worth in USD. When the chart displays it, it converts USD→EUR using **today's forex rate**. But the StatCard uses native EUR amounts directly (€2,141,500).

The ~0.3% difference comes from:
1. The snapshot USD value was computed using a forex rate active at snapshot time
2. Chart displays using today's forex rate (which changed)

---

## Solution: Convert Snapshots Using Display Unit Logic

The chart should convert the stored USD snapshot value using the **same conversion rate** as the StatCard, not `formatValue`.

Since the StatCard's `totalNetWorth` is already calculated in the display unit, and we know snapshots store USD, we need to either:
1. Store snapshots in the display unit (complex, changes DB schema)
2. **Apply a consistent conversion factor** between snapshot USD and live EUR that matches the StatCard's approach

The cleanest fix: The chart should use `formatDisplayUnitValue` and pre-convert the USD snapshot value to display unit using the **same conversionRates** that the StatCard uses.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/NetWorthChart.tsx` | Use `conversionRates` prop to convert USD snapshots to display unit |
| `src/pages/Index.tsx` | Pass `conversionRates` to NetWorthChart |

---

## Technical Implementation

### 1. NetWorthChart.tsx - Accept and use conversionRates

**Add prop:**
```typescript
interface NetWorthChartProps {
  formatValue: (value: number, showDecimals?: boolean) => string;
  formatDisplayUnitValue: (value: number, showDecimals?: boolean) => string;
  displayUnit: DisplayUnit;
  conversionRates: Record<DisplayUnit, number>;
}
```

**Update chartData calculation:**
```typescript
const chartData = useMemo(() => {
  if (snapshots.length === 0) return [];
  
  const rate = conversionRates[displayUnit];
  
  return snapshots
    .slice(0, 12)
    .reverse()
    .map(snapshot => ({
      month: formatShortMonth(snapshot.snapshot_month),
      // Convert USD snapshot to display unit using same rate as StatCard
      netWorth: snapshot.net_worth * rate,
    }));
}, [snapshots, formatShortMonth, conversionRates, displayUnit]);
```

**Update tooltip formatter:**
```typescript
formatter={(value: number) => [formatDisplayUnitValue(value, false), 'Net Worth']}
```

### 2. Index.tsx - Pass conversionRates to chart

```typescript
<NetWorthChart 
  formatValue={formatValue} 
  formatDisplayUnitValue={formatDisplayUnitValue}
  displayUnit={displayUnit}
  conversionRates={conversionRates}
/>
```

Also need to export `conversionRates` from `usePortfolio`.

---

## Why This Works

Both the StatCard and Chart will now use the **same** USD→DisplayUnit conversion rate from `conversionRates`. This ensures:
- If live forex says 1 USD = 0.845 EUR, both use 0.845
- No more mismatches between different conversion paths

---

## Alternative Consideration

We could also store snapshots in the user's display unit at creation time. However:
- This would require schema changes (add `display_unit` column)
- Historical snapshots would become inconsistent
- The current fix is simpler and achieves the same result

---

## Summary

The chart will pre-convert snapshot USD values to the display unit using the same conversion rates as the StatCard, ensuring both show €2,141,500.

