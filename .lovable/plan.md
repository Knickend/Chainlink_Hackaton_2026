

## Fix: Make Save Button Visible in Investment Preferences Dialog

### Problem
The dialog content (sliders, pie chart, rebalance settings, footer) overflows the viewport. The Cancel and Save Strategy buttons in the `DialogFooter` are pushed below the visible area.

### Solution
Apply the project's standard scrollable dialog pattern: give `DialogContent` a fixed height with `max-h-[85vh]` and a flex column layout, then wrap the scrollable middle content in a div with `overflow-y-auto` while keeping the header and footer pinned.

### Technical Details

**File: `src/components/InvestmentPreferencesDialog.tsx`**

1. Update `DialogContent` classes:
   - Add `h-[85vh] max-h-[85vh] flex flex-col` to establish a bounded flex container

2. Wrap all content between `DialogHeader` and `DialogFooter` (goals panel, sliders grid, rebalance settings) in a scrollable container:
   - `<div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">`

3. Keep `DialogHeader` and `DialogFooter` outside the scroll wrapper so they remain fixed at top and bottom.

This follows the same pattern used across other dialogs in the app (e.g., Asset Detail, P&L Details) per the established dialog UX standard.
