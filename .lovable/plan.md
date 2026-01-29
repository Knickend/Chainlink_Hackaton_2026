

# Redesign Header Section

## The Issue

The description text "Track your assets across all markets" is overlapping with the UnitSelector (currency buttons) because:
1. Both sections are trying to occupy the same horizontal space
2. The right section with all controls (UnitSelector, ThemeToggle, Tour, Security, Sign out) takes up significant width
3. There's no proper constraint to prevent overlap on medium-to-large screens

## Solution

Restructure the header to cleanly separate the logo/branding from the controls, ensuring no overlap occurs. The description text will only show when there's genuinely enough room.

## File to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Restructure header layout with proper flex constraints |

## Implementation Details

### Updated Header Structure

```tsx
<motion.header
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8"
>
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
  
  {/* Right section: Controls - all aligned in a row */}
  <div className="flex items-center gap-3 flex-shrink-0">
    {/* Controls here */}
  </div>
</motion.header>
```

### Key Changes

1. **Add `flex-shrink-0`** to the right controls section - prevents the controls from shrinking and causing overlap
2. **Keep `min-w-0`** on the left section - allows the left section to shrink gracefully when needed
3. **Keep `whitespace-nowrap hidden md:block`** on description - ensures it only shows when there's room and doesn't wrap awkwardly

The root issue is that both sections need `flex-shrink-0` to prevent shrinking, but when both refuse to shrink, they overlap. The fix is to let the left section (with description) shrink by removing content at smaller breakpoints while the controls stay fixed.

### Responsive Behavior

- **Large screens (lg+)**: Logo, PRO badge, description, and all controls visible in one row
- **Medium screens (md)**: Description hidden to make room for controls
- **Small screens (sm)**: Header wraps to two rows - logo on top, controls below

This ensures the header remains clean and readable at all viewport sizes without any overlapping elements.

