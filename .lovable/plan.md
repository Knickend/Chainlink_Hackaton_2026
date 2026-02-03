
## Goal
Make POL (Polygon) show its unit price (the “× €…/token” part) in the Crypto category card on `/app`.

## What’s happening (root cause)
- `AssetCategoryCard` computes the per-unit price via `getUnitPrice(asset, category, livePrices)`.
- `getUnitPrice` immediately returns `null` when `livePrices` is missing:
  - `if (!livePrices) return null;`
- In `src/pages/Index.tsx`, the dashboard category cards currently **do not pass** the `livePrices` prop to `AssetCategoryCard`, even though the live prices are fetched and available as `prices` from `useLivePrices(...)`.
- Result: the card still renders the two-line layout, but `unitPriceDisplay` is `null`, so you see only:
  - `71,781 POL` (left)
  - `€6,766.46` (right)
  - with no `× €0.XX` in between.

## Fix (minimal, targeted)
### 1) Pass live prices into each category card
**File:** `src/pages/Index.tsx`  
**Change:** In the `<AssetCategoryCard .../>` map (around lines ~527+), add:
- `livePrices={prices}`

This enables `getUnitPrice` to resolve:
- BTC/ETH/LINK from the dedicated fields on `prices`
- POL (and other additional crypto) from `prices.crypto['POL']`

### 2) (Recommended) Also pass all assets for consistent edit/buy/sell UX
**File:** `src/pages/Index.tsx`  
**Change:** Add:
- `allAssets={assets}`

This keeps the edit/buy/sell dialogs consistent (fund-flow selector, linked sources/destinations) and avoids “undefined” asset lists inside the edit dialogs opened from the category cards.

## Verification checklist (after implementation)
1. Go to `/app` → Cryptocurrency card → confirm POL row shows:
   - `71,781 POL × €<unitPrice> = €6,766.46` (unit price visible)
2. Confirm other market-priced categories also show unit prices:
   - Stocks (e.g., AAPL): `<shares> AAPL × €<unitPrice> = €<total>`
   - Commodities: `<qty> oz × €<price>/oz = €<total>`
3. Switch display unit (EUR ↔ USD) and confirm the unit price and total update correctly.

## Files to change
- `src/pages/Index.tsx` (add `livePrices={prices}` and `allAssets={assets}` to `AssetCategoryCard`)

## Why this should solve POL specifically
POL’s price is stored in the `prices.crypto` map (populated by the additional-crypto fetch). The UI currently can’t read it because it never receives `livePrices`. Passing `prices` into the card unblocks the lookup and makes the `× price` portion render.
