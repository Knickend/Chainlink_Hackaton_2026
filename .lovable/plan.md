

# Fix CRE Pipeline Cards to Fit Without Scrolling

## Problem
The 5 pipeline step cards in the CRE Architecture Explainer have a fixed minimum width and horizontal scroll (`overflow-x-auto`), causing the last "Execution" card to be cut off on most screen sizes.

## Solution
Change the pipeline layout from a horizontally scrolling row to a flexible grid that distributes cards evenly across the available width:

**File: `src/components/dca/CREArchitectureExplainer.tsx`**

- Replace `overflow-x-auto` with `flex-wrap` so cards wrap on smaller screens instead of scrolling
- Remove `flex-shrink-0` from individual cards so they can compress to fit
- Change `min-w-[130px]` to `flex-1 min-w-[110px]` so cards expand evenly to fill the row
- On desktop (where all 5 fit), they will distribute equally; on mobile they will wrap to a second row

This ensures all 5 steps (Cron Trigger, Strategy Eval, Price Feed, Dip Detection, Execution) are fully visible without horizontal scrolling.

