
# Fix Dashboard Card Alignment and Button Overflow

## Problem Analysis

The "Add Expense" button is overflowing outside the Expenses card boundary. This creates visual misalignment compared to the Income and Debt cards.

| Card | Button | Issue |
|------|--------|-------|
| Monthly Income | "Add Income" | Fits correctly |
| Expenses | "Add Expense ▾" | Overflows card boundary |
| Debts & Liabilities | "Add Debt" | Fits correctly |

**Root Causes:**
1. The `IncomeExpenseCard` header uses flexbox without proper constraints on child elements
2. The left section (icon + title + stats) doesn't have a minimum width limit, pushing the button outside
3. The card container lacks `overflow-hidden` to clip content
4. The button section needs `flex-shrink-0` to maintain its size while allowing the middle section to compress

## Solution

Apply better flex constraints to the card header to ensure all content stays within the card boundaries.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/IncomeExpenseCard.tsx` | Fix header flex layout with proper constraints |
| `src/components/DebtOverviewCard.tsx` | Apply same fix for consistency |

## Technical Changes

### IncomeExpenseCard.tsx

**Current header structure (lines 75-116):**
```jsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">     {/* Left: icon + title */}
  <div className="flex items-center gap-3">     {/* Right: total + button */}
```

**Problems:**
- No `min-w-0` on flex children = content can't shrink below intrinsic width
- No `overflow-hidden` on container = content can overflow visibly
- Middle content (totals) takes full space, pushing button outside

**Fixed structure:**
```jsx
<div className="flex items-center justify-between gap-3 mb-4">
  {/* Left side: shrinkable */}
  <div className="flex items-center gap-2 min-w-0 flex-shrink">
    ...
    <div className="min-w-0">
      <h3 className="font-semibold capitalize truncate">...</h3>
      <p className="text-xs text-muted-foreground truncate">...</p>
    </div>
  </div>
  
  {/* Right side: fixed width, won't shrink */}
  <div className="flex items-center gap-3 flex-shrink-0">
    ...
  </div>
</div>
```

### DebtOverviewCard.tsx

Apply the same pattern to the debt card header for consistency:

```jsx
<div className="flex items-center justify-between gap-3 mb-4">
  <div className="flex items-center gap-3 min-w-0 flex-shrink">
    ...
  </div>
  <div className="flex-shrink-0">
    {actionButton}
  </div>
</div>
```

### Card Container

Add `overflow-hidden` to the card containers to ensure nothing visually escapes:

```jsx
<motion.div
  className="glass-card p-5 overflow-hidden"
>
```

## Visual Result After Fix

All three cards will have consistent alignment with buttons properly contained:

```text
+-------------------+  +-------------------+  +----------------------+
| Monthly Income    |  | Expenses          |  | Debts & Liabilities  |
| [+ Add Income]    |  | [+ Add Expense ▾] |  | [+ Add Debt]         |
+-------------------+  +-------------------+  +----------------------+
```

The button will stay inside the card boundary, and if card width is very narrow, the title text will truncate rather than push the button out.

## Summary

This fix applies proper flexbox constraints (`min-w-0`, `flex-shrink-0`, `truncate`) to prevent the "Add Expense" dropdown button from overflowing the card. The same pattern is applied to the Debt card for visual consistency across all dashboard cards.
