

# Fix Badge Positioning in Subscription Dialog

## Problem

Looking at the screenshot, the badges are misaligned:

1. **Standard card**: The single "50% OFF" badge appears left of center
2. **Pro card**: The "POPULAR" + "50% OFF" badges are also shifted left
3. The selection checkmark (top-right) creates visual imbalance with the centered badges

## Root Cause

The current implementation centers badges across the full card width (`left-0 right-0 justify-center`), but:
- The checkmark at `top-4 right-4` occupies space in the top-right corner
- This makes centered badges appear visually off-balance
- With different badge counts per card (1 vs 2), alignment looks inconsistent

## Solution

Position badges at the **top-left** of the card (aligned with card content) and keep the checkmark at the **top-right**. This creates a clear visual hierarchy:
- Badges anchor to left, following content flow
- Checkmark anchors to right, indicating selection

## File to Modify

| File | Changes |
|------|---------|
| `src/components/SubscriptionDialog.tsx` | Change badge positioning from center to left-aligned |

## Technical Changes

### `src/components/SubscriptionDialog.tsx` - Line 180

**Current**:
```tsx
<div className="absolute -top-3 left-0 right-0 flex items-center justify-center gap-1.5">
```

**After**:
```tsx
<div className="absolute -top-3 left-4 flex items-center gap-1.5">
```

Changes:
- Remove `right-0` (no longer spanning full width)
- Remove `justify-center` (no longer centering)
- Change `left-0` to `left-4` (align with card's internal padding)

## Visual Result

**Before (misaligned)**:
```text
       [50% OFF]                          [POPULAR] [50% OFF]
+------------------+ [✓]     +------------------+ [✓]
|  Standard        |         |  Pro             |
```

**After (clean left-aligned)**:
```text
[50% OFF]                    [POPULAR] [50% OFF]
+------------------+ [✓]     +------------------+ [✓]
|  Standard        |         |  Pro             |
```

Both cards will have badges consistently positioned at the top-left, with checkmarks at top-right, creating balanced visual weight on each side.

