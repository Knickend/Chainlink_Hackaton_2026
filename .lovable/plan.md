

## Convert UnitSelector to Compact Dropdown

### The Problem
The current UnitSelector displays 5 horizontal buttons (USD, BTC, Gold, EUR, GBP), taking up approximately 250-300px of width. This contributes to the header overlap issue because the controls section is too wide.

### Solution
Replace the horizontal button group with a compact dropdown that:
- Shows only the selected currency icon and label (approximately 80px width)
- Expands to show all currency options when clicked
- Reduces the controls section width by approximately 200px

### File to Modify

| File | Change |
|------|--------|
| `src/components/UnitSelector.tsx` | Convert from horizontal button group to dropdown |

### Implementation Details

**Current width**: ~250-300px (5 buttons side by side)
**New width**: ~80px (single dropdown trigger)

The new component will use the existing `Select` component from shadcn/ui to create a dropdown with:

1. A trigger button showing the selected currency's icon and label
2. A dropdown content with all 5 currency options
3. Each option displays the currency icon and label
4. Maintains the same `data-tutorial` attribute for the tutorial system

```text
Current Layout:
+------------------------------------------------------+
| [$USD] [₿BTC] [🥇Gold] [€EUR] [£GBP]                |
+------------------------------------------------------+

New Layout:
+-------------+
| $ USD    ▼  |
+-------------+
     |
     v (when clicked)
+-------------+
| $ USD    ✓  |
| ₿ BTC       |
| 🥇 Gold     |
| € EUR       |
| £ GBP       |
+-------------+
```

### Technical Changes

1. Import the `Select` components from `@/components/ui/select`
2. Replace the flex button group with a `Select` component
3. Map the `units` array to `SelectItem` components
4. Style the trigger to be compact but readable
5. Keep the same interface (`value`, `onChange`) for seamless integration

This change alone should free up enough horizontal space to prevent the header overlap, potentially allowing the tagline to be visible at smaller breakpoints again.

