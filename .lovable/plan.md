
# Fix Badge Overlapping with Navigation Header

## Problem

The "Track All Your Assets in One Place" badge is overlapping with the fixed navigation header. This happens because:

1. The navigation is fixed at the top with `h-16` (64px height)
2. The main content has `pt-16` to account for this, but...
3. The HeroSection uses `min-h-[90vh] flex items-center justify-center` which centers content vertically
4. This causes the top of the centered content (the badge) to sometimes overlap with the header area

## Solution

Add additional top padding to the HeroSection to push the content down further from the navigation bar, ensuring the badge has proper clearance.

## File to Modify

| File | Changes |
|------|---------|
| `src/components/landing/HeroSection.tsx` | Add top padding to create clearance from the fixed nav |

## Technical Changes

### `src/components/landing/HeroSection.tsx`

**Current (line 10)**:
```tsx
<section className="relative min-h-[90vh] flex items-center justify-center px-4 overflow-hidden">
```

**After**:
```tsx
<section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-16 overflow-hidden">
```

Adding `pt-16` (64px) to the section will push the vertically-centered content down, creating proper space between the badge and the fixed navigation header.

## Visual Result

**Before**:
```text
+----------------------------------+
| [Nav Bar - fixed h-16]           |
+----------------------------------+
| ● Track All Your Assets...       | <- overlapping/too close
|                                  |
|   Take Control of Your           |
|   Financial Future               |
```

**After**:
```text
+----------------------------------+
| [Nav Bar - fixed h-16]           |
+----------------------------------+
|                                  | <- proper spacing
| ● Track All Your Assets...       |
|                                  |
|   Take Control of Your           |
|   Financial Future               |
```

## Summary

| Change | Details |
|--------|---------|
| Add `pt-16` to HeroSection | Creates 64px top padding to clear the fixed navigation |
