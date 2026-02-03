
## Goal
Make the **Profit & Loss Details** dialog’s **“By Asset”** screen reliably scrollable so users can reach all assets (including closed positions) when the list is long.

## What’s happening (root cause)
Right now the “By Asset” tab uses a `ScrollArea`, but its height is still not being constrained in a way that forces overflow scrolling in all cases:

- `ScrollArea` is set to `h-full`, which only works if its parent has a definite height.
- `TabsContent` currently has `flex-1 min-h-0 overflow-hidden`, but it is **not a flex container**, so the child `ScrollArea` can end up sizing to its content instead of filling the remaining height of the dialog.
- Since the dialog itself has `overflow-hidden`, any extra content gets clipped instead of scrollable.

This is why you can see a cut-off list but can’t scroll to the rest.

## Fix approach (use the app’s “dialog-ux-standard” flex chain)
We’ll apply the same proven pattern used in other dialogs (like Add/Edit Asset dialogs):

1. Dialog content is `flex flex-col` with `max-h-[80vh]` and `overflow-hidden`
2. Header + summary are `flex-shrink-0`
3. Tabs container is `flex-1 min-h-0 flex flex-col`
4. Each tab panel (`TabsContent`) is `flex-1 min-h-0 overflow-hidden flex flex-col`
5. Scroll container inside is `flex-1 min-h-0` (not `h-full`)

This guarantees the scroll region gets a real, bounded height, so overflow produces scrolling.

## Planned code changes

### 1) Make the “By Asset” tab panel a flex column and let ScrollArea flex
**File:** `src/components/ProfitLossDetailDialog.tsx`

- Update:
  - `TabsContent value="by-asset"` to include `flex flex-col`
  - `ScrollArea` to use `flex-1 min-h-0` instead of `h-full`

Conceptually:
- Before:
  - `TabsContent`: `flex-1 min-h-0 ...`
  - `ScrollArea`: `h-full`
- After:
  - `TabsContent`: `flex flex-col flex-1 min-h-0 ...`
  - `ScrollArea`: `flex-1 min-h-0`

### 2) Make “By Category” scroll-safe as well (same height chain)
Even if the immediate complaint is “By Asset”, “By Category” can also overflow (pie + many categories) and will be clipped by the dialog’s `overflow-hidden`.

**File:** `src/components/ProfitLossDetailDialog.tsx`

- Update:
  - `TabsContent value="by-category"` to: `flex flex-col flex-1 min-h-0 mt-4 overflow-hidden`
  - Wrap its content in a `ScrollArea className="flex-1 min-h-0"` (or use a simple `div` with `overflow-y-auto flex-1 min-h-0` if we want to avoid Radix scrolling there)

### 3) Ensure header doesn’t collapse when content grows
**File:** `src/components/ProfitLossDetailDialog.tsx`

- Add `flex-shrink-0` to `DialogHeader` (matches patterns used elsewhere), so the scroll area takes the hit, not the header.

## Verification / acceptance criteria
1. Open Profit & Loss → View Details → By Asset.
2. With many current + closed positions:
   - You can scroll with mouse wheel / trackpad inside the list.
   - You can reach the very last asset.
   - The dialog size stays fixed (no content spilling outside the dialog).
3. Mobile/touch:
   - Swipe scroll works inside the list.
4. Tab switch:
   - Switching between By Asset and By Category still works and doesn’t “lock” scrolling.

## Files involved
- `src/components/ProfitLossDetailDialog.tsx` (main fix: flex chain + scroll containers)

## Fallback option (if Radix ScrollArea still feels inconsistent)
If we still see issues on certain browsers/devices, we can replace the `ScrollArea` for the asset list with a plain container:
- `div className="flex-1 min-h-0 overflow-y-auto pr-4"`
This is less fancy (no custom scrollbar styling) but extremely reliable.
