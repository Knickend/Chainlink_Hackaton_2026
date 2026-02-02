
# Plan: Fix EditAssetDialog Scroll Issue

## Problem

The Edit Asset dialog content is overflowing beyond the viewport on smaller screens. Looking at the screenshot, the "Cost Basis (for P&L tracking)" section is being cut off at the bottom, and there's no scrollbar visible.

## Root Cause Analysis

The current CSS structure has a gap in the flex chain that prevents proper scroll behavior:

```text
DialogContent (max-h-[85vh] flex flex-col overflow-hidden) ✓
  └─ Tabs (flex flex-col flex-1 min-h-0) ✓
       └─ TabsContent (flex-1 min-h-0) ⚠️ Missing overflow-hidden
            └─ Form
                 └─ form (flex flex-col h-full) ⚠️ h-full doesn't work here
                      └─ div (overflow-y-auto flex-1) - Never scrolls
```

The issue is:
1. `TabsContent` needs `overflow-hidden` to properly contain the scrollable area
2. The `form` uses `h-full` which doesn't work correctly in this flex context - it should use flex properties instead
3. The scrollable div needs proper height constraints to activate scrolling

## Solution

Fix the flex chain by ensuring all intermediate containers properly participate in the height constraint:

| Element | Current Classes | Fixed Classes |
|---------|-----------------|---------------|
| TabsContent | `flex-1 min-h-0 mt-4` | `flex-1 min-h-0 mt-4 overflow-hidden flex flex-col` |
| form | `flex flex-col h-full` | `flex flex-col flex-1 min-h-0` |
| scrollable div | `space-y-4 overflow-y-auto flex-1 pr-2 pb-2` | (unchanged - will work once parents are fixed) |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/EditAssetDialog.tsx` | Update TabsContent and form classes for all three tabs (Edit, Buy, Sell) |

## Detailed Changes

### 1. Edit Tab (around line 433)

**Before:**
```tsx
<TabsContent value="edit" className="flex-1 min-h-0 mt-4">
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
```

**After:**
```tsx
<TabsContent value="edit" className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
```

### 2. Buy Tab (around line 449)

**Before:**
```tsx
<TabsContent value="buy" className="flex-1 min-h-0 mt-4">
  <Form {...buyForm}>
    <form onSubmit={buyForm.handleSubmit(handleBuySubmit)} className="flex flex-col h-full">
```

**After:**
```tsx
<TabsContent value="buy" className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
  <Form {...buyForm}>
    <form onSubmit={buyForm.handleSubmit(handleBuySubmit)} className="flex flex-col flex-1 min-h-0">
```

### 3. Sell Tab (needs to be located and updated similarly)

Apply the same pattern:
- Add `overflow-hidden flex flex-col` to TabsContent
- Change `h-full` to `flex-1 min-h-0` on form

### 4. Non-Tradeable Asset Fallback (banking assets)

The dialog also has a fallback form for non-tradeable assets (banking) that doesn't use tabs. This also needs the same fix to ensure consistent scrolling behavior.

## Technical Explanation

The key issue is that `h-full` (height: 100%) only works when the parent has an explicit height. In a flex column layout with `flex-1`, the height is determined by the flex algorithm, not an explicit value. Using `flex-1 min-h-0` instead tells the element to:
1. Grow to fill available space (`flex-1`)
2. Allow shrinking below content size (`min-h-0`)

This allows the inner `overflow-y-auto` div to actually detect when it needs to scroll.

## Visual Result

After the fix:
- Dialog will be constrained to 85% viewport height
- Header (title) and footer (Save button) remain fixed
- Form fields in the middle will scroll when content exceeds available space
- Scrollbar will appear on the right side of the form area
