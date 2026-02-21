
# Update DCA Button to Show "DCA" Text

## Overview
Replace the icon-only DCA button in the top navigation with a button that displays the text "DCA" for better clarity.

## Change

**File: `src/pages/Index.tsx` (lines 275-283)**

Change the button from `size="icon"` with just a `Repeat` icon to a standard-sized button displaying "DCA" text alongside the icon:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => navigate('/dca')}
  className="rounded-full"
  title="DCA Strategies"
>
  <Repeat className="w-4 h-4" />
  DCA
</Button>
```

This replaces the ambiguous arrows icon with a clearly labeled "DCA" button, matching the style of other nav buttons like the Tour button which also shows text on larger screens.
