

# Plan: Make Asset Category Card Scrollable

## The Request

The "Cash, Stablecoins & Real Estate" card (and other category cards) currently shows only 3 assets with "+6 more assets" text. You want to scroll and see all 9 assets directly in the card.

---

## Solution

Replace the "show 3 + more" pattern with a scrollable container that displays all assets.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/AssetCategoryCard.tsx` | Remove the `.slice(0, 3)` limit and add scrollable container with max height |

---

## Technical Implementation

### Current Code (lines 71-151):
```tsx
<div className="space-y-2">
  {assets.slice(0, 3).map((asset) => {
    // ... asset rendering
  })}
  {assets.length > 3 && (
    <p className="text-xs text-center text-muted-foreground pt-1">
      +{assets.length - 3} more assets
    </p>
  )}
</div>
```

### Updated Code:
```tsx
<div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
  {assets.map((asset) => {
    // ... asset rendering (unchanged)
  })}
</div>
```

**Changes:**
1. Remove `.slice(0, 3)` → show all assets
2. Add `max-h-[240px]` → limit visible height (~5 assets)
3. Add `overflow-y-auto` → enable vertical scrolling when needed
4. Add `pr-1` → small padding for scrollbar spacing
5. Remove the "+X more assets" text completely

---

## Visual Behavior

| Assets Count | Before | After |
|--------------|--------|-------|
| 1-3 assets | Shows all, no scroll | Shows all, no scroll |
| 4-5 assets | Shows 3 + "+X more" | Shows all, scrollable |
| 6+ assets | Shows 3 + "+X more" | Shows ~5, scroll for rest |

---

## Summary

The category cards will now be scrollable, allowing you to view all assets without clicking through to a separate view. The scrolling only activates when there are more assets than can fit in the ~240px container height.

