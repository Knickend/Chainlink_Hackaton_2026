
# Plan: Make Profit & Loss Card Full Width

## Problem

The Profit & Loss card currently sits in a 3-column grid but only uses 1 column, leaving 2/3 of the row empty. The screenshot shows the card looking cramped on the left side with wasted space.

## Solution

Remove the grid container and redesign the card layout to utilize the full dashboard width with a horizontal arrangement of stats.

## Changes Required

### 1. Update `src/pages/Index.tsx`

Remove the grid wrapper around the P&L section. Change from:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
  <div className="lg:col-span-1">
    {isPro ? (
      <ProfitLossCard ... />
    ) : !isDemo && (
      <ProfitLossTeaser ... />
    )}
  </div>
</div>
```

To:

```tsx
<div className="mb-8">
  {isPro ? (
    <ProfitLossCard ... />
  ) : !isDemo && (
    <ProfitLossTeaser ... />
  )}
</div>
```

### 2. Update `src/components/ProfitLossCard.tsx`

Redesign the card layout to use horizontal space effectively:

**Current layout (stacked, narrow):**
```text
+---------------------------+
|  $ Profit & Loss    [PRO] |
+---------------------------+
|       Total P&L           |
|    +$204,355.80           |
|       +399.9%             |
|  +----------+ +--------+  |
|  |Unrealized| |Realized|  |
|  |+$204,355 | |+$0.00  |  |
|  +----------+ +--------+  |
|  [View Details]           |
+---------------------------+
```

**New layout (horizontal, full-width):**
```text
+-------------------------------------------------------------------------------+
|  $ Profit & Loss                                                        [PRO] |
+-------------------------------------------------------------------------------+
|   Total P&L           |    Unrealized P&L      |    Realized P&L      | [View |
|  +$204,355.80         |   +$204,355.80         |   +$0.00             |Details]|
|     +399.9%           |      +399.9%           |      0.0%            |        |
+-------------------------------------------------------------------------------+
```

**Code structure:**
```tsx
<Card className="glass-card border-primary/20">
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <CardTitle>...</CardTitle>
      <ProBadge />
    </div>
  </CardHeader>
  <CardContent>
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      {/* Total P&L - main stat */}
      <div className="flex items-center gap-4">
        <TrendingUp/Down icon />
        <div>
          <p className="text-sm text-muted-foreground">Total P&L</p>
          <span className="text-2xl font-bold">+$204,355.80</span>
          <span className="text-sm">+399.9%</span>
        </div>
      </div>
      
      {/* Unrealized & Realized - side by side */}
      <div className="flex gap-4 md:gap-8">
        <div className="bg-secondary/30 rounded-lg p-4">
          <p>Unrealized</p>
          <p>+$204,355.80</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <p>Realized</p>
          <p>+$0.00</p>
        </div>
      </div>
      
      {/* View Details button */}
      <Button variant="outline">
        View Details
        <ChevronRight />
      </Button>
    </div>
  </CardContent>
</Card>
```

### 3. Update `src/components/ProfitLossTeaser.tsx` (if needed)

Apply similar full-width styling to maintain visual consistency when the teaser is shown to non-Pro users.

## Visual Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Width | 1/3 of dashboard | Full width |
| Layout | Vertical/stacked | Horizontal flow |
| Stats | Centered, narrow boxes | Row of spacious stat blocks |
| Button | Full width at bottom | Right-aligned with stats |

## Responsive Behavior

- **Desktop (lg+)**: Horizontal layout with all elements in a row
- **Tablet (md)**: May wrap to 2 rows if needed
- **Mobile**: Stack vertically (similar to current layout)

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Remove grid wrapper (lines 380-395) |
| `src/components/ProfitLossCard.tsx` | Redesign to horizontal layout |
| `src/components/ProfitLossTeaser.tsx` | Apply matching full-width styling |
