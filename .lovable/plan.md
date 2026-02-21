

# Customizable Dashboard Layout

## Overview

Transform the dashboard from a fixed layout to a fully customizable grid where users can drag cards to rearrange them, resize cards, and show/hide cards. Layout preferences are persisted per user in the database.

## Approach

Use the `react-grid-layout` library (with its responsive wrapper) to enable drag-and-drop repositioning and resizing of dashboard cards. A settings panel lets users toggle card visibility. Layout is saved to the database so it persists across sessions.

## New Dependency

- `react-grid-layout` -- mature, widely-used library for draggable/resizable grid layouts

## Database

Create a `dashboard_layouts` table to persist each user's card arrangement:

```text
dashboard_layouts
-----------------
id             uuid (PK, default gen_random_uuid())
user_id        uuid (NOT NULL, unique)
layout_config  jsonb (NOT NULL) -- stores grid positions, sizes, visibility
created_at     timestamptz
updated_at     timestamptz
```

RLS: users can only read/write their own row.

## Dashboard Cards Registry

Each dashboard section becomes a named "card" with default grid properties:

| Card ID              | Default Width | Default Height | Min W | Min H |
|----------------------|---------------|----------------|-------|-------|
| net-worth-trend      | 4             | 3              | 3     | 2     |
| allocation-chart     | 4             | 3              | 3     | 2     |
| portfolio-history    | 4             | 4              | 3     | 3     |
| pnl-overview         | 12            | 3              | 6     | 2     |
| goals-overview       | 12            | 3              | 6     | 2     |
| investment-strategy  | 12            | 3              | 6     | 2     |
| income-card          | 4             | 4              | 3     | 3     |
| expense-card         | 4             | 4              | 3     | 3     |
| debt-card            | 4             | 4              | 3     | 3     |
| debt-payoff          | 12            | 3              | 6     | 2     |
| rebalancer           | 4             | 4              | 3     | 3     |

The Key Metrics row (5 stat cards at the top) stays fixed -- it's not part of the customizable grid since it serves as a persistent summary bar.

## New Files

### `src/hooks/useDashboardLayout.ts`
- Loads/saves layout from `dashboard_layouts` table
- Provides default layout if none saved
- Debounced save on layout change
- Manages card visibility state

### `src/components/DashboardGrid.tsx`
- Wraps `react-grid-layout`'s `ResponsiveGridLayout`
- Renders each card by ID from a registry map
- Adds drag handle, resize handle, and a close (X) button to each card
- Shows a lock/unlock toggle to enter/exit edit mode (prevents accidental drags)

### `src/components/DashboardCardWrapper.tsx`
- Wrapper around each card providing:
  - Drag handle bar (visible in edit mode)
  - Close button (X icon, top-right, edit mode only)
  - Consistent card styling

### `src/components/DashboardSettingsPanel.tsx`
- Slide-out panel or popover listing all available cards
- Toggle switches to show/hide each card
- "Reset to Default" button to restore original layout

## Modified Files

### `src/pages/Index.tsx`
- Replace the manual grid sections (charts row, P&L, goals, strategy, income/expense/debt, debt payoff) with the new `DashboardGrid` component
- Keep the Key Metrics row fixed above the grid
- Add an "Edit Dashboard" button in the header area
- Pass all required props to `DashboardGrid`

## User Experience

1. **Normal mode**: Cards display in the user's saved layout. No drag handles visible. Cards look clean.
2. **Edit mode** (toggled via a button in the header):
   - Cards show drag handles at the top
   - Cards become draggable and resizable
   - A small X button appears on each card to hide it
   - A settings panel button appears to re-add hidden cards
3. **Persistence**: Layout auto-saves (debounced) whenever the user rearranges or resizes cards
4. **Reset**: A "Reset Layout" option in the settings panel restores defaults

## Technical Details

- `react-grid-layout` uses a 12-column grid system
- Responsive breakpoints: lg (1200px), md (996px), sm (768px), xs (480px)
- Each breakpoint can have its own layout, but we start with lg and let smaller ones auto-compact
- Cards that are hidden are filtered out of the grid items
- The layout JSON stored in the DB includes: `{ layouts: {...}, hiddenCards: string[] }`
- Demo mode users get default layout with no persistence
- Card content components remain unchanged -- only their container/positioning changes

