
# Plan: Make All Dialogs Consistently Scrollable

## Problem

Looking at the uploaded screenshots, the Add Asset dialog for cryptocurrency extends beyond the viewport. While you've already fixed `AddAssetDialog.tsx` with proper scrollable styling, other dialogs across the application are inconsistent - some have no scrolling at all, and others use different approaches.

## Current State Analysis

| Dialog | Scroll Behavior | Issue |
|--------|-----------------|-------|
| AddAssetDialog | Fixed header/footer, scrollable content | Already correct |
| EditAssetDialog | No scroll | May overflow on mobile/small screens |
| SellAssetDialog | No scroll | May overflow on mobile/small screens |
| AddDebtDialog | No scroll | May overflow with 6 form fields |
| EditDebtDialog | No scroll | May overflow with 6 form fields |
| AddGoalDialog | `overflow-y-auto` on entire dialog | Whole dialog scrolls including header |
| EditGoalDialog | `overflow-y-auto` on entire dialog | Whole dialog scrolls including header |
| AddIncomeDialog | No scroll | May overflow on mobile |
| AddExpenseDialog | No scroll | May overflow on mobile |

## Target Pattern

Apply the same consistent pattern used in `AddAssetDialog`:

```tsx
<DialogContent className="sm:max-w-[425px] max-h-[85vh] flex flex-col overflow-hidden">
  <DialogHeader className="flex-shrink-0">...</DialogHeader>
  <Form>
    <form className="flex flex-col flex-1 min-h-0">
      <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
        {/* Form fields */}
      </div>
      <div className="flex-shrink-0 pt-4">
        {/* Submit button / footer */}
      </div>
    </form>
  </Form>
</DialogContent>
```

This ensures:
- Dialog never exceeds 85% viewport height
- Header stays fixed at top
- Footer/submit button stays fixed at bottom
- Only the form content scrolls
- `pr-2` adds padding for scrollbar
- `pb-2` adds bottom padding for better spacing

## Files to Update

| File | Changes |
|------|---------|
| `src/components/EditAssetDialog.tsx` | Add scroll container pattern |
| `src/components/SellAssetDialog.tsx` | Add scroll container pattern |
| `src/components/AddDebtDialog.tsx` | Add scroll container pattern |
| `src/components/EditDebtDialog.tsx` | Add scroll container pattern |
| `src/components/AddGoalDialog.tsx` | Refactor to fixed header/footer pattern |
| `src/components/EditGoalDialog.tsx` | Refactor to fixed header/footer pattern |
| `src/components/AddIncomeDialog.tsx` | Add scroll container pattern |
| `src/components/AddExpenseDialog.tsx` | Add scroll container pattern |

## Detailed Changes

### 1. EditAssetDialog.tsx

Change DialogContent from:
```tsx
<DialogContent className="glass-card border-primary/20 sm:max-w-[425px]">
```

To:
```tsx
<DialogContent className="glass-card border-primary/20 sm:max-w-[425px] max-h-[85vh] flex flex-col overflow-hidden">
```

Wrap form fields in scrollable container with fixed footer.

### 2. SellAssetDialog.tsx

Same pattern - add `max-h-[85vh] flex flex-col overflow-hidden` to DialogContent and restructure form.

### 3. AddDebtDialog.tsx & EditDebtDialog.tsx

Add scroll pattern. Both have 6 form fields which may overflow on smaller screens.

### 4. AddGoalDialog.tsx & EditGoalDialog.tsx

Currently use `max-h-[90vh] overflow-y-auto` on the entire DialogContent. Change to 85vh and add the fixed header/footer pattern so submit button stays visible.

### 5. AddIncomeDialog.tsx & AddExpenseDialog.tsx

Add scroll pattern for consistency, even though they have fewer fields.

## Technical Notes

- Using `max-h-[85vh]` instead of `90vh` for better mobile compatibility
- `flex-shrink-0` on header ensures it never collapses
- `min-h-0` on form is critical for flex child overflow to work correctly
- `pr-2` provides space for scrollbar without overlapping content
- Footer section uses `pt-4` for consistent spacing from scrollable content
