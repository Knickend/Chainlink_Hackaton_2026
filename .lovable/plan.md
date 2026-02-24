

# Fix: Break the Infinite Re-render Loop in Dashboard Grid

## Root Cause Analysis

The `react-grid-layout` v2 `ResponsiveGridLayout` component internally compacts the layout on every render and fires `onLayoutChange` with the compacted result. The compacted layout includes additional properties (like `moved`, `static: false`) that differ from the input, meaning a simple `JSON.stringify` comparison will never match. This creates the loop:

```text
layouts prop changes
  -> ResponsiveGridLayout re-renders
  -> internally compacts layout (adds properties)
  -> fires onLayoutChange with compacted layout
  -> onLayoutChange calls setLayouts (different from prev due to added props)
  -> layouts state changes
  -> layouts prop changes (back to step 1)
  -> INFINITE LOOP
```

## Solution

Stop using `onLayoutChange` to update React state entirely. Instead:

1. Store the latest layout in a **ref only** (no `setLayouts` call) from `onLayoutChange`
2. Only persist to the database via the debounced save (using the ref value)
3. Use `onDragStop` and `onResizeStop` callbacks to trigger the actual save, since those only fire on user interaction (not on internal compaction)
4. Remove `setLayouts` from `onLayoutChange` completely -- the grid manages its own internal layout state; we only need to capture it for persistence

## Changes

### File 1: `src/hooks/useDashboardLayout.ts`

- Change `onLayoutChange` to only update a ref (no `setLayouts`)
- Add `onDragStop` and `onResizeStop` callbacks that read from the ref and persist
- Export these new callbacks

```
onLayoutChange:
  - Before: calls setLayouts(allLayouts) + saveLayout()
  - After: only updates layoutsRef.current (NO setState)

New onDragStop / onResizeStop:
  - Read layoutsRef.current
  - Call setLayouts + saveLayout (only on actual user interaction)
```

### File 2: `src/components/DashboardGrid.tsx`

- Pass `onDragStop` and `onResizeStop` to `ResponsiveGridLayout`
- Keep `onLayoutChange` connected but it now only updates the ref (no re-render)

## Technical Details

**`src/hooks/useDashboardLayout.ts`** changes:

The `onLayoutChange` callback becomes:
```typescript
const onLayoutChange = useCallback(
  (_currentLayout: readonly LayoutItem[], allLayouts: ResponsiveLayouts) => {
    // Only update ref, never setState - avoids the compaction feedback loop
    layoutsRef.current = allLayouts;
  },
  []
);
```

New callbacks for user-initiated changes:
```typescript
const onUserLayoutChange = useCallback(() => {
  const newLayouts = layoutsRef.current;
  setLayouts(newLayouts);
  if (user) saveLayout(newLayouts, hiddenCards);
}, [user, hiddenCards, saveLayout]);
```

Return `onUserLayoutChange` for use as `onDragStop` and `onResizeStop`.

**`src/components/DashboardGrid.tsx`** changes:

Add the new props and wire them up:
```typescript
interface DashboardGridProps {
  // ... existing props
  onUserLayoutChange: () => void; // NEW
}

<ResponsiveGridLayout
  // ... existing props
  onDragStop={() => onUserLayoutChange()}
  onResizeStop={() => onUserLayoutChange()}
>
```

**`src/pages/Index.tsx`** changes:

Pass the new `onUserLayoutChange` prop through to `DashboardGrid`.

## Why This Works

- `onLayoutChange` fires on every compaction but no longer triggers a React state update, so no re-render loop
- `onDragStop` / `onResizeStop` only fire on actual user interaction (drag or resize), which is the only time we need to persist
- The grid component manages its own internal layout state perfectly fine without us mirroring it in React state
- Initial layout from props is still respected (the grid reads `layouts` prop on mount)
- Saved layouts from the database still load correctly on mount via `setLayouts` in the `useEffect`

