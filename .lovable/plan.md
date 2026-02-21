

# Fix: Apply New Default Layout Order

## Problem

The default layout code (`generateDefaultLayout()`) has the correct order, but your browser is loading a **previously saved layout** from the database. Since the layout was saved before the reorder, it still shows the old card positions (Rebalancer above P&L, Asset Categories at the bottom).

## Solution

Add a **layout version** check so that when the default layout changes, existing saved layouts that are outdated get replaced with the new defaults automatically.

### Changes

**`src/hooks/useDashboardLayout.ts`**:
1. Add a `LAYOUT_VERSION` constant (e.g., `2`) at the top of the file
2. Update the `LayoutConfig` interface to include an optional `version` field
3. In the load function: when the saved config has no `version` or a version lower than `LAYOUT_VERSION`, discard it and use the new defaults instead
4. In the save function: always include `version: LAYOUT_VERSION` in the saved config

This ensures:
- Existing users automatically get the corrected layout order
- Future layout changes can bump the version again
- Users who customize after the update keep their new preferences

### No other file changes needed
The `generateDefaultLayout()` function and the `cardRenderers` in `Index.tsx` are already correct. This is purely a data migration issue with stale saved layouts.

## Technical Detail

```text
LayoutConfig {
  layouts: ResponsiveLayouts;
  hiddenCards: string[];
  version?: number;          // <-- new field
}

LAYOUT_VERSION = 2;          // bump whenever defaults change

// On load:
if (!config.version || config.version < LAYOUT_VERSION) {
  // Ignore saved layout, use generateDefaultLayout()
}
```

