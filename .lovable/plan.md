

# Polish Subscription Dialog Plan Cards

## Problem Analysis

The current badge positioning has alignment issues:

1. **Standard card**: The "50% OFF" badge at `-top-2.5 right-2` conflicts with the selection checkmark at `top-3 right-3`
2. **Pro card**: Both "POPULAR" (centered) and "50% OFF" (right-aligned) badges appear, creating visual clutter and misalignment
3. **Inconsistent spacing**: Badges have different positioning strategies

## Solution

Restructure badge positioning with a unified approach:

1. Create a **single badge container** at the top of each card that holds all badges in a row
2. Position badges **inline** rather than absolutely scattered
3. Move the selection checkmark **outside** the badge area to prevent overlap
4. Use consistent sizing and spacing for all badges

## File to Modify

| File | Changes |
|------|---------|
| `src/components/SubscriptionDialog.tsx` | Restructure badge positioning for better alignment |

## Technical Changes

### Current Structure (lines 179-195, 238-245)
```tsx
{/* POPULAR badge - centered */}
{plan.isPopular && (
  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
    <span className="...">POPULAR</span>
  </div>
)}

{/* Discount badge - right aligned */}
<div className="absolute -top-2.5 right-2">
  <Badge>50% OFF</Badge>
</div>

{/* Selection checkmark - also right, causes overlap */}
{isSelected && (
  <motion.div className="absolute top-3 right-3">
    <Check />
  </motion.div>
)}
```

### Proposed Structure
```tsx
{/* Unified badge row - positioned above card content */}
<div className="absolute -top-3 left-0 right-0 flex items-center justify-center gap-2 px-4">
  {plan.isPopular && (
    <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full uppercase tracking-wide">
      Popular
    </span>
  )}
  <Badge 
    variant="secondary" 
    className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5"
  >
    {isAnnual ? '2 MO FREE' : '50% OFF'}
  </Badge>
</div>

{/* Selection checkmark - moved inside card padding area */}
{isSelected && (
  <motion.div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
    <Check className="w-3 h-3 text-primary-foreground" />
  </motion.div>
)}
```

## Visual Comparison

**Before**:
```text
     [POPULAR]              [50% OFF]  [checkmark overlaps here]
+------------------+   +------------------+
|  Standard        |   |  Pro             |
|  €4.99/mo        |   |  €9.99/mo        |
```

**After**:
```text
   [POPULAR] [50% OFF]      [50% OFF]
+------------------+   +------------------+
|  Standard    [✓] |   |  Pro         [✓] |
|  €4.99/mo        |   |  €9.99/mo        |
```

## Specific Changes

| Change | Details |
|--------|---------|
| Unified badge container | Single row with `flex justify-center gap-2` for all badges |
| Consistent badge sizing | Both badges use `text-[10px]` and similar padding |
| Checkmark repositioned | Moved to `top-4 right-4` inside the card, clear of badges |
| Add top padding | Add `pt-3` to card content to make room for the badge row |
| Remove duplicate positioning | Eliminate separate absolute positions for each badge |

## Summary

This change consolidates badges into a unified, centered row above each card, eliminates overlap with the selection checkmark, and provides consistent visual alignment across both Standard and Pro plans.

