

# Plan: Synchronize Snapshot Display with Live Net Worth

## The Problem

The **Net Worth StatCard** shows **€2,136,934** while both:
- **PortfolioHistoryCard** shows **€2,148,906** (in the selected month details)
- **SnapshotDetailView** shows **€2,148,906** (in the modal)

This €11,972 difference occurs because these components display the stored USD snapshot value converted using current forex rates, but the StatCard uses "smart" calculation logic that avoids forex drift for native-currency banking assets.

## Root Cause

| Component | Calculation | Result |
|-----------|-------------|--------|
| StatCard | Smart: EUR banking uses native EUR amounts directly | €2,136,934 |
| PortfolioHistoryCard | Stored USD × live EUR rate | €2,148,906 |
| SnapshotDetailView | Stored USD × live EUR rate | €2,148,906 |
| NetWorthChart | **Already fixed** to use live value for current month | €2,136,934 ✓ |

The `NetWorthChart` was already fixed to use the live `currentNetWorth` for the current month. The same logic needs to be applied to `PortfolioHistoryCard` and `SnapshotDetailView`.

---

## Solution

Apply the same "current month override" pattern to both remaining components:
- For the **current month's snapshot**: display the live `currentNetWorth` value
- For **historical snapshots**: use stored values (converted to display unit)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/PortfolioHistoryCard.tsx` | Use `currentNetWorth` for current month's net worth display |
| `src/components/SnapshotDetailView.tsx` | Accept `currentNetWorth` prop and use it for current month |

---

## Technical Implementation

### 1. PortfolioHistoryCard.tsx

**Add current month detection helper:**
```typescript
// Helper to check if a snapshot is from the current month
const isCurrentMonthSnapshot = (snapshotMonth: string) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return snapshotMonth.startsWith(currentMonth);
};
```

**Update the net worth display (line 181):**
```typescript
<p className="text-xl font-bold">
  {isCurrentMonthSnapshot(selectedSnapshot.snapshot_month) 
    ? formatDisplayUnitValue(currentNetWorth, false)
    : formatValue(selectedSnapshot.net_worth, false)}
</p>
```

**Add `formatDisplayUnitValue` as a required prop** since `currentNetWorth` is already in the display unit.

### 2. SnapshotDetailView.tsx

**Add new props:**
```typescript
interface SnapshotDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: PortfolioSnapshot | null;
  formatValue: (value: number, showDecimals?: boolean) => string;
  formatDisplayUnitValue?: (value: number, showDecimals?: boolean) => string;
  currentNetWorth?: number; // Live value in display unit
  onDelete?: (snapshotId: string) => void;
  isDeleting?: boolean;
}
```

**Add current month detection and update display (line 67):**
```typescript
const isCurrentMonth = snapshot.snapshot_month.startsWith(
  new Date().toISOString().slice(0, 7)
);

// In the JSX:
<p className="text-2xl font-bold">
  {isCurrentMonth && currentNetWorth !== undefined && formatDisplayUnitValue
    ? formatDisplayUnitValue(currentNetWorth, false)
    : formatValue(snapshot.net_worth, false)}
</p>
```

### 3. Update Prop Passing

**PortfolioHistoryCard.tsx props interface:**
```typescript
interface PortfolioHistoryCardProps {
  currentNetWorth: number;
  formatValue: (value: number, showDecimals?: boolean) => string;
  formatDisplayUnitValue: (value: number, showDecimals?: boolean) => string; // NEW
  delay?: number;
}
```

**Pass props to SnapshotDetailView:**
```typescript
<SnapshotDetailView
  open={showDetails}
  onOpenChange={setShowDetails}
  snapshot={selectedSnapshot}
  formatValue={formatValue}
  formatDisplayUnitValue={formatDisplayUnitValue}
  currentNetWorth={currentNetWorth}
  onDelete={deleteSnapshot}
  isDeleting={isDeleting}
/>
```

**Index.tsx - pass formatDisplayUnitValue:**
```typescript
<PortfolioHistoryCard 
  currentNetWorth={adjustedNetWorth} 
  formatValue={formatValue}
  formatDisplayUnitValue={formatDisplayUnitValue}
  delay={0.2}
/>
```

---

## Why This Works

| Snapshot Month | Data Source | Result |
|----------------|-------------|--------|
| Feb 2026 (current) | Live `currentNetWorth` | Matches StatCard exactly |
| Jan 2026 (historical) | Stored USD × rate | Historical accuracy preserved |

The current month's snapshot display will match the StatCard exactly because they use the same pre-calculated live value.

---

## Summary

All three net worth displays (StatCard, PortfolioHistoryCard, SnapshotDetailView) will show identical values for the current month by using the live `currentNetWorth` prop. Historical months continue using stored snapshot data.

