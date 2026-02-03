
# Plan: Fix Scrollable Content in Profit & Loss Dialog

## Problem

The "By Asset" tab in the Profit & Loss Details dialog has a fixed height limit (`max-h-[40vh]`) that prevents users from seeing all assets when there are many items. The dialog itself allows up to 80% viewport height, but the ScrollArea inside only uses half of that.

## Solution

Update the ScrollArea to properly expand and fill the available space within the dialog's flex container, allowing users to scroll through all their assets.

## Implementation

**File: `src/components/ProfitLossDetailDialog.tsx`**

Change the ScrollArea from a fixed max-height to a flexible height that fills available space:

**Line 129 - Current:**
```tsx
<ScrollArea className="h-full max-h-[40vh]">
```

**Line 129 - Updated:**
```tsx
<ScrollArea className="h-full">
```

Also update the TabsContent container to properly expand (line 128):

**Current:**
```tsx
<TabsContent value="by-asset" className="flex-1 min-h-0 mt-4">
```

**Updated:**
```tsx
<TabsContent value="by-asset" className="flex-1 min-h-0 mt-4 overflow-hidden">
```

And similarly for the "By Category" tab - need to check if it has the same issue.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ProfitLossDetailDialog.tsx` | Remove `max-h-[40vh]` constraint from ScrollArea; ensure TabsContent has `overflow-hidden` to properly contain the scroll area |

## Result

After this fix, the asset list will properly scroll within the full available dialog height (~80vh minus header and summary), allowing users to see all their assets including all closed positions.
