
## Goal
Fix the **Real Estate, Equity & Misc.** category header total so it matches the user’s native input when appropriate (e.g., an asset entered as **€450,000** should show **€450,000** in the category total when the display unit is **EUR**), eliminating “forex drift” in the total.

## What’s happening (root cause)
- The **row value** for the real estate asset is now displayed correctly using the native fields (`quantity` + `symbol`) in `AssetCategoryCard.tsx`.
- But the **category header total** (top-right of the card) comes from `categoryTotals` in `src/hooks/usePortfolio.ts`.
- In `usePortfolio.ts`, only `banking` is treated as a “native-currency category” (sum `quantity` in native currency and convert smartly).
- `realestate` currently falls into the “non-banking” path, which sums `asset.value` (stored USD equivalent) and converts USD → display unit using the *current* conversion rate. That’s why the total drifts (e.g., €450,000 becomes ~€411,831 depending on rate changes).

## Implementation approach
Treat `realestate` exactly like `banking` in portfolio totals logic:
- For totals/net worth calculations:
  - Use `quantity` (native amount) + `symbol` (native currency) when available.
  - If the asset’s native currency equals the selected display unit (EUR), use the native amount directly (no conversion).
  - Otherwise convert one-way using the existing conversion helpers/rates (same behavior as banking).

## Files to update
### 1) `src/hooks/usePortfolio.ts` (main fix)
Update BOTH places where banking gets special handling:

1. **Net worth computation (`metrics.totalNetWorth`)**
   - Change condition from:
     - `if (asset.category === 'banking')`
   - To:
     - `if (asset.category === 'banking' || asset.category === 'realestate')`
   - Recommended robustness tweak:
     - Normalize currency before comparisons/lookup:
       - `const assetCurrency = (asset.symbol || 'USD').trim().toUpperCase();`

2. **Category totals (`categoryTotals`)**
   - Change condition from:
     - `if (category === 'banking')`
   - To:
     - `if (category === 'banking' || category === 'realestate')`
   - Keep the current logic that uses:
     - `nativeAmount = asset.quantity ?? asset.value`
     - Direct usage when `assetCurrency === displayUnit`
     - Otherwise `convertFromCurrency(nativeAmount, assetCurrency)`

Acceptance criteria after this change:
- Real estate card total equals **€450,000** when:
  - the asset is stored as `symbol="EUR"`, `quantity=450000`
  - and the display unit is `EUR`.

### 2) (Strongly recommended consistency fix) `src/components/AllocationChart.tsx`
This isn’t the cause of the real estate card total, but it is currently inconsistent with the new category structure and can display incorrect tooltip values:

- Add `realestate` to `COLORS` and `LABELS`.
- Update banking label from “Cash, Stablecoins & Real Estate” → “Cash & Stablecoins”
- Update tooltip formatting:
  - `categoryTotals` values are already in **display unit**, but the chart tooltip uses `formatValue()` (which assumes USD and converts again).
  - Change the chart prop to accept `formatDisplayUnitValue` (or a generic formatter) and use that in the tooltip.

### 3) `src/pages/Index.tsx` (only if AllocationChart prop changes)
- If we update `AllocationChart` to use `formatDisplayUnitValue`, update the call site to pass that function instead of `formatValue`.

## QA / How to test end-to-end
1. Set display unit to **EUR**.
2. Add a **Real Estate** asset with **€450,000**.
3. Verify:
   - Row shows **€450,000.00**
   - Card header total shows **€450,000.00** (no drift)
4. Switch display unit to **USD**:
   - Verify total changes appropriately using conversion (expected).
5. Check Net Worth card and Allocation chart still render and totals/percentages look correct.
6. Regression check:
   - Banking category totals still behave the same as before (no drift when display currency matches).

## Notes / Edge cases handled
- If a real estate asset is missing `quantity` or `symbol` (unexpected but possible for legacy data), we keep the existing fallback to use `asset.value` conversion so the UI doesn’t break.
