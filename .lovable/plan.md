

# Fix Header Text Alignment

## The Issue

The description text "Track your assets across all markets" is breaking vertically (each word on its own line) instead of staying horizontally aligned with the logo. This happens because the flex container doesn't properly constrain the text wrapping.

## Solution

Update the header's left section to properly align the description text and prevent awkward word-by-word breaking.

## File to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Fix header layout to keep description text aligned horizontally |

## Implementation Details

**Current code (lines 162-174):**
```tsx
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
```

**Updated code:**
```tsx
{/* Left section: Logo + Description */}
<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
  <div className="flex items-center gap-2 flex-shrink-0">
    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
      <span className="gradient-text">In</span>
      <span className="text-foreground">Control</span>
    </h1>
    {isPro && <ProBadge />}
  </div>
  <p className="text-muted-foreground whitespace-nowrap hidden md:block">
    Track your assets across all markets
  </p>
</div>
```

## Changes Explained

1. **Add `min-w-0`** to the parent container - prevents flex children from overflowing
2. **Add `flex-shrink-0`** to the logo container - ensures the logo never shrinks
3. **Add `whitespace-nowrap`** to the description - prevents the text from breaking mid-sentence
4. **Add `hidden md:block`** to the description - hides it on smaller screens where there isn't enough horizontal space, showing it only on medium screens and up

This ensures the header stays cleanly aligned with the logo and controls on opposite sides, and the description only appears when there's adequate screen width to display it properly.

