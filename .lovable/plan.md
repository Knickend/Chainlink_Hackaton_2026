

# Fix Header Controls Alignment - Sign Out Button Wrapping

## Problem

Even on full desktop view, the Sign out button wraps to a second line below the other header controls. The screenshot shows:
- First row: Cached indicator, refresh, USD/BTC/Gold/EUR/GBP selector, Theme toggle, Tour button
- Second row: Sign out button (alone)

## Root Cause

The controls div uses `flex-wrap` which allows items to wrap to new lines when space runs out. Even on wide screens, the combined width of all controls exceeds the available space:

| Element | Approximate Width |
|---------|------------------|
| PriceIndicator | ~120px |
| UnitSelector (5 currencies) | ~280px |
| ThemeToggle | ~36px |
| Tour button | ~70px |
| Sign out button | ~90px |
| **Total** | **~596px + gaps** |

With the logo and description taking the left side, there's not enough room for all controls in one line, so the last item (Sign out) wraps.

## Solution

Remove `flex-wrap` and instead use `flex-shrink-0` to prevent controls from shrinking, combined with allowing the header to scroll horizontally on very narrow screens OR reducing the width of some elements.

Better approach: Remove `flex-wrap` entirely so controls never wrap, and rely on the column layout on smaller screens (already handled by `lg:flex-row`).

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Remove `flex-wrap` from controls div, add `flex-shrink-0` |

## Technical Implementation

```tsx
{/* Right section: Controls - all on one line */}
<div className="flex items-center gap-3 flex-shrink-0">
  <PriceIndicator ... />
  <UnitSelector ... />
  <ThemeToggle />
  {hasCompletedTutorial && <Button>Tour</Button>}
  <Button>Sign in/out</Button>
</div>
```

Key changes:
1. Remove `flex-wrap` from the controls div (line 176)
2. Add `flex-shrink-0` to prevent the controls section from shrinking
3. This ensures all controls stay on one line when in row mode (`lg:flex-row`)
4. On smaller screens, the entire controls div will stack below the logo (due to `flex-col` default)

## Expected Outcome

```text
Desktop (lg and up):
+------------------------------------------------------------------+
| [Logo] [PRO] [Description]   [All controls on single line →→→→→] |
+------------------------------------------------------------------+

Tablet/Mobile (below lg):
+------------------------+
| [Logo] [PRO]           |
| [Description]          |
| [All controls in row]  |
+------------------------+
```

All controls will remain on a single line - no individual buttons will wrap to separate rows.

