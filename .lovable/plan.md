
# Fix Tutorial Step 6 Visual Spotlight Issue

## Problem Analysis

The tutorial spotlight for step 6 (Charts Section) shows multiple separate yellow borders around individual chart cards instead of a single unified border around the container. The screenshot shows:
- A separate border around "Net Worth Trend" 
- A separate border around "Asset Allocation"
- A third border at the bottom around another section

## Root Cause

The current TutorialOverlay.tsx uses **two overlapping overlay techniques**:

1. **Line 156**: A `radial-gradient` creating a dark overlay with transparent center
2. **Line 172**: A `box-shadow: 0 0 0 9999px` on the spotlight border element creating ANOTHER dark overlay

Combined with the `glass-card` components having semi-transparent backgrounds (`bg-card/80`), this creates visual artifacts where the overlays interact with the transparent child elements, making it appear as if each card has its own spotlight border.

## Solution

Remove the redundant radial-gradient overlay and rely solely on the box-shadow approach for the spotlight effect. This is a simpler, more reliable method that creates a single clear cutout.

---

## File Changes

| File | Change |
|------|--------|
| `src/components/Tutorial/TutorialOverlay.tsx` | Remove radial-gradient overlay, use only box-shadow for spotlight effect |

---

## Technical Implementation

### Before (lines 146-174):
```tsx
{/* Dark overlay with spotlight cutout - radial gradient */}
<motion.div
  style={{
    background: `radial-gradient(ellipse ${targetRect.width + 40}px ${targetRect.height + 40}px at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent 0%, rgba(0,0,0,0.75) 100%)`,
  }}
/>

{/* Spotlight border highlight - also creates overlay via box-shadow */}
<motion.div
  style={{
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.75), 0 0 20px rgba(var(--primary), 0.5)',
  }}
/>
```

### After:
```tsx
{/* Single spotlight border that creates the dark overlay via box-shadow */}
<motion.div
  className="fixed z-[91] rounded-lg border-2 border-primary pointer-events-none"
  style={{
    top: targetRect.top,
    left: targetRect.left,
    width: targetRect.width,
    height: targetRect.height,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.75), 0 0 20px rgba(245, 195, 66, 0.3)',
  }}
/>
```

The key changes:
1. Remove the radial-gradient `motion.div` element entirely (lines 149-158)
2. Keep only the spotlight border element with `box-shadow: 0 0 0 9999px` for the overlay effect
3. This ensures only ONE dark overlay is rendered with a clean rectangular cutout

---

## Visual Outcome

```text
Before (current - buggy):
+------------------+  +------------------+
| ┌──────────────┐ |  | ┌──────────────┐ |
| │ Net Worth    │ |  | │ Allocation   │ |
| │    Trend     │ |  | │    Chart     │ |
| └──────────────┘ |  | └──────────────┘ |
+------------------+  +------------------+
   (separate borders around each card)

After (fixed):
+----------------------------------------+
| ┌──────────────┐    ┌──────────────┐   |
| │ Net Worth    │    │ Allocation   │   |
| │    Trend     │    │    Chart     │   |
| └──────────────┘    └──────────────┘   |
+----------------------------------------+
   (single border around entire container)
```

---

## Summary

This fix simplifies the spotlight overlay implementation by removing the redundant radial-gradient layer, which was causing visual artifacts when combined with semi-transparent card backgrounds. The result is a clean, single spotlight highlight around the charts section container.
