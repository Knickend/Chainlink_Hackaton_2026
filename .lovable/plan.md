

## Goal
Make the "By Asset" tab in the Profit & Loss Details dialog reliably scrollable.

## Root Cause Analysis

The issue is with how Radix UI's `ScrollArea` component handles flex-based sizing:

1. **Current setup**: `ScrollArea` is given `flex-1 min-h-0` classes
2. **Radix implementation**: The `ScrollAreaPrimitive.Root` has `relative overflow-hidden`, and the `Viewport` has `h-full w-full`
3. **Problem**: The `h-full` on the Viewport expects a **defined pixel height** on the parent, but `flex-1` with `min-h-0` doesn't give it one in all browsers/contexts
4. **Result**: The content renders at full intrinsic height but gets clipped by `overflow-hidden`, making scrolling impossible

## Solution: Use Native Scrolling

Replace Radix `ScrollArea` with a simple `div` that has native `overflow-y-auto`. This is the fallback approach mentioned in the existing plan - it's less fancy (no custom scrollbar styling) but extremely reliable.

## Implementation

**File: `src/components/ProfitLossDetailDialog.tsx`**

### Change 1: Replace ScrollArea with native scrolling div for "By Asset" tab

Lines 128-130 (current):
```tsx
<TabsContent value="by-asset" className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden">
  <ScrollArea className="flex-1 min-h-0">
    <div className="space-y-2 pr-4">
```

Updated:
```tsx
<TabsContent value="by-asset" className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden">
  <div className="flex-1 min-h-0 overflow-y-auto pr-2">
    <div className="space-y-2">
```

And the corresponding closing tags around line 529:
```tsx
    </div>  {/* close space-y-2 */}
  </div>    {/* close overflow-y-auto div, was ScrollArea */}
</TabsContent>
```

### Change 2: Same fix for "By Category" tab (lines 531-535)

Replace ScrollArea with native scrolling:
```tsx
<TabsContent value="by-category" className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden">
  <div className="flex-1 min-h-0 overflow-y-auto pr-2">
    {/* existing content */}
  </div>
</TabsContent>
```

## Why This Works

1. **Native overflow**: `overflow-y-auto` is a CSS property that browsers handle natively
2. **Bounded height**: The parent `TabsContent` with `flex-1 min-h-0` creates a bounded height for the child
3. **Simple cascade**: `div` with `flex-1 min-h-0` shrinks to fit available space, then `overflow-y-auto` enables scrolling
4. **No Radix complexity**: Avoids the internal `h-full` issues with Radix's Viewport component

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ProfitLossDetailDialog.tsx` | Replace `ScrollArea` with `div className="flex-1 min-h-0 overflow-y-auto"` in both tabs |

## Verification

1. Open Profit & Loss dialog with many assets + closed positions
2. Mouse wheel/trackpad scroll should work inside the list
3. Should be able to reach the very last item
4. Dialog size stays fixed (no content spilling outside)
5. Touch/swipe scroll works on mobile
6. Tab switching works without breaking scroll behavior

