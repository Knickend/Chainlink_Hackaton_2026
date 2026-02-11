
## Embed Rebalancer into Portfolio History Card

### Problem
The Portfolio Rebalancer currently lives as a separate section inside the InvestmentStrategyCard, adding visual clutter. The user wants to:
1. Move the Rebalancer into the Portfolio History Card to reduce card count
2. Add an "Edit" button on the Rebalancer to open rebalance settings

### Changes

**`src/components/PortfolioHistoryCard.tsx`**
- Accept new props: `rebalancer` data (driftData, tradeSuggestions, maxDrift, threshold, alerts, dismissAlert, shouldShow), `hasPreferences`, `formatValueSimple` (the non-decimal version), and a callback `onEditRebalanceSettings` to open the preferences dialog.
- Below the existing Portfolio History content (after the action buttons), render a collapsible "Portfolio Rebalancer" section using the existing `RebalanceCard` component when `rebalancer.shouldShow && hasPreferences` is true.
- Add a small Settings2 (gear) icon button in the RebalanceCard header that triggers `onEditRebalanceSettings`.

**`src/components/RebalanceCard.tsx`**
- Add an optional `onEdit` prop (callback).
- When provided, render a gear/settings button next to the dismiss button in the header that calls `onEdit` -- this opens the InvestmentPreferencesDialog for rebalance settings.

**`src/components/InvestmentStrategyCard.tsx`**
- Remove the RebalanceCard rendering from this component (lines 275-290). The rebalancer will no longer appear here.
- Keep the `useRebalancer` hook call but expose the rebalancer data via a new export or keep it internal (since it moves to PortfolioHistoryCard, the hook will be called there instead).

**`src/pages/Index.tsx`**
- Import `useRebalancer` and `InvestmentPreferencesDialog` (or just pass a callback).
- Call `useRebalancer(assets, preferences)` at the page level (or pass the necessary data down).
- Pass rebalancer data + an `onEditRebalanceSettings` callback to `PortfolioHistoryCard`.
- The edit callback will open the existing `InvestmentPreferencesDialog` focused on rebalance settings. Since the dialog is already managed in `InvestmentStrategyCard`, the simplest approach is to add a standalone state + dialog instance in `PortfolioHistoryCard` or pass the open/close controls down.

### Simpler Approach

To minimize prop-drilling, the cleanest path:

1. **Move `useRebalancer` call into `PortfolioHistoryCard`** -- it needs `assets` and `preferences` props.
2. **Add a local `InvestmentPreferencesDialog`** inside `PortfolioHistoryCard` triggered by the edit button, reusing the same dialog component.

### Revised File Changes

**`src/components/RebalanceCard.tsx`**
- Add optional `onEdit?: () => void` prop.
- Render a Settings2 icon button in the header when `onEdit` is provided.

**`src/components/PortfolioHistoryCard.tsx`**
- Add props: `assets`, `investmentPreferences`, `onSavePreferences`, `goals`, `goalAnalysis`.
- Call `useRebalancer(assets, preferences)` internally.
- Render `RebalanceCard` after the history content with `onEdit` wired to open a local `InvestmentPreferencesDialog`.
- Include the `InvestmentPreferencesDialog` in the component with a local `useState` for open/close.

**`src/components/InvestmentStrategyCard.tsx`**
- Remove the `useRebalancer` import and hook call.
- Remove the `RebalanceCard` import and rendering (lines 275-290).
- Remove `assets` from the props interface since it was only needed for the rebalancer.

**`src/pages/Index.tsx`**
- Pass `assets`, investment preferences data, and save callback to `PortfolioHistoryCard`.
- Remove `assets` prop from `InvestmentStrategyCard`.

### Technical Details

Props added to `PortfolioHistoryCard`:
```text
assets: Asset[]
investmentPreferences: InvestmentPreferences | null
onSavePreferences: (prefs) => Promise<void>
goals?: Goal[]
goalAnalysis?: GoalAnalysis
```

The RebalanceCard edit button will use `Settings2` icon matching the existing edit button pattern in InvestmentStrategyCard.
