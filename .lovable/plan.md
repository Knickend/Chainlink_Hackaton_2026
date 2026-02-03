

# Plan: Synchronize Net Worth Calculations

## The Problem

The Net Worth StatCard shows **€2,136,934** while the Chart shows **€2,148,906** — a **€11,972 difference** (0.56%).

### Root Cause: Two Different Calculation Approaches

| Component | Calculation Method |
|-----------|-------------------|
| **StatCard** | Smart logic: EUR banking assets use native EUR amounts directly + USD assets converted to EUR |
| **Chart** | Simple: Snapshot USD value (2,544,319) × live EUR rate (0.84459) |

The discrepancy exists because:

1. The **StatCard** bypasses USD for EUR banking assets (e.g., €475,000 house stays €475,000)
2. The **snapshot** stores a USD total that was calculated by converting EUR→USD→stored
3. The **chart** then converts that USD back to EUR, introducing forex drift

**Example drift calculation:**
- Your EUR banking total: **€1,191,904**
- Stored in snapshot as USD: €1,191,904 × (1/0.84459) = **$1,411,308**
- Chart converts back: $1,411,308 × 0.84459 = **€1,191,904** ✓

Wait - this should work if rates are consistent. Let me check the actual snapshot breakdown...

**Snapshot `assets_breakdown.banking`:** $1,437,022 USD
**But actual EUR banking total:** €1,191,904 ≈ $1,411,308 USD at 0.84459 rate

The snapshot has **$25,714 more** in banking than expected. This suggests the snapshot was created with a **different forex rate** than the current live rate.

---

## The Real Issue

The snapshot was created when EUR rate was different. When displayed with today's rate:
- Snapshot banking: $1,437,022 × 0.84459 = **€1,213,646**
- But your actual EUR assets: **€1,191,904**
- Difference: ~€21,742

Plus the chart uses the snapshot's `net_worth` which was calculated with the old rate.

---

## Solution: Match Chart to StatCard Logic

Rather than trying to fix historical snapshots (impossible), we should make the chart use the **same live calculation** as the StatCard for the **current month only**.

### Approach: Hybrid Chart Data

For the **most recent snapshot** (current month):
- Replace stored value with live `metrics.totalNetWorth` 
- This ensures the latest data point matches the StatCard exactly

For **historical snapshots**:
- Keep using stored values (they represent that point in time)
- Accept minor drift as historical accuracy

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/NetWorthChart.tsx` | Accept `currentNetWorth` prop to override latest snapshot |
| `src/pages/Index.tsx` | Pass `metrics.totalNetWorth` to chart |

---

## Technical Implementation

### 1. NetWorthChart.tsx

Add new prop and use it for the latest data point:

```typescript
interface NetWorthChartProps {
  formatValue: (value: number, showDecimals?: boolean) => string;
  formatDisplayUnitValue: (value: number, showDecimals?: boolean) => string;
  displayUnit: DisplayUnit;
  conversionRates: Record<DisplayUnit, number>;
  currentNetWorth?: number; // NEW: Live net worth in display unit
}

// In chartData memo:
const chartData = useMemo(() => {
  if (snapshots.length === 0 || !conversionRates) return [];
  
  const rate = conversionRates[displayUnit] ?? 1;
  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-02"
  
  return snapshots
    .slice(0, 12)
    .reverse()
    .map(snapshot => {
      const isCurrentMonth = snapshot.snapshot_month.startsWith(currentMonth);
      
      return {
        month: formatShortMonth(snapshot.snapshot_month),
        // Use live value for current month, stored value for historical
        netWorth: isCurrentMonth && currentNetWorth !== undefined
          ? currentNetWorth
          : snapshot.net_worth * rate,
      };
    });
}, [snapshots, formatShortMonth, conversionRates, displayUnit, currentNetWorth]);
```

### 2. Index.tsx

Pass the adjusted net worth (which accounts for debt):

```typescript
<NetWorthChart 
  formatValue={formatValue} 
  formatDisplayUnitValue={formatDisplayUnitValue}
  displayUnit={displayUnit}
  conversionRates={conversionRates}
  currentNetWorth={adjustedNetWorth}
/>
```

---

## Why This Works

| Month | Data Source | Result |
|-------|-------------|--------|
| Feb 2026 (current) | Live `adjustedNetWorth` | Matches StatCard exactly |
| Jan 2026 (historical) | Snapshot USD × rate | Historical accuracy preserved |

The chart's latest point will always match the StatCard because they use the same value.

---

## Alternative Considered

**Store snapshots in display unit**: Rejected because:
- Requires schema changes
- Would need to store user's display unit preference at snapshot time
- Historical data would be inconsistent
- Snapshots should capture USD as a stable reference

---

## Summary

The fix passes the live `adjustedNetWorth` to the chart, which uses it for the current month's data point instead of converting the stored USD snapshot. This guarantees the chart and StatCard show identical values for "today" while preserving historical data accuracy.

