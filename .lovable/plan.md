
# Plan: Make Add Asset Dialog Scrollable

## Problem

The Add Asset dialog becomes too tall when adding stocks/crypto with cost basis fields, causing the "Add Asset" button to be cut off at the bottom of the screen.

## Solution

Add a scrollable area inside the dialog content with a constrained maximum height, ensuring the submit button is always visible regardless of how many form fields are displayed.

## Changes Required

### File: `src/components/AddAssetDialog.tsx`

1. **Add max-height and overflow to DialogContent**
   - Add `max-h-[85vh]` to limit height to 85% of viewport
   - Add `overflow-y-auto` to enable vertical scrolling

2. **Alternative approach (better UX)**: Wrap the form content in a ScrollArea
   - Keep the DialogHeader fixed at the top
   - Make the form fields scrollable
   - Keep the submit button visible at the bottom (sticky footer)

### Implementation Details

The recommended approach is to structure the dialog with:
- Fixed header (DialogHeader)
- Scrollable middle section (form fields) with `max-h-[60vh] overflow-y-auto`
- Fixed footer (submit button)

```text
+----------------------------------+
|  Add New Asset         [X]       |  <- Fixed header
+----------------------------------+
|  Category                        |
|  [Stocks & ETFs        v]        |
|                                  |
|  Search Stock/ETF                |
|  [TSLA                  ]        |  <- Scrollable area
|                                  |     max-h-[60vh]
|  ... more fields ...             |
|                                  |
+----------------------------------+
|  [    Add Asset     ]            |  <- Fixed footer
+----------------------------------+
```

### Code Changes

Modify line 212 and wrap the form content:

```tsx
<DialogContent className="glass-card border-primary/20 sm:max-w-[425px] max-h-[90vh] flex flex-col">
  <DialogHeader>
    <DialogTitle className="gradient-text">Add New Asset</DialogTitle>
  </DialogHeader>
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
      <div className="space-y-4 overflow-y-auto flex-1 pr-2">
        {/* All form fields here */}
      </div>
      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-4 flex-shrink-0">
        Add Asset
      </Button>
    </form>
  </Form>
</DialogContent>
```

## Benefits

- Submit button always visible without scrolling to the bottom
- Works on all screen sizes including mobile
- Maintains visual consistency with other dialogs
- Form fields scroll independently while header and button stay fixed
