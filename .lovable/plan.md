
# Fix Tutorial Step 6 Chart Highlight Alignment

## Problem

The tutorial step 6 ("Visualize Your Wealth") is highlighting the entire charts row grid, which spans 3 columns and extends too far to the right. This creates a very large spotlight that doesn't feel focused.

Looking at the screenshot:
- The highlight box extends from the Net Worth chart all the way to the Portfolio History section
- The third column (Portfolio History) is a Pro feature that may not be relevant to the "charts" explanation
- The spotlight should focus only on the two main visualization charts

---

## Solution

Wrap only the **NetWorthChart** and **AllocationChart** in a container with the `data-tutorial="charts-section"` attribute, rather than the entire 3-column grid.

### Layout Change

| Current | Proposed |
|---------|----------|
| 1 grid with 3 columns, entire grid tagged | Split into 2 columns tagged + 1 column separate |

### Updated Structure

```text
Before:
+------------------------------------------+
| [data-tutorial="charts-section"]         |
| +----------+ +----------+ +------------+ |
| | NetWorth | | Allocat. | | Portfolio  | |
| | Chart    | | Chart    | | History    | |
| +----------+ +----------+ +------------+ |
+------------------------------------------+

After:
+----------------------------+ +------------+
| [data-tutorial="charts-   | | Portfolio  |
|       section"]           | | History    |
| +----------+ +----------+ | | (no tag)   |
| | NetWorth | | Allocat. | | +------------+
| | Chart    | | Chart    | |
| +----------+ +----------+ |
+----------------------------+
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Restructure the charts grid to wrap only the first 2 charts with the tutorial attribute |

---

## Technical Details

### Current Code (line ~261):
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8" data-tutorial="charts-section">
  <NetWorthChart ... />
  <AllocationChart ... />
  {/* Portfolio History / Performance cards */}
</div>
```

### Proposed Code:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
  {/* Wrap the two main charts in a subgrid with the tutorial attribute */}
  <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4" data-tutorial="charts-section">
    <NetWorthChart ... />
    <AllocationChart ... />
  </div>
  {/* Third column remains outside the tutorial target */}
  {isPro && !isDemo && (
    <PortfolioHistoryCard ... />
  )}
  {/* ... other conditionals */}
</div>
```

This approach:
1. Uses `lg:col-span-2` to make the inner container span 2 columns
2. Creates a nested grid (`grid-cols-2`) for the two charts
3. Places `data-tutorial="charts-section"` only on this inner container
4. Keeps the Portfolio History section separate from the spotlight

---

## Expected Outcome

After this fix:
- Step 6 will highlight only the Net Worth Trend and Asset Allocation charts
- The spotlight will be visually tighter and more focused
- The Portfolio History section won't be included in the highlight
- The layout will remain identical visually - only the tutorial targeting changes
