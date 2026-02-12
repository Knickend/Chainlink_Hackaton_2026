

## Align Rebalancer Categories with Asset Categories

### Problem
The Portfolio Rebalancer uses mismatched category labels compared to the rest of the app:

| Asset Category | Current Rebalancer Label | Correct Label |
|---|---|---|
| banking | Emergency Fund | Cash & Stablecoins |
| realestate | *(missing)* | Real Estate, Equity & Misc. |
| crypto | Crypto | Cryptocurrency |
| stocks | Stocks/ETFs | Stocks, Bonds & ETFs |
| commodities | Commodities | Commodities |

The `realestate` category is also completely excluded from drift calculations.

### Solution

Update the `CATEGORY_MAP` and `CATEGORY_COLORS` in `src/hooks/useRebalancer.ts` to match the canonical labels used throughout the app (AllocationChart, Add Asset dialog, etc.):

### Technical Details

**`src/hooks/useRebalancer.ts`** -- update constants:

```text
CATEGORY_MAP:
  banking    -> label: "Cash & Stablecoins",        prefKey: emergency_fund_target
  realestate -> label: "Real Estate, Equity & Misc.", prefKey: (see note below)
  crypto     -> label: "Cryptocurrency",             prefKey: crypto_allocation
  stocks     -> label: "Stocks, Bonds & ETFs",       prefKey: stocks_allocation
  commodities-> label: "Commodities",                prefKey: commodities_allocation

CATEGORY_COLORS:
  "Cash & Stablecoins"          -> #3B82F6
  "Real Estate, Equity & Misc." -> #8B5CF6
  "Cryptocurrency"              -> #F7931A (orange, matching AllocationChart)
  "Stocks, Bonds & ETFs"        -> #22C55E (green, matching AllocationChart)
  "Commodities"                 -> #EAB308 (yellow, matching AllocationChart)
```

**Note on Real Estate**: The current investment preferences don't have a dedicated `realestate_allocation` field. Real estate assets will be included in the total portfolio value calculation (they already are), but without a target allocation they won't generate drift entries. This is correct behavior -- if there's no target for a category, the rebalancer simply skips it. The `realestate` entry in CATEGORY_MAP will be added but will only produce a drift row if a matching preference key exists in the future.

Alternatively, real estate assets can remain unmapped (contributing to total value but not tracked for drift), which is arguably more correct since there's no allocation slider for real estate. The labels and colors for the four mapped categories will still be updated to match.

**`src/components/RebalanceCard.tsx`** -- no changes needed (it reads labels from the drift data).

