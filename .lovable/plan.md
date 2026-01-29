
# Fix Header Alignment Issue

## Problem

The Sign in/Sign out button appears on a second row below the other header controls (Price indicator, Currency selector, Theme toggle, Tour button), creating a misaligned appearance.

## Root Cause

The current header layout has 3 flex children with `justify-between`:
1. Logo section (with PRO badge)
2. Description text (`<p>Track your assets...</p>`)
3. Controls section (with `flex-wrap`)

When the viewport width is tight, the `flex-wrap` on the controls div causes the Sign in button to wrap to a new line while other items stay on the first row.

## Solution

Restructure the header to:
1. Group the logo and description text together on the left side
2. Keep all controls together on the right side
3. Change wrapping behavior so the entire controls section moves as a unit when needed

## Updated Layout

```text
Current (buggy):
+----------------------------------------------------------+
| [Logo] [PRO]    [Description]    [Controls on one line]  |
|                                  [Sign in wrapped below] |
+----------------------------------------------------------+

Proposed (fixed):
+----------------------------------------------------------+
| [Logo] [PRO]                     [PriceIndicator] [...]  |
| [Description]                    [Theme] [Tour] [Sign in]|
+----------------------------------------------------------+

OR on wider screens:
+----------------------------------------------------------+
| [Logo] [PRO] [Description]   [All controls on one line]  |
+----------------------------------------------------------+
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Restructure header to group logo + description, align controls properly |

## Technical Implementation

```tsx
{/* Header */}
<motion.header
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8"
>
  {/* Left section: Logo + Description */}
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
    <div className="flex items-center gap-2">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
        <span className="gradient-text">In</span>
        <span className="text-foreground">Control</span>
      </h1>
      {isPro && <ProBadge />}
    </div>
    <p className="text-muted-foreground">
      Track your assets across all markets
    </p>
  </div>
  
  {/* Right section: Controls - all aligned in a row */}
  <div className="flex items-center gap-3 flex-wrap">
    <PriceIndicator ... />
    <UnitSelector ... />
    <ThemeToggle />
    {hasCompletedTutorial && <Button>Tour</Button>}
    <Button>Sign in/out</Button>
  </div>
</motion.header>
```

Key changes:
1. Wrap logo and description in a single parent `<div>`
2. Change responsive breakpoint from `sm:` to `lg:` for row layout (gives more space)
3. Remove `mt-1` from description text
4. Keep all controls together - they will wrap as a group if needed

## Expected Outcome

- On large screens: All controls appear on one line, aligned with logo
- On medium screens: Controls may wrap but will do so as logical groups
- Sign in/out button will always be inline with Tour, Theme toggle, etc.
- Clean, professional header alignment at all breakpoints
