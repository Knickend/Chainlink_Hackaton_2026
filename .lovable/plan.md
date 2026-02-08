

## Save Chainlink Frontend Integration Plan

Append the Chainlink frontend integration plan to the existing `.lovable/plan.md` file, preserving the current Test Price Feed API plan that's already there.

---

## What Changes

**File:** `.lovable/plan.md`

Append a new section after the existing content with the full Chainlink frontend integration plan covering:

- Adding a 4th "Chainlink" tab to the Exchange Rates dialog
- Expected edge function response format (the API contract to code against)
- UI layout: table with Pair, Network, Answer, Deviation, Heartbeat columns
- Lazy-loading strategy (fetch only when tab is opened)
- Files to modify: `ExchangeRatesDialog.tsx` and optionally `useLivePrices.ts`
- Dependency on backend: the `fetch-chainlink-feeds` edge function being built separately

This keeps both plans documented in one place for future reference.

