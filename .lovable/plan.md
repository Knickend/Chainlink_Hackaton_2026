

# Redesign Income, Expenses, and Debt Cards

## Problem Analysis

The current cards have inconsistent layouts causing visual misalignment:

| Card | Header Structure | Issues |
|------|-----------------|--------|
| Monthly Income | Icon + Title + Large Total + Button (all in one row) | Total and button compete for space |
| Expenses | Icon + Title + Large Total + Button (all in one row) | Button gets pushed outside |
| Debts & Liabilities | Icon + Title + Button (row) + Stats Grid below | Different structure entirely |

The root cause is trying to fit too much horizontal content into a single row, especially on medium-width viewports.

## Solution: Clean Two-Row Header Design

Adopt a consistent two-section layout for all three cards:

```text
+--------------------------------------------------+
| [Icon] Title              [+ Action Button]      |  <- Row 1: Title + Button
|        Subtitle                                  |
+--------------------------------------------------+
| [Total Value]    [Metric 2]     [Metric 3]       |  <- Row 2: Stats Grid
| label            label          label            |
+--------------------------------------------------+
| List items...                                    |
+--------------------------------------------------+
```

This separates the title/action row from the summary stats row, preventing overflow.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/IncomeExpenseCard.tsx` | Complete redesign with two-row header and stats grid |
| `src/components/DebtOverviewCard.tsx` | Apply same consistent structure |

## Detailed Design

### Row 1: Title Row (consistent across all cards)

```jsx
<div className="flex items-center justify-between mb-3">
  <div className="flex items-center gap-3">
    <div className="icon-container">...</div>
    <div>
      <h3>Card Title</h3>
      <p className="subtitle">X items</p>
    </div>
  </div>
  <div className="flex-shrink-0">
    {actionButton}
  </div>
</div>
```

Key changes:
- Button is ONLY in the right corner
- No totals in this row
- Simple, predictable width

### Row 2: Stats Summary (below title, before list)

All three cards get a 3-column stats grid:

**Monthly Income card:**
| Total Income | Sources | Per Month |
|--------------|---------|-----------|
| +$25,000.00  | 1       | recurring |

**Expenses card:**
| Total Expenses | Recurring | Non-Recurring |
|----------------|-----------|---------------|
| -$1,660.00     | 2         | 1             |

**Debt card (existing - keep as is):**
| Total Debt     | Monthly Payments | Monthly Interest |
|----------------|------------------|------------------|
| $420,000.00    | $1,800.00        | $1,166.67        |

### Component Structure

```jsx
// Unified card layout
<motion.div className="glass-card rounded-xl p-5 overflow-hidden">
  {/* Row 1: Title + Action */}
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg {color}/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 {color}" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    <div className="flex-shrink-0">
      {actionButton}
    </div>
  </div>

  {/* Row 2: Stats Summary Grid */}
  <div className="grid grid-cols-3 gap-2 p-3 bg-secondary/30 rounded-lg mb-4">
    <div className="text-center">
      <p className="font-semibold {color}">{total}</p>
      <p className="text-xs text-muted-foreground">Total</p>
    </div>
    <div className="text-center border-x border-border/50">
      <p className="font-semibold">{metric2}</p>
      <p className="text-xs text-muted-foreground">{label2}</p>
    </div>
    <div className="text-center">
      <p className="font-semibold">{metric3}</p>
      <p className="text-xs text-muted-foreground">{label3}</p>
    </div>
  </div>

  {/* Row 3: List Items */}
  <div className="space-y-2 max-h-[180px] overflow-y-auto">
    ...
  </div>
</motion.div>
```

## Technical Implementation

### IncomeExpenseCard.tsx Changes

1. **Remove total from header row** - Move it to stats grid
2. **Add stats grid section** matching Debt card style
3. **Income stats:** Total | Sources count | Type label
4. **Expense stats:** Total | Recurring count | Non-recurring count

```tsx
// Stats for Income
<div className="grid grid-cols-3 gap-2 p-3 bg-secondary/30 rounded-lg mb-4">
  <div className="text-center">
    <p className="font-mono font-semibold text-lg text-success">+{total}</p>
    <p className="text-xs text-muted-foreground">per month</p>
  </div>
  <div className="text-center border-x border-border/50">
    <p className="font-semibold">{items.length}</p>
    <p className="text-xs text-muted-foreground">sources</p>
  </div>
  <div className="text-center">
    <p className="font-semibold">{workCount}</p>
    <p className="text-xs text-muted-foreground">work income</p>
  </div>
</div>

// Stats for Expenses
<div className="grid grid-cols-3 gap-2 p-3 bg-secondary/30 rounded-lg mb-4">
  <div className="text-center">
    <p className="font-mono font-semibold text-lg text-danger">-{total}</p>
    <p className="text-xs text-muted-foreground">total</p>
  </div>
  <div className="text-center border-x border-border/50">
    <p className="font-semibold">{recurringCount}</p>
    <p className="text-xs text-muted-foreground">recurring</p>
  </div>
  <div className="text-center">
    <p className="font-semibold">{oneTimeCount}</p>
    <p className="text-xs text-muted-foreground">non-recurring</p>
  </div>
</div>
```

### DebtOverviewCard.tsx Changes

1. Keep existing layout (already has stats grid)
2. Ensure header row matches Income/Expenses exactly
3. Align padding/margins for visual consistency

## Visual Result

All three cards will have identical structure:

```text
+------------------+  +------------------+  +------------------+
| [Icon] Title [+] |  | [Icon] Title [+] |  | [Icon] Title [+] |
|        sub       |  |        sub       |  |        sub       |
+------------------+  +------------------+  +------------------+
| Total | X  | Y   |  | Total | X  | Y   |  | Total | X  | Y   |
+------------------+  +------------------+  +------------------+
| Item 1           |  | Item 1           |  | Item 1           |
| Item 2           |  | Item 2           |  | Item 2           |
+------------------+  +------------------+  +------------------+
```

The button stays within the card boundary because:
- Title row only contains Icon + Title + Button (no large numbers)
- Stats are in their own dedicated row below
- Consistent `flex-shrink-0` on button container

## Summary

This redesign moves the large total values from the crowded header row into a dedicated stats grid below, matching the existing Debt card pattern. All three cards will have identical visual structure, preventing overflow issues and creating a clean, professional dashboard layout.

