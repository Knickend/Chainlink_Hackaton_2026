
# Fix Text Truncation in Dashboard Cards

## Problem

The card header text ("Monthly Income", "Expenses", etc.) is being truncated too aggressively, showing only "M..." and "E" instead of the full text. This happens because:

1. The right side of the header (total + button) has `flex-shrink-0`, making it take priority
2. The left side with `min-w-0 flex-shrink` shrinks to almost nothing
3. The `truncate` class cuts off text at whatever width remains

| Element | Current Behavior | Issue |
|---------|-----------------|-------|
| Left: Title text | Shrinks to ~0px | Text becomes "M..." |
| Right: Total + Button | Fixed width, never shrinks | Takes most of card width |

## Solution

Restructure the header to give the title section a minimum width so it never shrinks below a readable size:

1. Remove `flex-shrink` from the title container - let it maintain its natural width
2. Remove `truncate` from title/subtitle - the full text should always be visible
3. Wrap the header in a layout that stacks on smaller widths if needed, or ensure titles have enough space

### Layout Strategy

The header should prioritize showing the title fully, with the right section (total + button) being the flexible part that can wrap or compress if needed.

```text
Current (broken):
[Icon][M...1...] [+$25,000.00 per month] [+ Add Income]
       ↑ shrinks to nothing

Fixed:
[Icon][Monthly Income] [+$25,000.00] [+ Add Income]
       [1 sources]      [per month]
       ↑ maintains readable width
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/IncomeExpenseCard.tsx` | Remove aggressive shrinking, ensure title text is always visible |
| `src/components/DebtOverviewCard.tsx` | Apply same fix for consistency |

## Technical Changes

### IncomeExpenseCard.tsx (lines 75-117)

**Remove shrinking from title, let content flow naturally:**

```jsx
{/* Header - change from aggressive shrinking to balanced layout */}
<div className="flex items-center justify-between gap-3 mb-4">
  {/* Left side: icon + title - remove flex-shrink, keep min-w-0 for safety */}
  <div className="flex items-center gap-2 min-w-0 flex-shrink">
    <div className={cn('p-2 rounded-lg flex-shrink-0', ...)}>
      ...icon...
    </div>
    <div className="min-w-0">
      {/* REMOVE truncate - title should always be fully visible */}
      <h3 className="font-semibold capitalize truncate">...</h3>  // Remove truncate
      <p className="text-xs text-muted-foreground truncate">...</p>  // Remove truncate
    </div>
  </div>
  
  {/* Right side: keep flex-shrink-0 but let items wrap */}
  <div className="flex items-center gap-3 flex-shrink-0">
    ...
  </div>
</div>
```

**Wait - the issue is that the right side takes too much space. Let me reconsider.**

The real fix is to:
1. Keep `truncate` on titles as a safety fallback
2. But give the left section a guaranteed minimum width so it doesn't shrink below readability

```jsx
{/* Left side: give minimum width */}
<div className="flex items-center gap-2 min-w-0" style={{ minWidth: '120px' }}>
```

Or better, restructure so titles don't compete with the button:

```jsx
<div className="flex items-center justify-between gap-3 mb-4">
  {/* Left: icon + title - don't shrink */}
  <div className="flex items-center gap-2">
    ...icon...
    <div>
      <h3 className="font-semibold capitalize">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </div>
  
  {/* Right: total + button - allow wrapping if needed */}
  <div className="flex items-center gap-3 flex-shrink-0">
    ...
  </div>
</div>
```

The key insight: Remove `min-w-0` and `flex-shrink` from the left section entirely - let it maintain its natural width. The right section will wrap or the card will expand slightly if needed.

### DebtOverviewCard.tsx

Apply the same pattern - remove the aggressive shrinking classes from the title section.

## Summary

The fix removes `flex-shrink` and the `truncate` class from title elements, allowing them to display at their natural width. The `min-w-0` class can stay as a safety for edge cases, but without `truncate`, text will wrap instead of being cut off. This ensures "Monthly Income" and "Expenses" are always fully readable.
